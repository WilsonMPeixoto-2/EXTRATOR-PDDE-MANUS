import { describe, expect, it } from "vitest";
import { persistOpenDataControl } from "./openDataControl";
import type { AuditEvent } from "./types";

class InMemoryRunAuditStore {
  artifacts: Array<{ runId: string; kind: string; storageKey: string; storageUrl: string; contentType: string; sha256: string }> = [];
  events: AuditEvent[] = [];
  blobs = new Map<string, Buffer>();

  async store(key: string, data: Buffer) {
    this.blobs.set(key, data);
    return { key, url: `/manus-storage/${key}` };
  }

  async persistArtifact(artifact: { runId: string; kind: "open_data_file"; storageKey: string; storageUrl: string; contentType: string; sha256: string }) {
    this.artifacts.push(artifact);
  }

  async appendAudit(_runId: string, _inep: string, _provenance: [], events: AuditEvent[]) {
    this.events.push(...events);
  }

  overview(runId: string) {
    return { artifacts: this.artifacts.filter(artifact => artifact.runId === runId), events: this.events.filter(event => event.runId === runId) };
  }
}

describe("integração de Dados Abertos até a auditoria", () => {
  it("registra e recupera o arquivo secundário e seus metadados completos sem promover dado financeiro a fonte primária", async () => {
    const store = new InMemoryRunAuditStore();
    const result = await persistOpenDataControl("run-integrado", {
      file: "INEP,VALOR_REPASSE\n00000001,100.00\n",
      fileName: "pdde-2026.csv",
      contentType: "text/csv",
      sourceUrl: "https://dados.gov.br/dados/conjuntos-dados/fnde-pdde",
      obtainedAt: "2026-08-12T10:00:00.000Z",
      declaredUpdatedAt: "2026-08-11T00:00:00.000Z",
      exercise: 2026,
      columns: ["INEP", "VALOR_REPASSE"],
      totalRows: 163,
      matchedSchools: 160,
    }, { store: (key, data) => store.store(key, data), persistArtifact: artifact => store.persistArtifact(artifact), appendAudit: (...args) => store.appendAudit(...args) });

    const overview = store.overview("run-integrado");
    expect(overview.artifacts).toEqual([expect.objectContaining({ kind: "open_data_file", sha256: result.validation.fileHashSha256, contentType: "text/csv" })]);
    expect(store.blobs.has(overview.artifacts[0]!.storageKey)).toBe(true);
    const payload = overview.events[0]!.payload as Record<string, unknown>;
    expect(payload).toMatchObject({ source: "DADOS_ABERTOS", sourceUrl: "https://dados.gov.br/dados/conjuntos-dados/fnde-pdde", obtainedAt: "2026-08-12T10:00:00.000Z", declaredUpdatedAt: "2026-08-11T00:00:00.000Z", exercise: 2026, totalRows: 163, matchedSchools: 160 });
    expect(payload.warnings).toEqual([expect.stringContaining("Cobertura parcial")]);
  });
});
