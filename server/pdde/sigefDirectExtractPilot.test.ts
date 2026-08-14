import { describe, expect, it } from "vitest";
import { registerSigefDirectExtractPilot } from "./sigefDirectExtractPilot";
import { parseSigefDirectExtractHtml, selectSigefDirectExtractTargets } from "./sigefDirectExtract";
import type { SchoolExtraction } from "./types";

const html = `<html><body><div>Informações da Pesquisa CNPJ: 02.016.546/0001-66 Razão Social: UEX Banco: 001 - Banco do Brasil Agência: 0249 Conta Corrente: 000054966X Programa: 02 - PROGRAMA DINHEIRO DIRETO NA ESCOLA Mês/Ano Início: 04/2026</div><table><tr><th>Data</th></tr><tr><td>03/05/2026</td><td>5.305,00</td><td>0</td><td>1974995000840</td><td>ORDEM BANCARIA</td><td>00.378.257/0001-81</td><td>FNDE</td><td>001</td><td>1607</td><td>0997380845</td></tr></table><p>Exibindo de 1 até 1 de 1</p></body></html>`;
const record = (inep: string): SchoolExtraction => ({
  inep, sme: "0430206", sourceUrl: "https://pddeinfo.test", consultedAt: "2026-04-30T00:00:00.000Z", schoolName: "Escola", uex: "UEx", cnpj: "02.016.546/0001-66",
  bankAccounts: [{ program: "PDDE", programSemanticKey: "PDDE_BASIC", programSemanticStatus: "known", bank: "001 - Banco do Brasil", agency: "0249", account: "000054966X", balance: "", provenance: {} as never }],
  payments: [{ destination: "PDDE / PDDE Básico - 1ª Parcela", semanticKey: "PDDE_BASIC_P1", semanticStatus: "known", expected: 5305, paid: 5305, paidCusteio: null, paidCapital: null, paymentDate: "2026-04-30", provenance: {} as never }],
  semanticIssues: [], schemaIssues: [], rawPrograms: ["PDDE"], fieldProvenance: [],
});

describe("piloto SIGEF de extrato direto", () => {
  it("persiste resposta e registra crédito SIGEF sem modificar a conta primária", async () => {
    const calls: Array<{ name: string; value: unknown }> = [];
    const parsed = parseSigefDirectExtractHtml(html);
    const result = await registerSigefDirectExtractPilot("run-1", [record("33068747")], {
      collect: async () => ({ sourceUrl: "https://sigef.test", consultedAt: "2026-05-03T12:00:00.000Z", httpStatus: 200, attempts: 1, sourceHashSha256: "a".repeat(64), rawHtml: html, query: { bank: "001", agency: "0249", account: "000054966X", cnpj: "02016546000166", program: "02", period: "2026-04" }, ...parsed }),
      store: async key => ({ key, url: `/manus-storage/${key}` }),
      persistArtifact: async value => { calls.push({ name: "artifact", value }); },
      appendTrail: async (...value) => { calls.push({ name: "trail", value }); },
      wait: async () => undefined,
      now: () => new Date("2026-05-03T12:00:00.000Z"),
    });
    expect(result).toMatchObject({ attempted: 1, fetched: 1, movementsPreserved: 1, locatedCredits: 1, divergentPayments: 0, failures: 0 });
    expect(calls.filter(call => call.name === "artifact")).toHaveLength(2);
    const trail = calls.find(call => call.name === "trail")?.value as unknown[];
    const provenance = trail[2] as Array<{ source: string; logicalKey: string; state: string; validationResults: Array<{ code: string }> }>;
    expect(provenance).toEqual(expect.arrayContaining([expect.objectContaining({ source: "SIGEF_EXTRATO", logicalKey: "sigefExtrato:PDDE_BASIC_P1:credit", state: "CREDITO_LOCALIZADO_SIGEF" })]));
    expect(provenance).toEqual(expect.arrayContaining([expect.objectContaining({ source: "SIGEF_EXTRATO", logicalKey: expect.stringMatching(/^sigefExtrato:movement:[a-f0-9]{64}$/), state: null, validationResults: expect.arrayContaining([expect.objectContaining({ code: "deduplication-key" })]) })]));
    const events = trail[3] as Array<{ eventId: string }>;
    expect(events.every(event => event.eventId.length <= 64)).toBe(true);
  });

  it("limita a seleção a cinco UEx elegíveis", () => {
    expect(selectSigefDirectExtractTargets(Array.from({ length: 6 }, (_, index) => record(`330687${index}`)))).toHaveLength(5);
  });

  it("preserva página parcial como evidência incompleta sem conciliar crédito", async () => {
    const calls: Array<{ name: string; value: unknown }> = [];
    const partialHtml = html.replace("Exibindo de 1 até 1 de 1", "Exibindo de 1 até 1 de 147");
    const parsed = parseSigefDirectExtractHtml(partialHtml);
    const result = await registerSigefDirectExtractPilot("run-partial", [record("33068749")], {
      collect: async () => ({ sourceUrl: "https://sigef.test", consultedAt: "2026-05-03T12:00:00.000Z", httpStatus: 200, attempts: 1, sourceHashSha256: "b".repeat(64), rawHtml: partialHtml, query: { bank: "001", agency: "0249", account: "000054966X", cnpj: "02016546000166", program: "02", period: "2026-04" }, ...parsed }),
      store: async key => ({ key, url: `/manus-storage/${key}` }),
      persistArtifact: async () => undefined,
      appendTrail: async (...value) => { calls.push({ name: "trail", value }); },
      wait: async () => undefined,
      now: () => new Date("2026-05-03T12:00:00.000Z"),
    });
    expect(result).toMatchObject({ fetched: 1, movementsPreserved: 1, locatedCredits: 0, inconclusivePayments: 1, paginationLimited: 1 });
    const trail = calls.find(call => call.name === "trail")?.value as unknown[];
    const provenance = trail[2] as Array<{ logicalKey: string; validationResults: Array<{ code: string }> }>;
    const movement = provenance.find(field => field.logicalKey.includes("sigefExtrato:movement"));
    expect(movement?.validationResults).toEqual(expect.arrayContaining([expect.objectContaining({ code: "pagination-partial" })]));
  });

  it("colapsa duplicação idêntica da resposta, preservando a evidência bruta e a contagem do colapso", async () => {
    const calls: Array<{ name: string; value: unknown }> = [];
    const duplicate = `<tr><td>03/05/2026</td><td>5.305,00</td><td>0</td><td>1974995000840</td><td>ORDEM BANCARIA</td><td>00.378.257/0001-81</td><td>FNDE</td><td>001</td><td>1607</td><td>0997380845</td></tr>`;
    const duplicatedHtml = html.replace("</table>", `${duplicate}</table>`).replace("Exibindo de 1 até 1 de 1", "Exibindo de 1 até 2 de 2");
    const parsed = parseSigefDirectExtractHtml(duplicatedHtml);
    const result = await registerSigefDirectExtractPilot("run-dedup", [record("33068750")], {
      collect: async () => ({ sourceUrl: "https://sigef.test", consultedAt: "2026-05-03T12:00:00.000Z", httpStatus: 200, attempts: 1, sourceHashSha256: "c".repeat(64), rawHtml: duplicatedHtml, query: { bank: "001", agency: "0249", account: "000054966X", cnpj: "02016546000166", program: "02", period: "2026-04" }, ...parsed }),
      store: async key => ({ key, url: `/manus-storage/${key}` }),
      persistArtifact: async () => undefined,
      appendTrail: async (...value) => { calls.push({ name: "trail", value }); },
      wait: async () => undefined,
      now: () => new Date("2026-05-03T12:00:00.000Z"),
    });
    expect(result).toMatchObject({ movementsPreserved: 1, duplicateMovementsCollapsed: 1 });
    const trail = calls.find(call => call.name === "trail")?.value as unknown[];
    const provenance = trail[2] as Array<{ logicalKey: string }>;
    expect(provenance.filter(field => field.logicalKey.startsWith("sigefExtrato:movement:"))).toHaveLength(1);
  });
});
