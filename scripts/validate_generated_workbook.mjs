import ExcelJS from "exceljs";

const filePath = process.argv[2];
if (!filePath) throw new Error("Informe o caminho do arquivo XLSX a validar.");

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(filePath);
const financeiro = workbook.getWorksheet("Financeiro 4ª CRE V2");
const validacao = workbook.getWorksheet("Validação V2");

const result = {
  sheets: workbook.worksheets.map(sheet => sheet.name),
  financialRows: financeiro?.rowCount ?? 0,
  financialHeader: financeiro?.getCell("A4").value ?? null,
  basicAccountHeader: financeiro?.getCell("F4").value ?? null,
  basicP1Header: financeiro?.getCell("I4").value ?? null,
  basicP2Header: financeiro?.getCell("L4").value ?? null,
  financialTitle: financeiro?.getCell("A1").value ?? null,
  firstInep: financeiro?.getCell("A5").value ?? null,
  firstBasicAccountType: financeiro?.getCell("G5").type ?? null,
  validationTitle: validacao?.getCell("A1").value ?? null,
  validationStatus: validacao?.getCell("B4").value ?? null,
  auditHeader: validacao?.getCell("A13").value ?? null,
  auditMetadataHeader: validacao?.getCell("I13").value ?? null,
  auditRows: validacao ? Math.max(0, validacao.rowCount - 13) : 0,
};

const expectedSheets = ["Financeiro 4ª CRE V2", "Validação V2"];
if (JSON.stringify(result.sheets) !== JSON.stringify(expectedSheets)) throw new Error(`Abas inválidas: ${result.sheets.join(", ")}`);
if (result.financialRows !== 167) throw new Error(`Quantidade de linhas da aba financeira inválida: ${result.financialRows}`);
if (result.financialHeader !== "Código INEP") throw new Error("Cabeçalho da planilha financeira inválido.");
if (result.basicAccountHeader !== "PDDE Básico — Agência" || result.basicP1Header !== "PDDE Básico — 1ª parcela prevista" || result.basicP2Header !== "PDDE Básico — 2ª parcela prevista") throw new Error("O PDDE Básico não está explícito na sequência analítica da planilha.");
if (result.validationStatus !== "APROVADO") throw new Error("A planilha não contém um resultado de validação aprovado.");
if (result.auditHeader !== "Código SME" || result.auditRows !== 163) throw new Error("A trilha de auditoria não contém 163 registros.");
if (result.auditMetadataHeader !== "Conta PDDE Básico — fonte/status") throw new Error("Metadados da conta PDDE Básico não estão na aba de validação.");

console.log(JSON.stringify(result, null, 2));
