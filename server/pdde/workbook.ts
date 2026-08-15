import ExcelJS from "exceljs";
import { accountForExactProgram } from "./parser";
import type { DestinationSemanticKey } from "./semantics";
import type { AuditRecord, FieldState, SchoolExtraction, ValidationSummary } from "./types";
import type { HistoricalFinding } from "./history";
import { neutralizeSpreadsheetText } from "./money";

const title = "4ª CRE • VISÃO FINANCEIRA POR UNIDADE ESCOLAR • PDDEINFO 2026 • VERSÃO 2";
const missingAccountNote =
  "Auditoria direta por INEP: o PDDEInfo não apresentou agência/conta para o programa PDDE. Campos de agência e conta mantidos vazios, sem uso de dados antigos ou inferências.";

/**
 * A aba principal é uma base de análise. Metadados, origem e explicações
 * detalhadas ficam concentrados na aba obrigatória "Validação V2".
 */
export const financialHeaders = [
  "Código INEP", "Código SME", "Unidade Escolar", "UEx", "CNPJ UEx",
  "PDDE Básico — Agência", "PDDE Básico — Conta", "PDDE Básico — Status da conta",
  "PDDE Básico — 1ª parcela prevista", "PDDE Básico — 1ª parcela: pagamento registrado", "PDDE Básico — 1ª parcela: data da ordem",
  "PDDE Básico — 2ª parcela prevista", "PDDE Básico — 2ª parcela: pagamento registrado", "PDDE Básico — 2ª parcela: data da ordem",
  "PDDE Qualidade — Agência", "PDDE Qualidade — Conta", "PDDE Equidade — Agência", "PDDE Equidade — Conta", "Educação Integral — Agência", "Educação Integral — Conta",
  "Primeira Infância P1 — Previsto", "Primeira Infância P1 — Pagamento registrado", "Primeira Infância P1 — Data da ordem",
  "Primeira Infância P2 — Previsto", "Primeira Infância P2 — Pagamento registrado", "Primeira Infância P2 — Data da ordem",
  "Educação Conectada 2026 — Previsto", "Educação Conectada 2026 — Pagamento registrado", "Educação Conectada 2026 — Data da ordem",
  "Escola e Comunidade 2026 — Previsto", "Escola e Comunidade 2026 — Pagamento registrado", "Escola e Comunidade 2026 — Data da ordem",
  "Escola das Adolescências 2026 — Previsto", "Escola das Adolescências 2026 — Pagamento registrado", "Escola das Adolescências 2026 — Data da ordem",
  "Cantinho da Leitura 2026 — Previsto", "Cantinho da Leitura 2026 — Pagamento registrado", "Cantinho da Leitura 2026 — Data da ordem",
  "PDDE SRM 2026 — Previsto", "PDDE SRM 2026 — Pagamento registrado", "PDDE SRM 2026 — Data da ordem",
];

const currencyColumns = [9, 10, 12, 13, 21, 22, 24, 25, 27, 28, 30, 31, 33, 34, 36, 37, 39, 40];
const dateColumns = [11, 14, 23, 26, 29, 32, 35, 38, 41];
const textAccountColumns = [1, 2, 5, 6, 7, 15, 16, 17, 18, 19, 20];

const evidenceStateLabels: Record<FieldState, string> = {
  PAGAMENTO_INFORMADO_PDDEINFO: "Pagamento registrado no PDDEInfo",
  OB_CORROBORADA_CREDITO_NAO_LOCALIZADO: "OB corroborada; crédito não localizado",
  CREDITO_LOCALIZADO_SIGEF: "Crédito localizado no SIGEF",
  CREDITO_CONFIRMADO_EXTRATO_BB: "Crédito confirmado em extrato BB",
  CREDITO_ESTORNADO_OU_DEVOLVIDO: "Crédito estornado ou devolvido",
  SEM_PAGAMENTO_REGISTRADO_ATE_CONSULTA: "Sem pagamento registrado até a consulta",
  DIVERGENCIA_ENTRE_FONTES: "Divergência entre fontes",
  CONSULTA_INCONCLUSIVA: "Consulta inconclusiva para crédito bancário",
  REVISAO_NECESSARIA: "Revisão necessária",
};

function asDate(value: string | null): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function paymentContaining(record: SchoolExtraction, semanticKey: DestinationSemanticKey) {
  return record.payments.find(payment => payment.semanticKey === semanticKey);
}

function paymentValues(record: SchoolExtraction, semanticKey: DestinationSemanticKey): [number, number, Date | null] {
  const payment = paymentContaining(record, semanticKey);
  return [payment?.expected ?? 0, payment?.paid ?? 0, asDate(payment?.paymentDate ?? null)];
}

export function paymentEvidenceSummary(record: SchoolExtraction): string {
  const installments: Array<[string, DestinationSemanticKey]> = [["1ª parcela", "PDDE_BASIC_P1"], ["2ª parcela", "PDDE_BASIC_P2"]];
  return installments.map(([label, semanticKey]) => {
    const payment = paymentContaining(record, semanticKey);
    if (!payment || payment.paid <= 0) {
      return `${label}: ausência de pagamento registrado no PDDEInfo em ${record.consultedAt}; SIGEF e extrato bancário sem evidência vinculada nesta execução. Campo não disponível na fonte não equivale a “não pago”.`;
    }
    const state = payment.provenance.paid.state ?? "CONSULTA_INCONCLUSIVA";
    return `${label}: ${evidenceStateLabels[state]} · PDDEInfo consultado em ${record.consultedAt}`;
  }).join(" | ");
}

export function basicAccountSource(record: SchoolExtraction): string {
  const basic = accountForExactProgram(record, "PDDE");
  return basic?.agency || basic?.account
    ? "PDDEInfo · linha de dados bancários com rótulo exato PDDE"
    : "PDDEInfo · tabela bancária sem linha com rótulo exato PDDE";
}

export function sourceCompletenessSummary(record: SchoolExtraction): string {
  const externalEvidenceRegistered = record.payments.some(payment => [
    "CREDITO_LOCALIZADO_SIGEF",
    "CREDITO_CONFIRMADO_EXTRATO_BB",
    "OB_CORROBORADA_CREDITO_NAO_LOCALIZADO",
  ].includes(payment.provenance.paid.state ?? ""));
  return [
    `PDDEInfo: EXTRAÍDO (${record.fieldProvenance.length} campo(s) com proveniência)`,
    "SIGEF/extrato: NÃO DISPONÍVEL NESTA EXECUÇÃO PDDEInfo",
    externalEvidenceRegistered ? "Associação externa: COM EVIDÊNCIA REGISTRADA" : "Associação externa: NÃO COMPROVADA",
  ].join(" | ");
}

function buildRow(record: SchoolExtraction) {
  const basic = accountForExactProgram(record, "PDDE");
  const quality = accountForExactProgram(record, "PDDE QUALIDADE");
  const equity = accountForExactProgram(record, "PDDE EQUIDADE");
  const integral = accountForExactProgram(record, "PDDE-EDUCAÇÃO INTEGRAL");
  const first = paymentValues(record, "PDDE_BASIC_P1");
  const second = paymentValues(record, "PDDE_BASIC_P2");
  const firstChildhood = paymentValues(record, "PRIMEIRA_INFANCIA_P1");
  const secondChildhood = paymentValues(record, "PRIMEIRA_INFANCIA_P2");
  const connected = paymentValues(record, "EDUCACAO_CONECTADA_2026");
  const community = paymentValues(record, "ESCOLA_E_COMUNIDADE_2026");
  const adolescence = paymentValues(record, "ESCOLA_DAS_ADOLESCENCIAS_2026");
  const reading = paymentValues(record, "CANTINHO_DA_LEITURA_2026");
  const srm = paymentValues(record, "PDDE_SRM_2026");
  const missingBasic = !basic?.agency && !basic?.account;

  return [
    record.inep, record.sme, record.schoolName, record.uex, record.cnpj,
    basic?.agency ?? "", basic?.account ?? "", missingBasic ? "Não informada pelo PDDEInfo" : "Informada pelo PDDEInfo",
    ...first, ...second,
    quality?.agency ?? "", quality?.account ?? "", equity?.agency ?? "", equity?.account ?? "", integral?.agency ?? "", integral?.account ?? "",
    ...firstChildhood, ...secondChildhood, ...connected, ...community, ...adolescence, ...reading, ...srm,
  ];
}

function spreadsheetSafeRow(values: ExcelJS.CellValue[]): ExcelJS.CellValue[] {
  return values.map(value => typeof value === "string" ? neutralizeSpreadsheetText(value) : value);
}

export function validateExtraction(records: SchoolExtraction[], audits: AuditRecord[], historicalFindings: HistoricalFinding[] = []): ValidationSummary {
  const errors: string[] = [];
  const uniqueIneps = new Set(records.map(record => record.inep)).size;
  const firstInstallmentPaid = records.filter(record => (paymentContaining(record, "PDDE_BASIC_P1")?.paid ?? 0) > 0).length;
  const secondInstallmentExpected = records.filter(record => {
    const basicSecond = paymentContaining(record, "PDDE_BASIC_P2")?.expected ?? 0;
    const earlyChildhoodSecond = paymentContaining(record, "PRIMEIRA_INFANCIA_P2")?.expected ?? 0;
    return basicSecond > 0 || earlyChildhoodSecond > 0;
  }).length;
  const missingBasicAccounts = records.filter(record => {
    const basic = accountForExactProgram(record, "PDDE");
    return !basic?.agency && !basic?.account;
  }).length;

  if (records.length !== 163) errors.push(`Cobertura inválida: ${records.length} escolas processadas; esperado 163.`);
  if (uniqueIneps !== 163) errors.push(`Unicidade inválida: ${uniqueIneps} INEPs únicos; esperado 163.`);
  if (audits.some(audit => audit.status === "FAILED")) errors.push("Há consultas com falha definitiva registradas na auditoria.");
  if (firstInstallmentPaid !== 111) errors.push(`1ª parcela com pagamento registrado no PDDEInfo em ${firstInstallmentPaid} escolas; esperado 111.`);
  if (secondInstallmentExpected !== 163) errors.push(`2ª parcela prevista em ${secondInstallmentExpected} escolas; esperado 163.`);
  if (missingBasicAccounts !== 47) errors.push(`Conta PDDE Básico não informada em ${missingBasicAccounts} escolas; esperado 47.`);
  const semanticIssues = records.flatMap(record => record.semanticIssues);
  if (semanticIssues.length > 0) errors.push(`Há ${semanticIssues.length} destinação(ões) desconhecida(s) ou ambígua(s); a exportação foi bloqueada.`);
  const fieldValidationErrors = records.flatMap(record => record.fieldProvenance
    .flatMap(field => field.validationResults.filter(result => result.level === "failed").map(result => `${record.inep} · ${field.fieldPath} · ${result.code}: ${result.message}`)));
  if (fieldValidationErrors.length > 0) errors.push(`Há ${fieldValidationErrors.length} falha(s) crítica(s) de validação por campo; a exportação foi bloqueada.`);
  const schemaIssues = records.flatMap(record => record.schemaIssues.map(issue => `${record.inep} · ${issue}`));
  if (schemaIssues.length > 0) errors.push(`Há ${schemaIssues.length} falha(s) de schema no registro extraído; a exportação foi bloqueada.`);
  const criticalHistory = historicalFindings.filter(finding => finding.severity === "critical");
  if (criticalHistory.length > 0) errors.push(`Há ${criticalHistory.length} perda(s) aparente(s) de pagamento em relação à última baseline aprovada; a exportação foi bloqueada.`);

  return { passed: errors.length === 0, uniqueIneps, firstInstallmentPaid, secondInstallmentExpected, missingBasicAccounts, semanticIssues, fieldValidationErrors, schemaIssues, historicalFindings, errors };
}

/** A URL do arquivo só pode ser entregue quando todos os controles estiverem aprovados. */
export function canReleaseDownload(validation: ValidationSummary): boolean {
  return validation.passed;
}

function styleHeader(cell: ExcelJS.Cell, color: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
  cell.font = { name: "Aptos", bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}

export async function createV2Workbook(records: SchoolExtraction[], audits: AuditRecord[], validation: ValidationSummary): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Extrator Financeiro PDDEInfo — 4ª CRE";
  workbook.created = new Date();
  workbook.properties.date1904 = false;

  const sheet = workbook.addWorksheet("Financeiro 4ª CRE V2", { views: [{ state: "frozen", xSplit: 8, ySplit: 4 }] });
  sheet.mergeCells(1, 1, 1, financialHeaders.length);
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E3B43" } };
  sheet.getCell("A1").font = { name: "Aptos Display", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").alignment = { vertical: "middle" };
  sheet.getRow(1).height = 28;
  sheet.mergeCells(2, 1, 2, financialHeaders.length);
  sheet.getCell("A2").value = "Base para análise por unidade, programa e parcela. PDDE Básico é o rótulo bancário exato “PDDE”; não se confunde com PDDE Qualidade ou PDDE Equidade. “Pagamento registrado” não confirma crédito bancário. Metadados e proveniência detalhada estão em “Validação V2”.";
  sheet.getCell("A2").font = { name: "Aptos", italic: true, color: { argb: "FF5D4037" } };
  sheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF4D6" } };
  sheet.getCell("A2").alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(2).height = 30;

  const groups = [
    [1, 5, "IDENTIFICAÇÃO DA UNIDADE", "FF315A67"],
    [6, 14, "PDDE BÁSICO • CONTA E PARCELAS", "FF9A6B35"],
    [15, 20, "OUTRAS CONTAS BANCÁRIAS", "FF5B506B"],
    [21, 38, "OUTROS PROGRAMAS E AÇÕES 2026", "FF3F6B64"],
  ];
  groups.forEach(([start, end, label, color]) => {
    sheet.mergeCells(3, start as number, 3, end as number);
    const cell = sheet.getCell(3, start as number);
    cell.value = label as string;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color as string } };
    cell.font = { name: "Aptos", bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  sheet.getRow(3).height = 20;
  financialHeaders.forEach((header, index) => {
    const cell = sheet.getCell(4, index + 1);
    cell.value = header;
    styleHeader(cell, "FF164E63");
  });
  sheet.getRow(4).height = 46;
  sheet.autoFilter = { from: "A4", to: sheet.getCell(4, financialHeaders.length).address };

  records.forEach((record, index) => {
    const row = sheet.getRow(index + 5);
    row.values = spreadsheetSafeRow(buildRow(record));
    row.height = 28;
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: "Aptos", size: 9, color: { argb: "FF18323A" } };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: "FFD6E2E6" } } };
      if (index % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6FAFA" } };
    });
  });
  currencyColumns.forEach(column => { sheet.getColumn(column).numFmt = "R$ #,##0.00"; });
  dateColumns.forEach(column => { sheet.getColumn(column).numFmt = "dd/mm/yyyy"; });
  textAccountColumns.forEach(column => { sheet.getColumn(column).numFmt = "@"; });
  [1, 2, 3, 4, 5, 6, 7, 8, 15, 16, 17, 18, 19, 20].forEach(column => (sheet.getColumn(column).alignment = { horizontal: "left", vertical: "top" }));
  [12, 12, 34, 30, 20, 14, 18, 28, 18, 22, 16, 18, 22, 16, 14, 18, 14, 18, 14, 18, 18, 22, 16, 18, 22, 16, 18, 22, 16, 18, 22, 16, 18, 22, 16, 18, 22, 16].forEach((width, index) => (sheet.getColumn(index + 1).width = width));

  const audit = workbook.addWorksheet("Validação V2", { views: [{ state: "frozen", ySplit: 12 }] });
  audit.mergeCells("A1:H1");
  audit.getCell("A1").value = "VALIDAÇÃO DA VERSÃO 2 • 4ª CRE • PDDEINFO 2026";
  audit.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E3B43" } };
  audit.getCell("A1").font = { name: "Aptos Display", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  audit.getCell("A1").alignment = { vertical: "middle" };
  audit.getRow(1).height = 28;
  const indicators: [string, string | number][] = [
    ["Resultado das validações bloqueantes", validation.passed ? "APROVADO" : "BLOQUEADO"],
    ["Total de unidades da 4ª CRE", records.length], ["INEPs únicos", validation.uniqueIneps], ["Conta PDDE não informada pelo PDDEInfo", validation.missingBasicAccounts],
    ["1ª parcela PDDE Básico com pagamento registrado no PDDEInfo", validation.firstInstallmentPaid], ["2ª parcela PDDE Básico prevista", validation.secondInstallmentExpected], ["Consultas com erro", audits.filter(item => item.status === "FAILED").length],
    ["Semântica financeira", "Pagamento registrado no PDDEInfo; não confirma crédito bancário."],
  ];
  audit.getCell("A3").value = "Indicador";
  audit.getCell("B3").value = "Resultado";
  styleHeader(audit.getCell("A3"), "FF164E63");
  styleHeader(audit.getCell("B3"), "FF164E63");
  indicators.forEach(([label, result], index) => {
    audit.getCell(index + 4, 1).value = neutralizeSpreadsheetText(label);
    audit.getCell(index + 4, 2).value = typeof result === "string" ? neutralizeSpreadsheetText(result) : result;
  });
  audit.getCell("B4").font = { name: "Aptos", bold: true, color: { argb: validation.passed ? "FF176B50" : "FF9D3030" } };
  audit.getCell("A12").value = "METADADOS, PROVENIÊNCIA E AUDITORIA POR UNIDADE";
  audit.getCell("A12").font = { name: "Aptos", bold: true, color: { argb: "FF0E3B43" } };
  const recordsByInep = new Map(records.map(record => [record.inep, record]));
  const auditHeaders = ["Código SME", "Código INEP", "URL consultada", "Data/hora da consulta", "Status", "Tentativas", "Programas bancários encontrados", "Exceção registrada", "Conta PDDE Básico — fonte/status", "PDDE Básico — evidência das parcelas", "Completude das fontes"];
  auditHeaders.forEach((header, index) => { audit.getCell(13, index + 1).value = header; styleHeader(audit.getCell(13, index + 1), "FF9A6B35"); });
  audits.forEach((record, index) => {
    const row = audit.getRow(index + 14);
    const extracted = recordsByInep.get(record.inep);
    const missingBasic = extracted ? !accountForExactProgram(extracted, "PDDE")?.agency && !accountForExactProgram(extracted, "PDDE")?.account : false;
    row.values = spreadsheetSafeRow([record.sme, record.inep, record.sourceUrl, record.consultedAt ?? "", record.status, record.attempts, record.programsFound.join(" | "), record.exception ?? "", extracted ? `${basicAccountSource(extracted)} · ${missingBasic ? "Não informada pelo PDDEInfo" : "Informada pelo PDDEInfo"}` : "Sem registro financeiro extraído", extracted ? paymentEvidenceSummary(extracted) : "Sem registro financeiro extraído", extracted ? sourceCompletenessSummary(extracted) : "Sem registro financeiro extraído"]);
    row.alignment = { vertical: "top", wrapText: true };
    if (record.status === "FAILED") row.getCell(5).font = { color: { argb: "FFB42318" }, bold: true };
  });
  audit.autoFilter = { from: "A13", to: "K13" };
  [14, 14, 70, 24, 14, 12, 42, 42, 42, 62, 62].forEach((width, index) => (audit.getColumn(index + 1).width = width));
  audit.getColumn(4).numFmt = "dd/mm/yyyy hh:mm";

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
