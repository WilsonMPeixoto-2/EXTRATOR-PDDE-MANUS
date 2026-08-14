import { describe, expect, it } from "vitest";
import { collectSigefLegacyLiberation, matchSigefLegacyLiberationToPayment, parseSigefLegacyLiberationHtml, sigefLegacyLiberationUrl } from "./sigefLiberation";
import type { PaymentLine } from "./types";

const html = `<table><tr><td>05/AGO/2026</td><td>019072</td><td>4.185,00</td><td>PDDE - Básico - 1ª parcela</td><td>BANCO DO BRASIL</td><td>0249</td><td>0000549789</td></tr></table>`;

const payment = {
  destination: "PDDE / PDDE Básico - 1ª Parcela",
  semanticKey: "PDDE_BASIC_P1",
  semanticStatus: "known",
  expected: 4185,
  paid: 4185,
  paidCusteio: null,
  paidCapital: null,
  paymentDate: "2026-08-05",
  provenance: {} as PaymentLine["provenance"],
} satisfies PaymentLine;

describe("SIGEF Liberações — rota legada", () => {
  it("constrói URL pública limitada a CNPJ, exercício e recorte municipal aprovado", () => {
    const url = sigefLegacyLiberationUrl("04.500.463/0001-73", 2026);
    expect(url).toContain("p_programa=02");
    expect(url).toContain("p_municipio=330455");
    expect(url).toContain("p_cgc=04500463000173");
  });

  it("preserva OB, agência e conta como texto ao ler a tabela detalhada", () => {
    expect(parseSigefLegacyLiberationHtml(html)).toEqual([expect.objectContaining({
      paymentDate: "2026-08-05", bankOrder: "019072", amount: 4185, agency: "0249", account: "0000549789",
    })]);
  });

  it("corrobora parcela por programa, data e valor sem transformar OB em crédito confirmado", () => {
    const result = matchSigefLegacyLiberationToPayment("04.500.463/0001-73", payment, parseSigefLegacyLiberationHtml(html));
    expect(result).toMatchObject({ matched: true, state: "OB_CORROBORADA_CREDITO_NAO_LOCALIZADO", row: { bankOrder: "019072" } });
  });

  it("bloqueia a associação quando a mesma parcela e data divergem no valor SIGEF", () => {
    const divergent = html.replace("4.185,00", "4.180,00");
    const result = matchSigefLegacyLiberationToPayment("04.500.463/0001-73", payment, parseSigefLegacyLiberationHtml(divergent));
    expect(result).toMatchObject({ matched: false, divergent: true, state: "DIVERGENCIA_ENTRE_FONTES", divergenceFields: ["amount"] });
  });

  it("bloqueia a associação quando duas linhas exatas apresentam OB ou conta diferentes", () => {
    const conflictingRows = parseSigefLegacyLiberationHtml(`${html}${html.replace("019072", "019073").replace("0000549789", "0000549790")}`);
    const result = matchSigefLegacyLiberationToPayment("04.500.463/0001-73", payment, conflictingRows);
    expect(result).toMatchObject({ matched: false, divergent: true, state: "DIVERGENCIA_ENTRE_FONTES" });
    expect(result.divergenceFields).toEqual(expect.arrayContaining(["bankOrder", "account"]));
  });

  it("interrompe a coleta quando a resposta apresenta CAPTCHA", async () => {
    await expect(collectSigefLegacyLiberation({ cnpj: "04.500.463/0001-73", exercise: 2026 }, {
      fetcher: async () => new Response("<html>reCAPTCHA</html>", { status: 200 }),
      pause: async () => undefined,
    })).rejects.toThrow("CAPTCHA");
  });
});
