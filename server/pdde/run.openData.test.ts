import { describe, expect, it } from "vitest";
import { registerSecondaryOpenDataControl } from "./run";

const input = {
  file: "INEP,VALOR\n00000001,100.00\n",
  fileName: "pdde-2026.csv",
  contentType: "text/csv",
  sourceUrl: "https://dados.gov.br/dados/conjuntos-dados/fnde-pdde",
  obtainedAt: "2026-08-12T10:00:00.000Z",
  declaredUpdatedAt: "2026-08-11T00:00:00.000Z",
  exercise: 2026,
  columns: ["INEP", "VALOR_REPASSE"],
  totalRows: 163,
  matchedSchools: 163,
};

describe("etapa operacional de Dados Abertos na execução", () => {
  it("encaminha o arquivo explicitamente para o registro imutável sem alterar os dados do PDDEInfo", async () => {
    const persistedArtifacts: unknown[] = [];
    const persistedEvents: unknown[] = [];
    const result = await registerSecondaryOpenDataControl("run-operacional", input, {
      store: async key => ({ key, url: `/manus-storage/${key}` }),
      persistArtifact: async artifact => { persistedArtifacts.push(artifact); },
      appendAudit: async (_runId, _inep, _provenance, events) => { persistedEvents.push(...events); },
    });

    expect(result.validation.passed).toBe(true);
    expect(persistedArtifacts).toEqual([expect.objectContaining({ runId: "run-operacional", kind: "open_data_file" })]);
    expect(persistedEvents).toEqual([expect.objectContaining({ type: "SOURCE_FETCHED", payload: expect.objectContaining({ source: "DADOS_ABERTOS", exercise: 2026 }) })]);
  });

  it("mantém o arquivo registrado e seus metadados recuperáveis no dossiê de auditoria da mesma execução", async () => {
    const artifacts: Array<Record<string, unknown>> = [];
    const events: Array<Record<string, unknown>> = [];
    const result = await registerSecondaryOpenDataControl("run-dossie", input, {
      store: async key => ({ key, url: `/manus-storage/${key}` }),
      persistArtifact: async artifact => { artifacts.push(artifact as unknown as Record<string, unknown>); },
      appendAudit: async (_runId, _inep, _provenance, auditEvents) => { events.push(...auditEvents as unknown as Array<Record<string, unknown>>); },
    });

    const dossier = {
      artifacts: artifacts.filter(artifact => artifact.runId === "run-dossie"),
      events: events.filter(event => event.runId === "run-dossie"),
    };
    expect(dossier.artifacts).toEqual([expect.objectContaining({ kind: "open_data_file", sha256: result.validation.fileHashSha256, storageKey: expect.stringContaining("run-dossie") })]);
    expect(dossier.events).toEqual([expect.objectContaining({ type: "SOURCE_FETCHED", payload: expect.objectContaining({ source: "DADOS_ABERTOS", sourceUrl: input.sourceUrl, totalRows: 163, matchedSchools: 163 }) })]);
  });
});
