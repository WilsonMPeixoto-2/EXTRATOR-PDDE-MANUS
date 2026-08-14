import { describe, expect, it } from "vitest";
import { registerSigefLegacyLiberationPilot } from "./sigefLiberationPilot";
import type { SchoolExtraction } from "./types";

const record = (inep: string): SchoolExtraction => ({
  inep, sme: "0410001", sourceUrl: "https://pddeinfo.test", consultedAt: "2026-08-12T00:00:00.000Z", schoolName: "Escola", uex: "UEx", cnpj: "04.500.463/0001-73",
  bankAccounts: [], semanticIssues: [], schemaIssues: [], rawPrograms: [], fieldProvenance: [],
  payments: [{ destination: "PDDE / PDDE Básico - 1ª Parcela", semanticKey: "PDDE_BASIC_P1", semanticStatus: "known", expected: 4185, paid: 4185, paidCusteio: null, paidCapital: null, paymentDate: "2026-08-05", provenance: {} as never }],
});

describe("piloto SIGEF legado", () => {
  it("persiste artefatos e observações SIGEF sem modificar a conta primária do PDDEInfo", async () => {
    const calls: Array<{ name: string; value: unknown }> = [];
    const result = await registerSigefLegacyLiberationPilot("run-1", [record("33069247")], {
      collect: async () => ({ sourceUrl: "https://sigef.test", consultedAt: "2026-08-12T12:00:00.000Z", httpStatus: 200, attempts: 1, sourceHashSha256: "a".repeat(64), rawHtml: "<html/>", rows: [{ paymentDate: "2026-08-05", bankOrder: "019072", amount: 4185, program: "PDDE - Básico - 1ª parcela", bank: "BANCO DO BRASIL", agency: "0249", account: "0000549789", selector: "tr:nth-of-type(1)" }] }),
      store: async key => ({ key, url: `/manus-storage/${key}` }),
      persistArtifact: async value => { calls.push({ name: "artifact", value }); },
      appendTrail: async (...value) => { calls.push({ name: "trail", value }); },
      wait: async () => undefined,
      now: () => new Date("2026-08-12T12:00:00.000Z"),
    });
    expect(result).toMatchObject({ attempted: 1, fetched: 1, corroboratedPayments: 1, divergentPayments: 0, failures: 0 });
    expect(calls.filter(call => call.name === "artifact")).toHaveLength(2);
    const trail = calls.find(call => call.name === "trail")?.value as unknown[];
    const provenance = trail[2] as Array<{ source: string; logicalKey: string; normalizedValue: string; state: string }>;
    expect(provenance).toEqual(expect.arrayContaining([expect.objectContaining({ source: "SIGEF_LIBERACAO", logicalKey: "sigefLiberacao:PDDE_BASIC_P1:account", normalizedValue: "0000549789", state: "OB_CORROBORADA_CREDITO_NAO_LOCALIZADO" })]));
    const events = trail[3] as Array<{ eventId: string }>;
    expect(events.every(event => event.eventId.length <= 64)).toBe(true);
  });

  it("persiste divergência crítica quando o valor SIGEF conflita com a parcela PDDEInfo", async () => {
    const calls: Array<{ name: string; value: unknown }> = [];
    const result = await registerSigefLegacyLiberationPilot("run-divergent", [record("33069248")], {
      collect: async () => ({ sourceUrl: "https://sigef.test", consultedAt: "2026-08-12T12:00:00.000Z", httpStatus: 200, attempts: 1, sourceHashSha256: "b".repeat(64), rawHtml: "<html/>", rows: [{ paymentDate: "2026-08-05", bankOrder: "019072", amount: 4180, program: "PDDE - Básico - 1ª parcela", bank: "BANCO DO BRASIL", agency: "0249", account: "0000549789", selector: "tr:nth-of-type(1)" }] }),
      store: async key => ({ key, url: `/manus-storage/${key}` }),
      persistArtifact: async () => undefined,
      appendTrail: async (...value) => { calls.push({ name: "trail", value }); },
      wait: async () => undefined,
      now: () => new Date("2026-08-12T12:00:00.000Z"),
    });
    expect(result).toMatchObject({ corroboratedPayments: 0, divergentPayments: 1, failures: 0 });
    const trail = calls.find(call => call.name === "trail")?.value as unknown[];
    const events = trail[3] as Array<{ severity: string; message: string; payload: { state?: string } }>;
    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ severity: "critical", message: expect.stringContaining("Divergência") })]));
  });
});
