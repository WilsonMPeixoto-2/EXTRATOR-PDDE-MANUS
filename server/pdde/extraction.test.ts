import { describe, expect, it } from "vitest";
import { MASTER_SCHOOLS } from "./masterList";
import { accountForExactProgram, parseSchoolPage } from "./parser";
import { attachEvidenceArtifacts } from "./provenance";
import { derivePaymentEvidenceState } from "./reconciliation";
import { canReleaseDownload, validateExtraction } from "./workbook";
import type { SchoolExtraction } from "./types";

const fixture = `
<table><tr><td>Cod. Escola:</td><td>33069247</td><td>Nome Escola:</td><td>Escola de Teste</td></tr></table>
<table><tr><td>Executora:</td><td>UEx de Teste</td><td>CNPJ:</td><td>00.000.000/0001-00</td></tr></table>
<table><tr><th>Programa/Ação</th><th>Banco</th><th>Agência</th><th>Conta</th><th>Saldo</th></tr><tr><td>PDDE QUALIDADE</td><td>001</td><td>0249</td><td>0000546402</td><td>10,00</td></tr><tr><td>PDDE EQUIDADE</td><td>001</td><td>0249</td><td>0000999999</td><td>20,00</td></tr></table>
<table><tr><th>Destinação</th><th>x</th><th>x</th><th>Vl Devido Total</th><th>x</th><th>x</th><th>x</th><th>Vl Final Devido Total</th><th>x</th><th>x</th><th>Valor Pago Total</th><th>Data Ord. Pgto</th></tr><tr><td>PDDE / PDDE Básico - 1ª Parcela</td><td></td><td></td><td>100,00</td><td></td><td></td><td></td><td>100,00</td><td></td><td></td><td>100,00</td><td>05/08/2026</td></tr></table>`;

describe("lista-mestre 4ª CRE", () => {
  it("contém os 163 INEPs únicos esperados", () => {
    expect(MASTER_SCHOOLS).toHaveLength(163);
    expect(new Set(MASTER_SCHOOLS.map(school => school.inep)).size).toBe(163);
  });
});

describe("vinculação bancária por programa", () => {
  it("não permite que PDDE Qualidade ou Equidade preencham o PDDE Básico", () => {
    const record = parseSchoolPage(fixture, "33069247", "0410001", "https://fonte.test/33069247", "2026-08-11T12:00:00.000Z");
    expect(accountForExactProgram(record, "PDDE")).toBeUndefined();
    expect(accountForExactProgram(record, "PDDE QUALIDADE")?.account).toBe("0000546402");
    expect(accountForExactProgram(record, "PDDE EQUIDADE")?.account).toBe("0000999999");
  });

  it("mantém proveniência individual para valores, datas e dados bancários", () => {
    const hash = "a".repeat(64);
    const record = parseSchoolPage(fixture, "33069247", "0410001", "https://fonte.test/33069247", "2026-08-11T12:00:00.000Z", hash);
    const paid = record.payments[0]?.provenance.paid;
    const account = record.bankAccounts[0]?.provenance.account;

    expect(paid).toMatchObject({
      fieldId: "33069247:PDDEINFO:payment:PDDE / PDDE BASICO - 1A PARCELA:paid",
      source: "PDDEINFO",
      sourceUrl: "https://fonte.test/33069247",
      sourceHashSha256: hash,
      rawValue: "100,00",
      normalizedValue: 100,
      extractionRule: "brl-currency",
      state: "PAGAMENTO_INFORMADO_PDDEINFO",
    });
    expect(paid?.validationResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "source-hash", level: "passed" }),
      expect.objectContaining({ code: "source-selector", level: "passed" }),
      expect.objectContaining({ code: "normalization", level: "passed" }),
    ]));
    expect(account).toMatchObject({
      fieldId: "33069247:PDDEINFO:bank-account:PDDE QUALIDADE:account",
      rawValue: "0000546402",
      normalizedValue: "0000546402",
      parserVersion: expect.any(String),
    });
    expect(record.fieldProvenance).toContainEqual(paid);
    expect(record.fieldProvenance).toContainEqual(account);
  });

  it("liga cada campo ao HTML bruto e JSON normalizado persistidos", () => {
    const record = parseSchoolPage(fixture, "33069247", "0410001", "https://fonte.test/33069247", "2026-08-11T12:00:00.000Z", "b".repeat(64));
    attachEvidenceArtifacts(record, {
      rawHtmlKey: "evidence/run/33069247/source.html",
      rawHtmlUrl: "/manus-storage/evidence/run/33069247/source.html",
      normalizedJsonKey: "evidence/run/33069247/normalized.json",
      normalizedJsonUrl: "/manus-storage/evidence/run/33069247/normalized.json",
    });

    expect(record.payments[0]?.provenance.paid.artifact).toMatchObject({
      rawHtmlKey: "evidence/run/33069247/source.html",
      normalizedJsonKey: "evidence/run/33069247/normalized.json",
    });
    expect(record.fieldProvenance.every(field => field.artifact !== null)).toBe(true);
  });
});

describe("validações de regressão", () => {
  it("bloqueia a liberação quando a cobertura não satisfaz os parâmetros obrigatórios", () => {
    const incomplete: SchoolExtraction[] = [];
    const validation = validateExtraction(incomplete, []);
    expect(validation.passed).toBe(false);
    expect(validation.errors.join(" ")).toContain("Cobertura inválida");
    expect(validation.errors.join(" ")).toContain("1ª parcela");
  });

  it("libera o download somente quando todos os controles forem aprovados", () => {
    expect(canReleaseDownload({ passed: false, uniqueIneps: 163, firstInstallmentPaid: 111, secondInstallmentExpected: 163, missingBasicAccounts: 47, errors: ["falha simulada"] })).toBe(false);
    expect(canReleaseDownload({ passed: true, uniqueIneps: 163, firstInstallmentPaid: 111, secondInstallmentExpected: 163, missingBasicAccounts: 47, errors: [] })).toBe(true);
  });
});

describe("estados de evidência financeira", () => {
  const baseSignals = {
    pddeInfoPaymentRegistered: false,
    sigefLiberationMatched: false,
    sigefCreditMatched: false,
    directBankStatementConfirmed: false,
    reversalMatched: false,
    divergent: false,
    allRequiredSourcesCompleted: false,
  };

  it("não equipara ordem bancária a crédito efetivado", () => {
    expect(derivePaymentEvidenceState({ ...baseSignals, pddeInfoPaymentRegistered: true })).toBe("PAGAMENTO_INFORMADO_PDDEINFO");
    expect(derivePaymentEvidenceState({ ...baseSignals, pddeInfoPaymentRegistered: true, sigefLiberationMatched: true })).toBe("OB_CORROBORADA_CREDITO_NAO_LOCALIZADO");
    expect(derivePaymentEvidenceState({ ...baseSignals, sigefCreditMatched: true })).toBe("CREDITO_LOCALIZADO_SIGEF");
  });

  it("prioriza estorno e divergência sobre confirmações anteriores", () => {
    expect(derivePaymentEvidenceState({ ...baseSignals, sigefCreditMatched: true, divergent: true })).toBe("DIVERGENCIA_ENTRE_FONTES");
    expect(derivePaymentEvidenceState({ ...baseSignals, directBankStatementConfirmed: true, reversalMatched: true })).toBe("CREDITO_ESTORNADO_OU_DEVOLVIDO");
  });

  it("só declara ausência de pagamento depois da conclusão das fontes obrigatórias", () => {
    expect(derivePaymentEvidenceState({ ...baseSignals })).toBe("CONSULTA_INCONCLUSIVA");
    expect(derivePaymentEvidenceState({ ...baseSignals, allRequiredSourcesCompleted: true })).toBe("SEM_PAGAMENTO_REGISTRADO_ATE_CONSULTA");
  });
});
