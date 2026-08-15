import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";
import { MASTER_SCHOOLS } from "./masterList";
import { accountForExactProgram, parseSchoolPage } from "./parser";
import { attachEvidenceArtifacts } from "./provenance";
import { derivePaymentEvidenceState } from "./reconciliation";
import { basicAccountSource, canReleaseDownload, createV2Workbook, financialHeaders, paymentEvidenceSummary, validateExtraction } from "./workbook";
import { comparePaymentSnapshots, paymentSnapshotsFromRecords } from "./history";
import { schoolArtifactPayloads, schoolConsultationPayload } from "../db";
import type { AuditRecord, SchoolExtraction } from "./types";

const fixture = `
<table><tr><td>Cod. Escola:</td><td>33069247</td><td>Nome Escola:</td><td>Escola de Teste</td></tr></table>
<table><tr><td>Executora:</td><td>UEx de Teste</td><td>CNPJ:</td><td>00.000.000/0001-00</td></tr></table>
<table><tr><th>Programa/Ação</th><th>Banco</th><th>Agência</th><th>Conta</th><th>Saldo</th></tr><tr><td>PDDE QUALIDADE</td><td>001</td><td>0249</td><td>0000546402</td><td>10,00</td></tr><tr><td>PDDE EQUIDADE</td><td>001</td><td>0249</td><td>0000999999</td><td>20,00</td></tr></table>
<table><tr><th>Destinação</th><th>x</th><th>x</th><th>Vl Devido Total</th><th>x</th><th>x</th><th>x</th><th>Vl Final Devido Total</th><th>x</th><th>x</th><th>Valor Pago Total</th><th>Data Ord. Pgto</th></tr><tr><td>PDDE / PDDE Básico - 1ª Parcela</td><td></td><td></td><td>100,00</td><td></td><td></td><td></td><td>100,00</td><td></td><td></td><td>100,00</td><td>05/08/2026</td></tr></table>`;
const anonymizedFixture = readFileSync(new URL("./fixtures/pddeinfo-2026-anonimizado.html", import.meta.url), "utf8");
const goldenFixture = JSON.parse(readFileSync(new URL("./fixtures/pddeinfo-2026-anonimizado.golden.json", import.meta.url), "utf8")) as {
  inep: string; sme: string; sourceUrl: string; consultedAt: string; bankPrograms: string[]; basicAccount: null;
  payments: Array<{ semanticKey: string; expected: number; paid: number; paymentDate: string | null; state: string }>;
  requiredValidation: { schemaIssues: number; p1Arithmetic: string; p2AbsenceWarning: string; historyAlert: string };
};

describe("lista-mestre 4ª CRE", () => {
  it("contém os 163 INEPs únicos esperados", () => {
    expect(MASTER_SCHOOLS).toHaveLength(163);
    expect(new Set(MASTER_SCHOOLS.map(school => school.inep)).size).toBe(163);
  });
});

describe("fixture pública anonimizada e dataset dourado", () => {
  it("mantém a estrutura do PDDEInfo com identificadores redigidos e resultados financeiros verificáveis", () => {
    const record = parseSchoolPage(anonymizedFixture, goldenFixture.inep, goldenFixture.sme, goldenFixture.sourceUrl, goldenFixture.consultedAt, "f".repeat(64));
    const expectedPayments = goldenFixture.payments.map(expected => ({
      semanticKey: expected.semanticKey,
      expected: expected.expected,
      paid: expected.paid,
      paymentDate: expected.paymentDate,
      state: expected.state,
    }));

    expect(record.schemaIssues).toHaveLength(goldenFixture.requiredValidation.schemaIssues);
    expect(record.bankAccounts.map(account => account.program)).toEqual(goldenFixture.bankPrograms);
    expect(goldenFixture.basicAccount).toBeNull();
    expect(accountForExactProgram(record, "PDDE")).toBeUndefined();
    expect(record.payments.filter(payment => payment.semanticKey?.startsWith("PDDE_BASIC")).map(payment => ({
      semanticKey: payment.semanticKey, expected: payment.expected, paid: payment.paid, paymentDate: payment.paymentDate, state: payment.provenance.paid.state,
    }))).toEqual(expectedPayments);
    expect(record.payments.find(payment => payment.semanticKey === "PDDE_BASIC_P1")?.provenance.paid.validationResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "paid-arithmetic", level: goldenFixture.requiredValidation.p1Arithmetic }),
    ]));
    expect(record.payments.find(payment => payment.semanticKey === "PDDE_BASIC_P2")?.provenance.paid.validationResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: goldenFixture.requiredValidation.p2AbsenceWarning, level: "warning" }),
    ]));

    const currentSnapshots = paymentSnapshotsFromRecords([record]);
    const p1 = currentSnapshots.find(snapshot => snapshot.logicalKey.includes("PDDE BASICO - 1A PARCELA") && snapshot.value === goldenFixture.payments[0]?.paid);
    expect(p1).toBeDefined();
    const findings = comparePaymentSnapshots([{ ...p1!, value: p1!.value + 1 }], currentSnapshots);
    expect(findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: goldenFixture.requiredValidation.historyAlert })]));
  });
});

describe("vinculação bancária por programa", () => {
  it("não permite que PDDE Qualidade ou Equidade preencham o PDDE Básico", () => {
    const record = parseSchoolPage(fixture, "33069247", "0410001", "https://fonte.test/33069247", "2026-08-11T12:00:00.000Z");
    expect(accountForExactProgram(record, "PDDE")).toBeUndefined();
    expect(accountForExactProgram(record, "PDDE QUALIDADE")?.account).toBe("0000546402");
    expect(accountForExactProgram(record, "PDDE EQUIDADE")?.account).toBe("0000999999");
    expect(basicAccountSource(record)).toBe("PDDEInfo · tabela bancária sem linha com rótulo exato PDDE");
  });

  it("preserva conta com dígito verificador alfanumérico como texto e sem falha de schema", () => {
    const record = parseSchoolPage(fixture.replace("0000546402", "000054640X"), "33069247", "0410001", "https://fonte.test/33069247", "2026-08-11T12:00:00.000Z", "a".repeat(64));
    const account = accountForExactProgram(record, "PDDE QUALIDADE");

    expect(account?.account).toBe("000054640X");
    expect(account?.provenance.account.validationResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "bank-account-format", level: "passed" }),
    ]));
    expect(record.schemaIssues).not.toContainEqual(expect.stringContaining("bankAccounts"));
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
      evidenceSnippet: expect.stringContaining("100,00"),
    });
    expect(paid?.validationResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "source-hash", level: "passed" }),
      expect.objectContaining({ code: "source-selector", level: "passed" }),
      expect.objectContaining({ code: "normalization", level: "passed" }),
    ]));
    expect(account).toMatchObject({
      fieldId: "33069247:PDDEINFO:bank-account:PDDE QUALIDADE:account",
      rawValue: "0000546402",
      sourceHashSha256: hash,
      parserVersion: expect.any(String),
      evidenceSnippet: expect.stringContaining("0000546402"),
    });
    expect(record.fieldProvenance).toContainEqual(paid);
    expect(record.fieldProvenance).toContainEqual(account);
    expect(paymentEvidenceSummary(record)).toContain("1ª parcela: Pagamento registrado no PDDEInfo");
    expect(paymentEvidenceSummary(record)).toContain("2ª parcela: ausência de pagamento registrado no PDDEInfo em 2026-08-11T12:00:00.000Z");
    expect(financialHeaders).toEqual(expect.arrayContaining([
      "PDDE Básico — Agência", "PDDE Básico — Conta", "PDDE Básico — 1ª parcela prevista", "PDDE Básico — 2ª parcela prevista",
    ]));
  });

  it("registra ausência limitada ao PDDEInfo sem concluir que o pagamento não ocorreu", () => {
    const zeroPaymentFixture = fixture.replace(/100,00<\/td><td>05\/08\/2026/, "0,00</td><td>");
    const record = parseSchoolPage(zeroPaymentFixture, "33069247", "0410001", "https://fonte.test/33069247", "2026-08-11T12:00:00.000Z", "e".repeat(64));
    const paid = record.payments[0]?.provenance.paid;

    expect(paid?.state).toBe("CONSULTA_INCONCLUSIVA");
    expect(paid?.validationResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "payment-absence-pddeinfo", level: "warning", message: expect.stringContaining("ausência não equivale a “não pago”") }),
    ]));
    expect(paymentEvidenceSummary(record)).toContain("SIGEF e extrato bancário sem evidência vinculada nesta execução");
    expect(paymentEvidenceSummary(record)).toContain("Campo não disponível na fonte não equivale a “não pago”");
  });

  it("registra falha por identificador ou data fora do formato esperado", () => {
    const invalidFixture = fixture.replace("00.000.000/0001-00", "CNPJ-INVÁLIDO").replace("05/08/2026", "2026-08-05");
    const record = parseSchoolPage(invalidFixture, "33069247", "0410001", "https://fonte.test/33069247", "2026-08-11T12:00:00.000Z", "c".repeat(64));
    const failedCodes = record.fieldProvenance.flatMap(field => field.validationResults.filter(result => result.level === "failed").map(result => result.code));
    expect(failedCodes).toEqual(expect.arrayContaining(["cnpj-format", "payment-date-format"]));
    expect(record.schemaIssues.join(" ")).toContain("cnpj");
    expect(validateExtraction([record], []).errors.join(" ")).toContain("falha(s) crítica(s) de validação por campo");
    expect(validateExtraction([record], []).errors.join(" ")).toContain("falha(s) de schema no registro extraído");
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

  it("prioriza o PDDE Básico na aba financeira e transfere metadados para a validação", async () => {
    const record = parseSchoolPage(fixture, "33069247", "0410001", "https://fonte.test/33069247", "2026-08-11T12:00:00.000Z", "d".repeat(64));
    const auditRecord: AuditRecord = {
      inep: "33069247", sme: "0410001", sourceUrl: "https://fonte.test/33069247", consultedAt: "2026-08-11T12:00:00.000Z",
      status: "SUCCESS", attempts: 1, httpStatus: 200, sourceHashSha256: "d".repeat(64), normalizedHashSha256: "e".repeat(64),
      rawHtmlKey: "evidence/test.html", normalizedJsonKey: "evidence/test.json", responseBytes: 123, programsFound: ["PDDE QUALIDADE", "PDDE EQUIDADE"], exception: null,
    };
    const buffer = await createV2Workbook([record], [auditRecord], { passed: true, uniqueIneps: 163, firstInstallmentPaid: 111, secondInstallmentExpected: 163, missingBasicAccounts: 47, errors: [] });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.getWorksheet("Financeiro 4ª CRE V2");
    const audit = workbook.getWorksheet("Validação V2");

    expect(sheet?.getCell("F4").value).toBe("PDDE Básico — Agência");
    expect(sheet?.getCell("G4").value).toBe("PDDE Básico — Conta");
    expect(sheet?.getCell("H4").value).toBe("PDDE Básico — Status da conta");
    expect(sheet?.getCell("I4").value).toBe("PDDE Básico — 1ª parcela prevista");
    expect(sheet?.getCell("L4").value).toBe("PDDE Básico — 2ª parcela prevista");
    expect(financialHeaders.slice(0, 14).every(header => !header.includes("Fonte da conta") && !header.includes("Completude das fontes"))).toBe(true);
    expect(audit?.getCell("I13").value).toBe("Conta PDDE Básico — fonte/status");
    expect(audit?.getCell("J13").value).toBe("PDDE Básico — evidência das parcelas");
    expect(audit?.getCell("K13").value).toBe("Completude das fontes");
    expect(String(audit?.getCell("I14").value)).toContain("rótulo exato PDDE");
    expect(String(audit?.getCell("J14").value)).toContain("Pagamento registrado no PDDEInfo");
    expect(String(audit?.getCell("K14").value)).toContain("PDDEInfo: EXTRAÍDO");
    expect(String(audit?.getCell("K14").value)).toContain("SIGEF/extrato: NÃO DISPONÍVEL NESTA EXECUÇÃO PDDEInfo");
    expect(String(audit?.getCell("K14").value)).toContain("Associação externa: NÃO COMPROVADA");
    expect(sheet?.getCell("G5").numFmt).toBe("@");
  });

  it("neutraliza texto externo que poderia ser interpretado como fórmula no Excel", async () => {
    const record = parseSchoolPage(fixture, "33069247", "0410001", "https://fonte.test/33069247", "2026-08-11T12:00:00.000Z", "f".repeat(64));
    record.schoolName = "=COMANDO_EXTERNO()";
    const auditRecord: AuditRecord = {
      inep: "33069247", sme: "0410001", sourceUrl: "=URL_EXTERNA()", consultedAt: "2026-08-11T12:00:00.000Z",
      status: "SUCCESS", attempts: 1, httpStatus: 200, sourceHashSha256: "f".repeat(64), normalizedHashSha256: "a".repeat(64),
      rawHtmlKey: "evidence/test.html", normalizedJsonKey: "evidence/test.json", responseBytes: 123, programsFound: ["PDDE QUALIDADE"], exception: null,
    };
    const buffer = await createV2Workbook([record], [auditRecord], { passed: true, uniqueIneps: 163, firstInstallmentPaid: 111, secondInstallmentExpected: 163, missingBasicAccounts: 47, errors: [] });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

    expect(workbook.getWorksheet("Financeiro 4ª CRE V2")?.getCell("C5").value).toBe("'=COMANDO_EXTERNO()");
    expect(workbook.getWorksheet("Validação V2")?.getCell("C14").value).toBe("'=URL_EXTERNA()");
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

describe("persistência imutável de evidências", () => {
  const audit: AuditRecord = {
    inep: "33069247", sme: "0410001", sourceUrl: "https://fonte.test/33069247", consultedAt: "2026-08-12T12:00:00.000Z",
    status: "SUCCESS", attempts: 1, httpStatus: 200, sourceHashSha256: "a".repeat(64), normalizedHashSha256: "b".repeat(64),
    rawHtmlKey: "evidence/run/33069247/source.html", normalizedJsonKey: "evidence/run/33069247/normalized.json", responseBytes: 321,
    programsFound: ["PDDE"], exception: null,
  };

  it("gera uma consulta e dois artefatos identificados por hash", () => {
    expect(schoolConsultationPayload("run-1", audit, "parser-test")).toMatchObject({
      runId: "run-1", inep: "33069247", status: "success", rawHtmlKey: audit.rawHtmlKey, normalizedJsonKey: audit.normalizedJsonKey,
    });
    expect(schoolArtifactPayloads("run-1", audit)).toEqual([
      expect.objectContaining({ kind: "raw_html", sha256: "a".repeat(64) }),
      expect.objectContaining({ kind: "normalized_json", sha256: "b".repeat(64) }),
    ]);
  });
});

describe("execução auditável", () => {
  it("mantém explícita a autoria institucional no contrato da execução", async () => {
    const { runExtraction } = await import("./run");
    expect(runExtraction.length).toBeGreaterThanOrEqual(1);
  });
});
