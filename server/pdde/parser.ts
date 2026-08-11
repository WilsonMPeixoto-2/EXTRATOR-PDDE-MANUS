import * as cheerio from "cheerio";
import type { BankAccount, PaymentLine, SchoolExtraction } from "./types";

const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
export const normalize = (value: string | null | undefined) =>
  clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

export function parseBrazilianCurrency(value: string): number {
  const normalized = clean(value).replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseBrazilianDate(value: string): string | null {
  const match = clean(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function readLabelPairs($: cheerio.CheerioAPI, table: any, labels: Record<string, (value: string) => void>) {
  $(table)
    .find("tr")
    .each((_, row) => {
      const cells = $(row)
        .find("th, td")
        .toArray()
        .map(cell => clean($(cell).text()));
      for (let index = 0; index + 1 < cells.length; index += 2) {
        const label = normalize(cells[index]);
        const value = cells[index + 1];
        for (const [needle, setter] of Object.entries(labels)) {
          if (label.includes(needle)) setter(value);
        }
      }
    });
}

function parseBankRows($: cheerio.CheerioAPI, table: any): BankAccount[] {
  const accounts: BankAccount[] = [];
  $(table)
    .find("tr")
    .slice(1)
    .each((_, row) => {
      const cells = $(row)
        .find("td")
        .toArray()
        .map(cell => clean($(cell).text()));
      if (cells.length < 4 || !cells[0]) return;
      accounts.push({
        program: cells[0],
        bank: cells[1] ?? "",
        agency: cells[2] ?? "",
        account: cells[3] ?? "",
        balance: cells[4] ?? "",
      });
    });
  return accounts;
}

function parsePaymentRows($: cheerio.CheerioAPI, table: any): PaymentLine[] {
  const payments: PaymentLine[] = [];
  $(table)
    .find("tr")
    .slice(1)
    .each((_, row) => {
      const cells = $(row)
        .find("td")
        .toArray()
        .map(cell => clean($(cell).text()));
      const destination = cells[0] ?? "";
      const destinationNormalized = normalize(destination);
      if (cells.length < 11 || !destination || destinationNormalized.includes("SUBTOTAL") || destinationNormalized.includes("TOTAL GERAL")) return;
      payments.push({
        destination,
        expected: parseBrazilianCurrency(cells[7] ?? "0"),
        paid: parseBrazilianCurrency(cells[10] ?? "0"),
        paymentDate: parseBrazilianDate(cells[11] ?? ""),
      });
    });
  return payments;
}

export function parseSchoolPage(html: string, inep: string, sme: string, sourceUrl: string, consultedAt: string): SchoolExtraction {
  const $ = cheerio.load(html);
  let schoolName = "";
  let uex = "";
  let cnpj = "";
  const bankAccounts: BankAccount[] = [];
  const payments: PaymentLine[] = [];

  $("table").each((_, table) => {
    const tableText = normalize($(table).text());
    if (tableText.includes("COD. ESCOLA:")) {
      readLabelPairs($, table, {
        "NOME ESCOLA:": value => (schoolName = value),
      });
    }
    if (tableText.includes("EXECUTORA:")) {
      readLabelPairs($, table, {
        "EXECUTORA:": value => (uex = value),
        "CNPJ:": value => (cnpj = value),
      });
    }
    if (tableText.includes("PROGRAMA/ACAO") && tableText.includes("AGENCIA") && tableText.includes("CONTA")) {
      bankAccounts.push(...parseBankRows($, table));
    }
    if (tableText.includes("DESTINACAO") && tableText.includes("VL FINAL DEVIDO TOTAL")) {
      payments.push(...parsePaymentRows($, table));
    }
  });

  return {
    inep,
    sme,
    sourceUrl,
    consultedAt,
    schoolName,
    uex,
    cnpj,
    bankAccounts,
    payments,
    rawPrograms: bankAccounts.map(account => account.program),
  };
}

/**
 * The comparison below is deliberately exact after harmless text normalization.
 * It prevents a PDDE QUALIDADE or PDDE EQUIDADE account from populating PDDE Básico.
 */
export function accountForExactProgram(record: SchoolExtraction, expectedProgram: string): BankAccount | undefined {
  const target = normalize(expectedProgram);
  return record.bankAccounts.find(account => normalize(account.program) === target);
}

export function paymentForDestination(record: SchoolExtraction, expectedDestination: string): PaymentLine | undefined {
  const target = normalize(expectedDestination);
  return record.payments.find(payment => normalize(payment.destination) === target);
}
