import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { deduplicateCguTransferLines, type CguTransferLineInput } from "../db";
import {
  assertCguZipSignature,
  buildCguArtifactStoragePath,
  buildCguIdempotencyKey,
  CGU_ARCHIVE_MAX_COMPRESSED_BYTES,
  CGU_ARCHIVE_MAX_UNCOMPRESSED_BYTES,
  createCguCsvParser,
  currentAndPreviousReferencePeriods,
  selectCguTransferRow,
  validateCguArchiveResponse,
  validateCguZipEntry,
} from "./cguTransferencias";

const headers = new Map([
  ["ANO MES", 0], ["CODIGO FAVORECIDO", 1], ["NOME FAVORECIDO", 2], ["CODIGO ORGAO SIAFI", 3], ["ACAO", 4], ["VALOR TRANSFERIDO", 5],
]);
const master = new Map([["01872287000102", "33070768"]]);
const baseFields = ["2026-07", "01.872.287/0001-02", "UEx Presidente Eurico Dutra", "26298", "0515", "1.234,56"];

describe("importação complementar CGU", () => {
  it("interpreta em fluxo campos entre aspas, aspas escapadas e quebra de linha sem dividir o registro lógico", async () => {
    const input = Readable.from(["ANO/MÊS;NOME FAVORECIDO\n2026-07;\"UEx \"\"Teste\"\"\n4ª CRE\"\n"]);
    const records: string[][] = [];
    for await (const record of createCguCsvParser(input)) records.push(record as string[]);
    expect(records).toEqual([
      ["ANO/MÊS", "NOME FAVORECIDO"],
      ["2026-07", "UEx \"Teste\"\n4ª CRE"],
    ]);
  });

  it("produz a mesma chave de idempotência para o mesmo período e artefato", () => {
    const hash = "a".repeat(64);
    expect(buildCguIdempotencyKey("2026-07", hash)).toBe(buildCguIdempotencyKey("2026-07", hash));
    expect(buildCguIdempotencyKey("2026-07", hash)).not.toBe(buildCguIdempotencyKey("2026-06", hash));
    expect(currentAndPreviousReferencePeriods(new Date("2026-08-15T12:00:00.000Z"))).toEqual(["2026-08", "2026-07"]);
  });

  it("rejeita resposta, assinatura ou estrutura ZIP fora dos limites definidos", () => {
    expect(() => validateCguArchiveResponse("text/html", "12")).toThrow(/tipo de arquivo/i);
    expect(() => validateCguArchiveResponse("application/zip", String(CGU_ARCHIVE_MAX_COMPRESSED_BYTES + 1))).toThrow(/limite comprimido/i);
    expect(() => assertCguZipSignature(Buffer.from("nao-e-zip"))).toThrow(/assinatura ZIP/i);
    expect(() => validateCguZipEntry({ path: "outro.csv", type: "File", vars: { uncompressedSize: 10 } })).toThrow(/entrada não permitida/i);
    expect(() => validateCguZipEntry({ path: "202607_Transferencias.csv", type: "File", vars: { uncompressedSize: CGU_ARCHIVE_MAX_UNCOMPRESSED_BYTES + 1 } })).toThrow(/tamanho descompactado/i);
  });

  it("constrói caminho lógico de evidência por período e hash, sem identificador de escola", () => {
    const hash = "b".repeat(64);
    expect(buildCguArtifactStoragePath("2026-07", hash)).toBe(`pdde/cgu-transferencias/2026-07/${hash}.zip`);
  });

  it("associa somente CNPJ presente na lista-mestre comprovada e preserva valor em centavos", () => {
    const matched = selectCguTransferRow("2026-07", headers, baseFields, master);
    expect(matched).toMatchObject({ kind: "matched", line: { inep: "33070768", cnpj: "01872287000102", amountCents: 123456 } });
    const outsideMaster = selectCguTransferRow("2026-07", headers, ["2026-07", "00.000.000/0001-00", "Outra UEx", "26298", "0515", "100,00"], master);
    expect(outsideMaster).toEqual({ kind: "unlinked" });
  });

  it("remove duplicata do mesmo lote antes de persistir e preserva linhas de lotes distintos", () => {
    const selection = selectCguTransferRow("2026-07", headers, baseFields, master);
    if (selection.kind !== "matched") throw new Error("Fixture CGU deveria ser vinculada.");
    const base: CguTransferLineInput = { ...selection.line, importRunId: "importacao-a" };
    const lines = deduplicateCguTransferLines([base, { ...base }, { ...base, importRunId: "importacao-b" }]);
    expect(lines).toHaveLength(2);
    expect(lines.map(line => line.importRunId)).toEqual(["importacao-a", "importacao-b"]);
  });
});
