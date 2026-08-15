import { createHash, randomUUID } from "node:crypto";
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
import { parseBrazilianCurrencyToCents } from "./money";

export const CGU_TRANSFERENCIAS_BASE_URL = "https://portaldatransparencia.gov.br/download-de-dados/transferencias";
export const CGU_SOURCE = "CGU_TRANSFERENCIAS" as const;
export const CGU_REQUIRED_HEADERS = ["ANO MES", "CODIGO FAVORECIDO", "CODIGO ORGAO SIAFI", "ACAO", "VALOR TRANSFERIDO"] as const;
export const CGU_PARSER_VERSION = "1.0.0";

type FetchLike = typeof fetch;

export type CguTransferCollection = {
  referencePeriod: string;
  sourceUrl: string;
  sourceHashSha256: string;
  totalRows: number;
  matchedLines: CguTransferLineInput[];
  matchedUex: number;
  unlinkedRows: number;
};

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, " ").trim().toUpperCase();
}

function normalizeCnpj(value: string) {
  return value.replace(/\D/g, "");
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
 * Lê o CSV descompactado diretamente do ZIP; os registros são processados linha a linha.
 * Transferências não vinculadas a CNPJ da referência PDDEInfo jamais são devolvidas para persistência.
 */
export async function collectCguTransfers(
  referencePeriod: string,
  cnpjToInep: ReadonlyMap<string, string>,
  fetcher: FetchLike = fetch,
): Promise<CguTransferCollection> {
  const sourceUrl = buildCguSourceUrl(referencePeriod);
  const response = await fetcher(sourceUrl, { headers: { Accept: "application/zip" } });
  if (!response.ok || !response.body) throw new Error(`A fonte CGU não retornou um arquivo utilizável (${response.status}).`);

  const archiveHash = createHash("sha256");
  const hashingStream = new Transform({
    transform(chunk, _encoding, callback) {
      archiveHash.update(chunk);
      callback(null, chunk);
    },
  });
  const archiveStream = Readable.fromWeb(response.body as never).pipe(hashingStream);
  const csvStream = archiveStream.pipe(unzipper.ParseOne(/\.csv$/i));
  csvStream.setEncoding("latin1");
  const records = createCguCsvParser(csvStream);

  let headerIndex: Map<string, number> | null = null;
  let totalRows = 0;
  const matchedLines: CguTransferLineInput[] = [];
  let unlinkedRows = 0;

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
      continue;
    }
    if (selection.kind === "unlinked") {
      unlinkedRows += 1;
    }
  }

  if (!headerIndex) throw new Error("O arquivo ZIP CGU não contém um CSV de transferências legível.");
  const sourceHashSha256 = archiveHash.digest("hex");
  return {
    referencePeriod,
    sourceUrl,
    sourceHashSha256,
    totalRows,
    matchedLines,
    matchedUex: new Set(matchedLines.map(line => line.inep)).size,
    unlinkedRows,
  };
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
      artifact: { sourceUrl: collection.sourceUrl, sha256: collection.sourceHashSha256, contentType: "application/zip" },
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
}
