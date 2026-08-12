import { describe, expect, it } from "vitest";
import { persistOpenDataControl, validateOpenDataControl } from "./openDataControl";

const base = {
  file: "INEP,VALOR_REPASSE\n00000001,100.00\n",
  sourceUrl: "https://dados.gov.br/dados/conjuntos-dados/fnde-pdde",
  obtainedAt: "2026-08-12T10:00:00.000Z",
  declaredUpdatedAt: "2026-08-11T00:00:00.000Z",
  exercise: 2026,
  columns: ["Código INEP", "Valor de repasse"],
  totalRows: 163,
  matchedSchools: 163,
};

describe("controle secundário por Dados Abertos FNDE", () => {
  it("aceita arquivo versionado quando origem, atualização, exercício, chave e medida financeira estão presentes", () => {
    const result = validateOpenDataControl(base);
    expect(result).toMatchObject({ passed: true, detectedIdentifier: "INEP", hasFinancialMeasure: true, coverageRatio: 1 });
    expect(result.fileHashSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("bloqueia arquivo sem chave institucional, medida financeira ou cobertura da lista-mestre", () => {
    const result = validateOpenDataControl({ ...base, columns: ["Escola", "Descrição"], matchedSchools: 0 });
    expect(result.passed).toBe(false);
    expect(result.errors.join(" ")).toContain("INEP ou CNPJ");
    expect(result.errors.join(" ")).toContain("medida financeira");
    expect(result.errors.join(" ")).toContain("Nenhuma escola");
  });

  it("registra cobertura parcial como advertência, sem promover o arquivo a fonte primária", () => {
    const result = validateOpenDataControl({ ...base, totalRows: 90, matchedSchools: 89 });
    expect(result).toMatchObject({ passed: true, coverageRatio: expect.closeTo(89 / 90) });
    expect(result.warnings.join(" ")).toContain("Cobertura parcial: 89 de 163");
  });

  it("persiste o arquivo como artefato da execução e publica seus metadados em evento append-only", async () => {
    let artifact: Record<string, unknown> | null = null;
    let event: Record<string, unknown> | null = null;
    const result = await persistOpenDataControl("run-open-data", { ...base, fileName: "pdde_2026.csv", contentType: "text/csv" }, {
      store: async (key) => ({ key, url: `/manus-storage/${key}` }),
      persistArtifact: async input => { artifact = input; },
      appendAudit: async (_runId, _inep, _provenance, events) => { event = events[0] ?? null; },
    });

    expect(artifact).toMatchObject({ runId: "run-open-data", kind: "open_data_file", sha256: result.validation.fileHashSha256 });
    expect(event).toMatchObject({ type: "SOURCE_FETCHED", message: expect.stringContaining("controle secundário") });
    expect((event?.payload as { exercise?: number; matchedSchools?: number; source?: string }) ?? {}).toMatchObject({ source: "DADOS_ABERTOS", exercise: 2026, matchedSchools: 163 });
  });
});
