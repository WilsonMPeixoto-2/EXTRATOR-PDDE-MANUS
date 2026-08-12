import ExcelJS from "exceljs";
import { accountForExactProgram } from "./parser";
import type { DestinationSemanticKey } from "./semantics";
import type { AuditRecord, FieldState, SchoolExtraction, ValidationSummary } from "./types";
import type { HistoricalFinding } from "./history";

const title = "4ª CRE • VISÃO FINANCEIRA POR UNIDADE ESCOLAR • PDDEINFO 2026 • VERSÃO 2";
const missingAccountNote =
  "Auditoria direta por INEP: o PDDEInfo não apresentou agência/conta para o programa PDDE. Campos de agência e conta mantidos vazios, sem uso de dados antigos ou inferências.";

export const financialHeaders = [
  "Código INEP", "Código SME", "Unidade Escolar", "UEx", "CNPJ UEx", "Agência PDDE", "Conta PDDE", "Fonte da conta", "Status conta PDDE", "Observação da validação", "Estado de evidência",
  "Previsto 1ª Parcela", "Pagamento registrado no PDDEInfo — 1ª Parcela", "Data da ordem registrada — 1ª Parcela", "Previsto 2ª Parcela", "Pagamento registrado no PDDEInfo — 2ª Parcela", "Data da ordem registrada — 2ª Parcela",
  "Previsto Primeira Infância P1", "Pagamento registrado no PDDEInfo — Primeira Infância P1", "Data da ordem registrada — Primeira Infância P1", "Agência PDDE Qualidade", "Conta PDDE Qualidade",
  "Previsto Educação Conectada 2026", "Pagamento registrado no PDDEInfo — Educação Conectada 2026", "Data da ordem registrada — Educação Conectada 2026", "Previsto Escola e Comunidade 2026", "Pagamento registrado no PDDEInfo — Escola e Comunidade 2026", "Data da ordem registrada — Escola e Comunidade 2026",
  "Previsto Escola das Adolescências 2026", "Pagamento registrado no PDDEInfo — Escola das Adolescências 2026", "Data da ordem registrada — Escola das Adolescências 2026", "Previsto Cantinho da Leitura 2026", "Pagamento registrado no PDDEInfo — Cantinho da Leitura 2026", "Data da ordem registrada — Cantinho da Leitura 2026",
  "Agência PDDE Equidade", "Conta PDDE Equidade", "Previsto PDDE SRM 2026", "Pagamento registrado no PDDEInfo — PDDE SRM 2026", "Data da ordem registrada — PDDE SRM 2026", "Agência Educação Integral", "Conta Educação Integral",
];

const currencyColumns = [12, 13, 15, 16, 18, 19, 23, 24, 26, 27, 29, 30, 32, 33, 37, 38];
const dateColumns = [14, 17, 20, 25, 28, 31, 34, 39];
const textAccountColumns = [1, 2, 5, 6, 7, 8, 21, 22, 35, 36, 40, 41];

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
      return `${label}: ausência de pagamento registrado no PDDEInfo em ${record.consultedAt}; SIGEF e extrato bancário não concluídos nesta execução.`;
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

function buildRow(record: SchoolExtraction) {
  const basic = accountForExactProgram(record, "PDDE");
  const quality = accountForExactProgram(record, "PDDE QUALIDADE");
  const equity = accountForExactProgram(record, "PDDE EQUIDADE");
  const integral = accountForExactProgram(record, "PDDE-EDUCAÇÃO INTEGRAL");
  const first = paymentValues(record, "PDDE_BASIC_P1");
  const second = paymentValues(record, "PDDE_BASIC_P2");
  const firstChildhood = paymentValues(record, "PRIMEIRA_INFANCIA_P1");
  const connected = paymentValues(record, "EDUCACAO_CONECTADA_2026");
  const community = paymentValues(record, "ESCOLA_E_COMUNIDADE_2026");
  const adolescence = paymentValues(record, "ESCOLA_DAS_ADOLESCENCIAS_2026");
  const reading = paymentValues(record, "CANTINHO_DA_LEITURA_2026");
  const srm = paymentValues(record, "PDDE_SRM_2026");
  const missingBasic = !basic?.agency && !basic?.account;

  return [
    record.inep, record.sme, record.schoolName, record.uex, record.cnpj,
    basic?.agency ?? "", basic?.account ?? "", basicAccountSource(record), missingBasic ? "NÃO INFORMADA PELO PDDEINFO" : "Informada pelo PDDEInfo", missingBasic ? missingAccountNote : "", paymentEvidenceSummary(record),
    ...first, ...second, ...firstChildhood,
    quality?.agency ?? "", quality?.account ?? "", ...connected, ...community, ...adolescence, ...reading,
    equity?.agency ?? "", equity?.account ?? "", ...srm, integral?.agency ?? "", integral?.account ?? "",
  ];
}

export function validateExtraction(records: SchoolExtraction[], audits: AuditRecord[], historicalFindings: HistoricalFinding[] = []): ValidationSummary {
  const errors: string[] = [];
  const uniqueIneps = new Set(records.map(record => record.inep)).size;
  const firstInstallmentPaid = records.filter(record => (paymentContaining(record, "PDDE_BASIC_P1")?.paid ?? 0) > 0).length;
  const secondInstallmentExpected = records.filter(record => (paymentContaining(record, "PDDE_BASIC_P2")?.expected ?? 0) > 0).length;
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

  const sheet = workbook.addWorksheet("Financeiro 4ª CRE V2", { views: [{ state: "frozen", xSplit: 10, ySplit: 4 }] });
  sheet.mergeCells(1, 1, 1, 41);
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E3B43" } };
  sheet.getCell("A1").font = { name: "Aptos Display", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").alignment = { vertical: "middle" };
  sheet.getRow(1).height = 28;
  sheet.mergeCells(2, 1, 2, 41);
  sheet.getCell("A2").value = "Dados extraídos por consulta individual ao PDDEInfo. “Pagamento registrado” não confirma crédito bancário. Contas de PDDE Básico só são preenchidas quando o rótulo bancário é exatamente PDDE.";
  sheet.getCell("A2").font = { name: "Aptos", italic: true, color: { argb: "FF5D4037" } };
  sheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF4D6" } };
  sheet.getCell("A2").alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(2).height = 30;

  const groups = [
    [1, 5, "IDENTIFICAÇÃO DA UNIDADE", "FF315A67"], [6, 11, "PDDE • CONTA, VALIDAÇÃO E EVIDÊNCIA", "FF9A6B35"], [12, 20, "PDDE • REPASSES", "FF6F4E37"],
    [21, 34, "PDDE QUALIDADE • CONTA E AÇÕES 2026", "FF3F6B64"], [35, 39, "PDDE EQUIDADE • CONTA E REPASSE", "FF5B506B"], [40, 41, "PDDE EDUCAÇÃO INTEGRAL • CONTA", "FF426D8A"],
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
  sheet.autoFilter = { from: "A4", to: "AO4" };

  records.forEach((record, index) => {
    const row = sheet.getRow(index + 5);
    row.values = buildRow(record);
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
  [1, 2, 6, 7, 8, 21, 22, 35, 36, 40, 41].forEach(column => (sheet.getColumn(column).alignment = { horizontal: "left", vertical: "top" }));
  [12, 18, 22, 34, 46, 50, 34, 34, 20, 34, 44, 24, 28, 14, 24, 28, 14, 24, 28, 14, 24, 28, 24, 28, 14, 24, 28, 14, 24, 28, 14, 24, 28, 14, 24, 28, 24, 28, 14, 24, 28].forEach((width, index) => (sheet.getColumn(index + 1).width = width));

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
    audit.getCell(index + 4, 1).value = label;
    audit.getCell(index + 4, 2).value = result;
  });
  audit.getCell("B4").font = { name: "Aptos", bold: true, color: { argb: validation.passed ? "FF176B50" : "FF9D3030" } };
  audit.getCell("A12").value = "AUDITORIA POR UNIDADE";
  audit.getCell("A12").font = { name: "Aptos", bold: true, color: { argb: "FF0E3B43" } };
  const auditHeaders = ["Código SME", "Código INEP", "URL consultada", "Data/hora da consulta", "Status", "Tentativas", "Programas bancários encontrados", "Exceção registrada"];
  auditHeaders.forEach((header, index) => { audit.getCell(13, index + 1).value = header; styleHeader(audit.getCell(13, index + 1), "FF9A6B35"); });
  audits.forEach((record, index) => {
    const row = audit.getRow(index + 14);
    row.values = [record.sme, record.inep, record.sourceUrl, record.consultedAt ?? "", record.status, record.attempts, record.programsFound.join(" | "), record.exception ?? ""];
    row.alignment = { vertical: "top", wrapText: true };
    if (record.status === "FAILED") row.getCell(5).font = { color: { argb: "FFB42318" }, bold: true };
  });
  audit.autoFilter = { from: "A13", to: "H13" };
  [14, 14, 70, 24, 14, 12, 42, 42].forEach((width, index) => (audit.getColumn(index + 1).width = width));
  audit.getColumn(4).numFmt = "dd/mm/yyyy hh:mm";

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
