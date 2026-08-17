import { createHash, randomUUID } from "node:crypto";
import { promises as fs, createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { finished } from "node:stream/promises";
import { Transform, Readable } from "node:stream";
import { parse } from "csv-parse";
import unzipper from "unzipper";
import {
  appendAuditTrail,
  createSourceImportRun,
  getSourceImportRunByIdempotencyKey,
  insertCguTransferLines,
  listApprovedPddeinfoCnpjAssociations,
  updateSourceImportRun,
  type CguTransferLineInput,
} from "../db";
import { storagePut } from "../storage";
import { parseBrazilianCurrencyToCents } from "./money";

export const CGU_TRANSFERENCIAS_BASE_URL = "https://portaldatransparencia.gov.br/download-de-dados/transferencias";
export const CGU_SOURCE = "CGU_TRANSFERENCIAS" as const;
export const CGU_REQUIRED_HEADERS = ["ANO MES", "CODIGO FAVORECIDO", "CODIGO ORGAO SIAFI", "ACAO", "VALOR TRANSFERIDO"] as const;
export const CGU_PARSER_VERSION = "1.1.0";
export const CGU_ARCHIVE_MAX_COMPRESSED_BYTES = 32 * 1024 * 1024;
export const CGU_ARCHIVE_MAX_UNCOMPRESSED_BYTES = 256 * 1024 * 1024;
export const CGU_ARCHIVE_CONTENT_TYPES = ["application/zip", "application/x-zip-compressed"] as const;

type FetchLike = typeof fetch;

export type CguTransferCollection = {
  referencePeriod: string;
  sourceUrl: string;
  sourceHashSha256: string;
  totalRows: number;
  matchedLines: CguTransferLineInput[];
  matchedUex: number;
  unlinkedRows: number;
  archive: {
    tempPath: string;
    byteLength: number;
    contentType: string;
  };
};

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, " ").trim().toUpperCase();
}

function normalizeCnpj(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeContentType(value: string | null | undefined) {
  return value?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

/** Rejeita resposta cujo tipo ou tamanho anunciado não corresponde ao artefato mensal público esperado. */
export function validateCguArchiveResponse(contentType: string | null | undefined, contentLength: string | null | undefined) {
  const normalizedType = normalizeContentType(contentType);
  if (!CGU_ARCHIVE_CONTENT_TYPES.includes(normalizedType as (typeof CGU_ARCHIVE_CONTENT_TYPES)[number])) {
    throw new Error(`A fonte CGU retornou tipo de arquivo não aceito: ${normalizedType || "não informado"}.`);
  }
  if (contentLength === null || contentLength === undefined || contentLength.trim() === "") return;
  if (!/^\d+$/.test(contentLength.trim())) throw new Error("A fonte CGU retornou Content-Length inválido.");
  if (Number(contentLength) > CGU_ARCHIVE_MAX_COMPRESSED_BYTES) {
    throw new Error(`O arquivo CGU anunciado excede o limite comprimido de ${CGU_ARCHIVE_MAX_COMPRESSED_BYTES} bytes.`);
  }
}

/** Verifica a assinatura ZIP antes de encaminhar bytes ao descompactador. */
export function assertCguZipSignature(prefix: Uint8Array) {
  if (prefix.length < 4 || prefix[0] !== 0x50 || prefix[1] !== 0x4b || (prefix[2] !== 0x03 && prefix[2] !== 0x05 && prefix[2] !== 0x07) || (prefix[3] !== 0x04 && prefix[3] !== 0x06 && prefix[3] !== 0x08)) {
    throw new Error("O artefato CGU não possui assinatura ZIP válida.");
  }
}

/** Aceita exclusivamente um arquivo CSV regular, sem diretórios ou entradas laterais no ZIP público. */
export function validateCguZipEntry(entry: { path: string; type: string; vars?: { uncompressedSize?: number } }) {
  if (entry.type !== "File" || !/^\d{6}_Transferencias\.csv$/i.test(entry.path)) {
    throw new Error(`O ZIP CGU contém entrada não permitida: ${entry.path}.`);
  }
  const size = entry.vars?.uncompressedSize;
  if (!Number.isSafeInteger(size) || size === undefined || size < 0 || size > CGU_ARCHIVE_MAX_UNCOMPRESSED_BYTES) {
    throw new Error(`O CSV CGU possui tamanho descompactado inválido ou excede ${CGU_ARCHIVE_MAX_UNCOMPRESSED_BYTES} bytes.`);
  }
}

export function buildCguArtifactStoragePath(referencePeriod: string, sourceHashSha256: string) {
  validateReferencePeriod(referencePeriod);
  if (!/^[a-f0-9]{64}$/i.test(sourceHashSha256)) throw new Error("O hash SHA-256 do artefato CGU é inválido.");
  return `pdde/cgu-transferencias/${referencePeriod}/${sourceHashSha256.toLowerCase()}.zip`;
}

/** Cria um parser incremental para o CSV Latin-1 da CGU sem pressupor que uma linha física corresponde a um registro lógico. */
export function createCguCsvParser(input: NodeJS.ReadableStream) {
  return input.pipe(parse({
    bom: true,
    delimiter: ";",
    quote: '"',
    escape: '"',
    skip_empty_lines: true,
    relax_column_count: false,
  }));
}

function validateReferencePeriod(referencePeriod: string) {
  if (!/^202[56]-(0[1-9]|1[0-2])$/.test(referencePeriod)) {
    throw new Error("A fonte CGU aceita somente referências mensais de 2025 ou 2026 no formato AAAA-MM.");
  }
}

function buildCguSourceUrl(referencePeriod: string) {
  validateReferencePeriod(referencePeriod);
  return `${CGU_TRANSFERENCIAS_BASE_URL}/${referencePeriod.replace("-", "")}`;
}

export function buildCguIdempotencyKey(referencePeriod: string, sourceHashSha256: string) {
  validateReferencePeriod(referencePeriod);
  if (!/^[a-f0-9]{64}$/i.test(sourceHashSha256)) throw new Error("O hash SHA-256 do artefato CGU é inválido.");
  return `${CGU_SOURCE}:${referencePeriod}:${sourceHashSha256.toLowerCase()}`;
}

export function currentAndPreviousReferencePeriods(now = new Date()) {
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const toPeriod = (value: Date) => `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
  return [toPeriod(current), toPeriod(previous)] as const;
}

export function fingerprintCguTransfer(values: Record<string, string>) {
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
}

export type CguRowSelection = { kind: "ignored" | "unlinked" } | { kind: "matched"; line: CguTransferLineInput };

/** Aplica o filtro institucional CGU e só associa uma linha quando seu CNPJ já pertence à referência PDDEInfo aprovada. */
export function selectCguTransferRow(
  referencePeriod: string,
  headerIndex: ReadonlyMap<string, number>,
  fields: string[],
  cnpjToInep: ReadonlyMap<string, string>,
): CguRowSelection {
  const value = (header: string) => fields[headerIndex.get(header) ?? -1]?.trim() ?? "";
  if (value("CODIGO ORGAO SIAFI") !== "26298" || value("ACAO") !== "0515") return { kind: "ignored" };
  const cnpj = normalizeCnpj(value("CODIGO FAVORECIDO"));
  const inep = cnpjToInep.get(cnpj);
  if (!inep) return { kind: "unlinked" };
  const fingerprintFields = {
    referencePeriod,
    sourceMonth: value("ANO MES"),
    cnpj,
    beneficiaryName: value("NOME FAVORECIDO"),
    siafiOrgCode: value("CODIGO ORGAO SIAFI"),
    actionCode: value("ACAO"),
    amount: value("VALOR TRANSFERIDO"),
    raw: fields.join("\u001F"),
  };
  return {
    kind: "matched",
    line: {
      importRunId: "",
      inep,
      cnpj,
      beneficiaryName: value("NOME FAVORECIDO") || "Não informado pela fonte CGU",
      referenceMonth: referencePeriod,
      siafiOrgCode: value("CODIGO ORGAO SIAFI"),
      actionCode: value("ACAO"),
      amountCents: parseBrazilianCurrencyToCents(value("VALOR TRANSFERIDO")),
      sourceRecordFingerprint: fingerprintCguTransfer(fingerprintFields),
    },
  };
}

/**
 * Lê o CSV descompactado diretamente do ZIP, limita os bytes comprimidos e descompactados
 * e espelha o ZIP em arquivo temporário para retenção imutável após a validação de idempotência.
 */
export async function collectCguTransfers(
  referencePeriod: string,
  cnpjToInep: ReadonlyMap<string, string>,
  fetcher: FetchLike = fetch,
): Promise<CguTransferCollection> {
  const sourceUrl = buildCguSourceUrl(referencePeriod);
  const response = await fetcher(sourceUrl, { headers: { Accept: "application/zip" } });
  if (!response.ok || !response.body) throw new Error(`A fonte CGU não retornou um arquivo utilizável (${response.status}).`);
  validateCguArchiveResponse(response.headers.get("content-type"), response.headers.get("content-length"));

  const archiveHash = createHash("sha256");
  const archiveState = { byteLength: 0, prefix: Buffer.alloc(0) };
  const archiveGuard = new Transform({
    transform(chunk, _encoding, callback) {
      const bytes = Buffer.from(chunk);
      archiveState.byteLength += bytes.byteLength;
      if (archiveState.byteLength > CGU_ARCHIVE_MAX_COMPRESSED_BYTES) {
        callback(new Error(`O arquivo CGU excede o limite comprimido de ${CGU_ARCHIVE_MAX_COMPRESSED_BYTES} bytes.`));
        return;
      }
      archiveState.prefix = Buffer.concat([archiveState.prefix, bytes]).subarray(0, 4);
      try {
        if (archiveState.prefix.length === 4) assertCguZipSignature(archiveState.prefix);
        archiveHash.update(bytes);
        callback(null, bytes);
      } catch (error) {
        callback(error as Error);
      }
    },
    flush(callback) {
      try {
        assertCguZipSignature(archiveState.prefix);
        callback();
      } catch (error) {
        callback(error as Error);
      }
    },
  });
  const archiveTempPath = join(tmpdir(), `pdde-cgu-${referencePeriod}-${randomUUID()}.zip`);
  const archiveWriter = createWriteStream(archiveTempPath, { flags: "wx" });
  const archiveStream = Readable.fromWeb(response.body as never).pipe(archiveGuard);
  archiveStream.pipe(archiveWriter);
  const entries = archiveStream.pipe(unzipper.Parse({ forceStream: true }));

  let headerIndex: Map<string, number> | null = null;
  let totalRows = 0;
  const matchedLines: CguTransferLineInput[] = [];
  let unlinkedRows = 0;
  let csvEntries = 0;

  try {
    for await (const entry of entries) {
      validateCguZipEntry(entry as { path: string; type: string; vars?: { uncompressedSize?: number } });
      csvEntries += 1;
      if (csvEntries > 1) throw new Error("O ZIP CGU contém mais de um CSV de transferências.");
      let uncompressedBytes = 0;
      const uncompressedGuard = new Transform({
        transform(chunk, _encoding, callback) {
          uncompressedBytes += Buffer.byteLength(chunk);
          if (uncompressedBytes > CGU_ARCHIVE_MAX_UNCOMPRESSED_BYTES) {
            callback(new Error(`O CSV CGU excede o limite descompactado de ${CGU_ARCHIVE_MAX_UNCOMPRESSED_BYTES} bytes.`));
            return;
          }
          callback(null, chunk);
        },
      });
      const csvStream = (entry as NodeJS.ReadableStream).pipe(uncompressedGuard);
      csvStream.setEncoding("latin1");
      const records = createCguCsvParser(csvStream);
      for await (const rawRecord of records) {
        const fields = (rawRecord as unknown[]).map(value => String(value));
        if (!headerIndex) {
          headerIndex = new Map(fields.map((header, index) => [normalizeHeader(header), index]));
          const missing = CGU_REQUIRED_HEADERS.filter(header => !headerIndex!.has(header));
          if (missing.length > 0) throw new Error(`O arquivo CGU não contém os cabeçalhos obrigatórios: ${missing.join(", ")}.`);
          continue;
        }
        totalRows += 1;
        const selection = selectCguTransferRow(referencePeriod, headerIndex, fields, cnpjToInep);
        if (selection.kind === "matched") {
          matchedLines.push(selection.line);
        } else if (selection.kind === "unlinked") {
          unlinkedRows += 1;
        }
      }
    }
    await finished(archiveWriter);
    if (csvEntries !== 1 || !headerIndex) throw new Error("O arquivo ZIP CGU não contém exatamente um CSV de transferências legível.");
    const sourceHashSha256 = archiveHash.digest("hex");
    return {
      referencePeriod,
      sourceUrl,
      sourceHashSha256,
      totalRows,
      matchedLines,
      matchedUex: new Set(matchedLines.map(line => line.inep)).size,
      unlinkedRows,
      archive: {
        tempPath: archiveTempPath,
        byteLength: archiveState.byteLength,
        contentType: normalizeContentType(response.headers.get("content-type")),
      },
    };
  } catch (error) {
    archiveStream.destroy();
    archiveWriter.destroy();
    await fs.unlink(archiveTempPath).catch(() => undefined);
    throw error;
  }
}

export type CguImportResult = {
  outcome: "completed" | "skipped";
  importRunId: string;
  referencePeriod: string;
  sourceHashSha256: string;
  totalRows: number;
  matchedLines: number;
  matchedUex: number;
  unlinkedRows: number;
};

/** Importa transferência CGU como evidência complementar, sem qualquer mutação de conta, parcela ou pagamento PDDEInfo. */
export async function importCguTransfers(referencePeriod: string, fetcher: FetchLike = fetch): Promise<CguImportResult> {
  const associations = await listApprovedPddeinfoCnpjAssociations();
  const collection = await collectCguTransfers(referencePeriod, associations.cnpjToInep, fetcher);
  try {
    const idempotencyKey = buildCguIdempotencyKey(referencePeriod, collection.sourceHashSha256);
    const existing = await getSourceImportRunByIdempotencyKey(idempotencyKey);
    if (existing) {
      return {
        outcome: "skipped",
        importRunId: existing.id,
        referencePeriod,
        sourceHashSha256: collection.sourceHashSha256,
        totalRows: collection.totalRows,
        matchedLines: collection.matchedLines.length,
        matchedUex: collection.matchedUex,
        unlinkedRows: collection.unlinkedRows,
      };
    }

    const artifactStorage = await storagePut(
      buildCguArtifactStoragePath(referencePeriod, collection.sourceHashSha256),
      await fs.readFile(collection.archive.tempPath),
      collection.archive.contentType,
    );
    const importRunId = randomUUID();
    const persistedRun = await createSourceImportRun({
      id: importRunId,
      source: CGU_SOURCE,
      referencePeriod,
      status: "running",
      idempotencyKey,
      sourceUrl: collection.sourceUrl,
      sourceHashSha256: collection.sourceHashSha256,
      parentPddeinfoRunId: associations.referenceRunId,
      totalRows: collection.totalRows,
      matchedUex: collection.matchedUex,
      latestSourceDate: null,
      cursorJson: {
        parserVersion: CGU_PARSER_VERSION,
        artifact: {
          sourceUrl: collection.sourceUrl,
          sha256: collection.sourceHashSha256,
          contentType: collection.archive.contentType,
          byteLength: collection.archive.byteLength,
          storageKey: artifactStorage.key,
          storageUrl: artifactStorage.url,
        },
        matchedLines: collection.matchedLines.length,
        unlinkedRows: collection.unlinkedRows,
        conflictingCnpjsExcluded: associations.conflictingCnpjs.length,
        limitation: "Transferência CGU não confirma crédito bancário, conta, parcela ou estado de pagamento PDDEInfo.",
      },
      startedAt: new Date(),
    });
    if (!persistedRun) throw new Error("A execução de importação CGU não pôde ser persistida.");
    if (persistedRun.id !== importRunId) {
      return {
        outcome: "skipped",
        importRunId: persistedRun.id,
        referencePeriod,
        sourceHashSha256: collection.sourceHashSha256,
        totalRows: collection.totalRows,
        matchedLines: collection.matchedLines.length,
        matchedUex: collection.matchedUex,
        unlinkedRows: collection.unlinkedRows,
      };
    }
    try {
      await insertCguTransferLines(collection.matchedLines.map(line => ({ ...line, importRunId })));
      await updateSourceImportRun(importRunId, { status: "completed", completedAt: new Date() });
      await appendAuditTrail(associations.referenceRunId, "00000000", [], [{
        eventId: `cgu-import-${importRunId}`,
        runId: associations.referenceRunId,
        occurredAt: new Date().toISOString(),
        type: "SOURCE_FETCHED",
        severity: "info",
        inep: null,
        fieldId: null,
        message: `Importação complementar CGU concluída para ${referencePeriod}; as transferências não alteram contas, parcelas ou pagamentos PDDEInfo.`,
        payload: {
          source: CGU_SOURCE,
          importRunId,
          referencePeriod,
          sourceUrl: collection.sourceUrl,
          sourceHashSha256: collection.sourceHashSha256,
          artifactStorageKey: artifactStorage.key,
          artifactByteLength: collection.archive.byteLength,
          totalRows: collection.totalRows,
          matchedLines: collection.matchedLines.length,
          matchedUex: collection.matchedUex,
          unlinkedRows: collection.unlinkedRows,
          limitation: "Transferência CGU não confirma crédito bancário, conta, parcela ou estado de pagamento PDDEInfo.",
        },
      }]);
    } catch (error) {
      await updateSourceImportRun(importRunId, {
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Falha não especificada ao persistir as transferências CGU.",
      });
      throw error;
    }
    return {
      outcome: "completed",
      importRunId,
      referencePeriod,
      sourceHashSha256: collection.sourceHashSha256,
      totalRows: collection.totalRows,
      matchedLines: collection.matchedLines.length,
      matchedUex: collection.matchedUex,
      unlinkedRows: collection.unlinkedRows,
    };
  } finally {
    await fs.unlink(collection.archive.tempPath).catch(() => undefined);
  }
}
