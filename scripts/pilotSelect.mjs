import ExcelJS from "exceljs";

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile("/home/ubuntu/upload/PDDEInfo_4a_CRE_2026_Visao_Financeira_V2.xlsx");

const worksheet = workbook.getWorksheet("Financeiro 4ª CRE V2");
if (!worksheet) throw new Error("A aba Financeiro 4ª CRE V2 não foi encontrada.");

const candidates = [];
for (let rowNumber = 5; rowNumber <= worksheet.rowCount; rowNumber += 1) {
  const row = worksheet.getRow(rowNumber);
  const inep = String(row.getCell(1).text || "").replace(/\D/g, "");
  const sme = String(row.getCell(2).text || "").trim();
  const school = String(row.getCell(3).text || "").trim();
  const cnpj = String(row.getCell(5).text || "").replace(/\D/g, "");
  const agency = String(row.getCell(6).text || "").trim();
  const account = String(row.getCell(7).text || "").trim();
  const payment = String(row.getCell(11).text || "").trim();
  const paymentDate = String(row.getCell(12).text || "").trim();
  if (inep.length !== 8 || cnpj.length !== 14) continue;
  candidates.push({ inep, sme, school, cnpj, payment, paymentDate, accountPresent: Boolean(agency && account) });
}

console.log(JSON.stringify({
  totalValidCandidates: candidates.length,
  missingAccountWithPayment: candidates.filter(candidate => !candidate.accountPresent && candidate.payment && candidate.payment !== "0").slice(0, 3),
  accountWithPayment: candidates.filter(candidate => candidate.accountPresent && candidate.payment && candidate.payment !== "0").slice(0, 2),
  noPayment: candidates.filter(candidate => !candidate.payment || candidate.payment === "0").slice(0, 1),
}, null, 2));
