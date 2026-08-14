import { describe, expect, it } from "vitest";
import {
  collectSigefDirectExtract,
  collectSigefDirectExtractFull,
  matchSigefDirectExtractCredits,
  normalizeSigefDirectExtractQuery,
  parseSigefDirectExtractHtml,
  selectSigefDirectExtractTargets,
  sigefDirectExtractMovementDeduplicationKey,
  sigefDirectExtractSpreadsheetUrl,
  sigefDirectExtractUrl,
} from "./sigefDirectExtract";
import type { SchoolExtraction } from "./types";

const html = `<html><body>
<div>Informações da Pesquisa CNPJ: 02.016.546/0001-66 Razão Social: UEX DE TESTE Banco: 001 - Banco do Brasil Agência: 0249 Conta Corrente: 000054966X Programa: 02 - PROGRAMA DINHEIRO DIRETO NA ESCOLA Mês/Ano Início: 04/2026</div>
<table><tr><th>Data</th></tr>
<tr><td>03/05/2026</td><td>5.305,00</td><td>0</td><td>1974995000840</td><td>ORDEM BANCARIA</td><td>00.378.257/0001-81</td><td>FUNDO NACIONAL DE DESENVOLVIMENTO DA EDUCACAO</td><td>001</td><td>1607</td><td>0997380845</td></tr>
<tr><td>03/05/2026</td><td>0</td><td>5.305,00</td><td>0000000000000070</td><td>BB-APLIC C.PRZ-APL.AUT</td><td>-</td><td>-</td><td>001</td><td>0000</td><td>0000000000</td></tr></table>
<p>Exibindo de 1 até 10 de 119</p></body></html>`;
const latin1Response = (body: string, status = 200) => new Response(Buffer.from(body, "latin1"), { status });

const record = (account = "000054966X"): SchoolExtraction => ({
  inep: "33068747", sme: "0430206", sourceUrl: "https://pddeinfo.test", consultedAt: "2026-04-30T00:00:00.000Z", schoolName: "Escola", uex: "UEx", cnpj: "02.016.546/0001-66",
  bankAccounts: [{ program: "PDDE", programSemanticKey: "PDDE_BASIC", programSemanticStatus: "known", bank: "001 - Banco do Brasil", agency: "0249", account, balance: "", provenance: {} as never }],
  payments: [{ destination: "PDDE / PDDE Básico - 1ª Parcela", semanticKey: "PDDE_BASIC_P1", semanticStatus: "known", expected: 5305, paid: 5305, paidCusteio: null, paidCapital: null, paymentDate: "2026-04-30", provenance: {} as never }],
  semanticIssues: [], schemaIssues: [], rawPrograms: ["PDDE"], fieldProvenance: [],
});

describe("SIGEF — detalhamento público de extrato", () => {
  it("constrói URL apenas para o programa 02, preservando agência, conta e CNPJ", () => {
    const url = sigefDirectExtractUrl({ bank: "001", agency: "0249", account: "000054966X", cnpj: "02.016.546/0001-66", program: "02", period: "2026-04" });
    expect(url).toContain("/banco/001/agencia/0249/contacorrente/000054966X/cnpj/02016546000166/programa/02/data/042026");
    expect(() => sigefDirectExtractUrl({ bank: "001", agency: "0249", account: "000054966X", cnpj: "02.016.546/0001-66", program: "0C", period: "2026-04" })).toThrow("programa 02");
    expect(sigefDirectExtractSpreadsheetUrl({ bank: "001", agency: "0249", account: "000054966X", cnpj: "02.016.546/0001-66", program: "02", period: "2026-04" })).toContain("/visualizaexcel/banco/001/agencia/0249/contacorrente/000054966X");
  });

  it("preenche banco, agência e conta somente como formatação da mesma identidade declarada", () => {
    expect(normalizeSigefDirectExtractQuery({ bank: "1", agency: "249", account: "549665", cnpj: "02.016.546/0001-66", program: "02", period: "2026-04" })).toMatchObject({
      bank: "001", agency: "0249", account: "0000549665", cnpj: "02016546000166",
    });
  });

  it("aceita apenas os exercícios de 2025 e 2026 antes de montar qualquer rota SIGEF", () => {
    const identity = { bank: "001", agency: "0249", account: "000054966X", cnpj: "02.016.546/0001-66", program: "02" };
    expect(normalizeSigefDirectExtractQuery({ ...identity, period: "2025-12" }).period).toBe("2025-12");
    expect(normalizeSigefDirectExtractQuery({ ...identity, period: "2026-01" }).period).toBe("2026-01");
    expect(() => sigefDirectExtractUrl({ ...identity, period: "2024-12" })).toThrow("2025 e 2026");
    expect(() => sigefDirectExtractSpreadsheetUrl({ ...identity, period: "2027-01" })).toThrow("2025 e 2026");
  });

  it("lê cabeçalho, crédito, débito, documento e paginação preservando dígito alfanumérico", () => {
    const parsed = parseSigefDirectExtractHtml(html);
    expect(parsed.header).toMatchObject({ cnpj: "02.016.546/0001-66", bankCode: "001", agency: "0249", account: "000054966X", programCode: "02" });
    expect(parsed.transactions).toEqual(expect.arrayContaining([expect.objectContaining({ date: "2026-05-03", credit: 5305, document: "1974995000840", historic: "ORDEM BANCARIA" })]));
    expect(parsed.reportedTotal).toBe(119);
    expect(parsed.transactions[0]?.deduplicationKey).toHaveLength(64);
  });

  it("colapsa somente linhas idênticas por chave auxiliar, sem colidir documento com direção distinta", () => {
    const duplicateRow = `<tr><td>03/05/2026</td><td>5.305,00</td><td>0</td><td>1974995000840</td><td>ORDEM BANCARIA</td><td>00.378.257/0001-81</td><td>FUNDO NACIONAL DE DESENVOLVIMENTO DA EDUCACAO</td><td>001</td><td>1607</td><td>0997380845</td></tr>`;
    const parsed = parseSigefDirectExtractHtml(html.replace("</table>", `${duplicateRow}</table>`));
    expect(parsed).toMatchObject({ rawTransactionRows: 3 });
    expect(parsed.transactions).toHaveLength(2);
    expect(parsed.duplicateRows).toHaveLength(1);
    const credit = parsed.transactions.find(transaction => transaction.credit > 0)!;
    const sameTransactionWithFormattingNoise = {
      ...credit,
      document: "1.974.995.000.840",
      historic: " ordem   bancária ",
      selector: "tr:nth-of-type(99)",
    };
    const debitWithSameDocument = { ...credit, credit: 0, debit: credit.credit };
    expect(sigefDirectExtractMovementDeduplicationKey(parsed.header, credit)).toBe(sigefDirectExtractMovementDeduplicationKey(parsed.header, sameTransactionWithFormattingNoise));
    expect(sigefDirectExtractMovementDeduplicationKey(parsed.header, credit)).not.toBe(sigefDirectExtractMovementDeduplicationKey(parsed.header, debitWithSameDocument));
  });

  it("não concilia crédito quando o extrato declara paginação parcial", () => {
    const target = selectSigefDirectExtractTargets([record()])[0]!;
    const collection = { sourceUrl: "https://sigef.test", consultedAt: "2026-05-03T00:00:00.000Z", httpStatus: 200, attempts: 1, sourceHashSha256: "a".repeat(64), rawHtml: html, query: { bank: "001", agency: "0249", account: "000054966X", cnpj: "02016546000166", program: "02", period: "2026-04" }, ...parseSigefDirectExtractHtml(html) };
    const match = matchSigefDirectExtractCredits(target, collection)[0]!;
    expect(match).toMatchObject({ matched: false, state: "CONSULTA_INCONCLUSIVA", transaction: null });
    expect(match.message).toContain("2 de 119");
  });

  it("concilia crédito somente quando não há evidência de paginação parcial", () => {
    const target = selectSigefDirectExtractTargets([record()])[0]!;
    const completeHtml = html.replace(/<p>Exibindo de 1 até 10 de 119<\/p>/, "");
    const collection = { sourceUrl: "https://sigef.test", consultedAt: "2026-05-03T00:00:00.000Z", httpStatus: 200, attempts: 1, sourceHashSha256: "a".repeat(64), rawHtml: completeHtml, query: { bank: "001", agency: "0249", account: "000054966X", cnpj: "02016546000166", program: "02", period: "2026-04" }, ...parseSigefDirectExtractHtml(completeHtml) };
    const match = matchSigefDirectExtractCredits(target, collection)[0]!;
    expect(match).toMatchObject({ matched: true, state: "CREDITO_LOCALIZADO_SIGEF", transaction: { date: "2026-05-03", credit: 5305 } });
  });

  it("bloqueia conta divergente e não aceita conta de PDDE Qualidade como elegível", () => {
    const target = selectSigefDirectExtractTargets([record("0000549999")])[0]!;
    const collection = { sourceUrl: "https://sigef.test", consultedAt: "2026-05-03T00:00:00.000Z", httpStatus: 200, attempts: 1, sourceHashSha256: "a".repeat(64), rawHtml: html, query: { bank: "001", agency: "0249", account: "000054966X", cnpj: "02016546000166", program: "02", period: "2026-04" }, ...parseSigefDirectExtractHtml(html) };
    expect(matchSigefDirectExtractCredits(target, collection)[0]).toMatchObject({ divergent: true, state: "DIVERGENCIA_ENTRE_FONTES", divergenceFields: expect.arrayContaining(["account"]) });
    const qualityOnly = record();
    qualityOnly.bankAccounts[0]!.program = "PDDE QUALIDADE";
    expect(selectSigefDirectExtractTargets([qualityOnly])).toEqual([]);
  });

  it("interrompe o coletor quando o detalhamento apresentar CAPTCHA", async () => {
    await expect(collectSigefDirectExtract({ bank: "001", agency: "0249", account: "000054966X", cnpj: "02016546000166", program: "02", period: "2026-04" }, {
      fetcher: async () => new Response("<html>reCAPTCHA</html>", { status: 200 }),
      pause: async () => undefined,
    })).rejects.toThrow("CAPTCHA");
  });

  it("recupera a planilha pública integral e só marca cobertura completa quando as linhas conferem com o total declarado", async () => {
    const detailHtml = html.replace("Exibindo de 1 até 10 de 119", "Exibindo de 1 ate 2 de 2");
    const spreadsheetHtml = `<table><tr><th>Data</th></tr><tr><td>03/05/2026</td><td>5.305,00</td><td>0</td><td>1974995000840</td><td>ORDEM BANCARIA</td><td>00.378.257/0001-81</td><td>FNDE</td><td>001</td><td>1607</td><td>0997380845</td></tr><tr><td>03/05/2026</td><td>0</td><td>5.305,00</td><td>0000000000000070</td><td>BB-APLIC C.PRZ-APL.AUT</td><td>-</td><td>-</td><td>001</td><td>0000</td><td>0000000000</td></tr></table>`;
    const responses = [detailHtml, spreadsheetHtml];
    const collection = await collectSigefDirectExtractFull({ bank: "001", agency: "0249", account: "000054966X", cnpj: "02.016.546/0001-66", program: "02", period: "2026-04" }, {
      fetcher: async () => latin1Response(responses.shift()!),
      pause: async () => undefined,
    });
    expect(collection).toMatchObject({ reportedTotal: 2, rawTransactionRows: 2, coverageComplete: true });
    expect(collection).toMatchObject({ coverageExpectedRows: 2, coverageBasis: "reported-total" });
    expect(collection.sourceUrl).toContain("visualizaexcel");
    expect(collection.detailPage.sourceUrl).toContain("extrato-conta-corrente-detalhamento");
  });

  it("usa as linhas do detalhamento como base de cobertura quando o contador textual estiver ausente e bloqueia conciliação se a planilha divergir", async () => {
    const detailHtml = html.replace(/<p>Exibindo de 1 até 10 de 119<\/p>/, "");
    const spreadsheetHtml = `<table><tr><td>03/05/2026</td><td>5.305,00</td><td>0</td><td>1974995000840</td><td>ORDEM BANCARIA</td><td>00.378.257/0001-81</td><td>FNDE</td><td>001</td><td>1607</td><td>0997380845</td></tr></table>`;
    const responses = [detailHtml, spreadsheetHtml];
    const collection = await collectSigefDirectExtractFull({ bank: "001", agency: "0249", account: "000054966X", cnpj: "02.016.546/0001-66", program: "02", period: "2026-04" }, {
      fetcher: async () => latin1Response(responses.shift()!),
      pause: async () => undefined,
    });
    expect(collection).toMatchObject({ reportedTotal: null, coverageExpectedRows: 2, coverageBasis: "detail-row-count", rawTransactionRows: 1, coverageComplete: false });
    const target = selectSigefDirectExtractTargets([record()])[0]!;
    expect(matchSigefDirectExtractCredits(target, collection)[0]).toMatchObject({ matched: false, state: "CONSULTA_INCONCLUSIVA" });
  });

  it("interrompe a coleta integral quando a planilha pública não puder ser baixada", async () => {
    let requestCount = 0;
    await expect(collectSigefDirectExtractFull({ bank: "001", agency: "0249", account: "000054966X", cnpj: "02.016.546/0001-66", program: "02", period: "2026-04" }, {
      fetcher: async () => {
        requestCount += 1;
        return requestCount === 1
          ? latin1Response(html)
          : new Response("indisponível", { status: 503 });
      },
      pause: async () => undefined,
    })).rejects.toThrow("HTTP 503");
  });
});
