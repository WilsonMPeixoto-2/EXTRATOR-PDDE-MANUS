import * as cheerio from "cheerio";
import { derivePaymentEvidenceState } from "./reconciliation";
import { classifyBankProgram, classifyDestination } from "./semantics";
import { schoolExtractionSchemaIssues } from "./schema";
import type { BankAccount, EvidenceSource, FieldProvenance, FieldState, PaymentLine, SchoolExtraction } from "./types";

export const PDDEINFO_PARSER_VERSION = "2.3.0";
const SOURCE: EvidenceSource = "PDDEINFO";

type SourceMetadata = {
  inep: string;
  sourceUrl: string;
  consultedAt: string;
  sourceHashSha256: string | null;
};

const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
export const normalize = (value: string | null | undefined) =>
  clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ª/g, "A")
    .replace(/º/g, "O")
    .toUpperCase();

export function parseBrazilianCurrency(value: string): number {
  const normalized = clean(value).replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isBrazilianCurrency(value: string): boolean {
  const cleaned = clean(value);
  return /^-?(?:\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{1,2})?$/.test(cleaned);
}

export function parseBrazilianDate(value: string): string | null {
  const match = clean(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function cellSelector(tableIndex: number, rowIndex: number, cellIndex: number) {
  return `table:nth-of-type(${tableIndex + 1}) tr:nth-child(${rowIndex + 1}) > :nth-child(${cellIndex + 1})`;
}

function capture(
  metadata: SourceMetadata,
  sink: FieldProvenance[],
  fieldPath: string,
  rawValue: string | null,
  normalizedValue: string | number | null,
  selector: string,
  extractionRule: string,
  logicalKey = fieldPath,
  state: FieldState | null = null,
): FieldProvenance {
  const provenance: FieldProvenance = {
    fieldId: `${metadata.inep}:${SOURCE}:${logicalKey}`,
    fieldPath,
    logicalKey,
    source: SOURCE,
    sourceUrl: metadata.sourceUrl,
    consultedAt: metadata.consultedAt,
    sourceHashSha256: metadata.sourceHashSha256,
    artifact: null,
    rawValue: rawValue === null ? null : clean(rawValue),
    normalizedValue,
    parserVersion: PDDEINFO_PARSER_VERSION,
    extractionRule,
    selector,
    evidenceSnippet: rawValue === null || clean(rawValue) === "" ? null : `Recorte extraído em ${selector}: ${clean(rawValue).slice(0, 500)}`,
    validationResults: [
      {
        code: "source-hash",
        level: metadata.sourceHashSha256 ? "passed" : "warning",
        message: metadata.sourceHashSha256 ? "Hash SHA-256 da fonte presente." : "Hash da fonte pendente de persistência.",
      },
      {
        code: "source-selector",
        level: selector ? "passed" : "failed",
        message: selector ? "Seletor de origem identificado." : "Seletor de origem ausente.",
      },
      {
        code: "raw-value",
        level: rawValue === null || clean(rawValue) === "" ? "warning" : "passed",
        message: rawValue === null || clean(rawValue) === "" ? "Campo de origem vazio." : "Valor bruto presente.",
      },
      {
        code: "normalization",
        level: normalizedValue === null ? "warning" : "passed",
        message: normalizedValue === null ? "Normalização resultou em valor nulo." : "Normalização concluída.",
      },
    ],
    state,
  };
  sink.push(provenance);
  return provenance;
}

function validate(provenance: FieldProvenance, code: string, passed: boolean, message: string, emptyIsWarning = false) {
  provenance.validationResults.push({
    code,
    level: passed ? "passed" : emptyIsWarning && !provenance.rawValue ? "warning" : "failed",
    message,
  });
}

function readLabelPairs(
  $: cheerio.CheerioAPI,
  table: any,
  tableIndex: number,
  labels: Record<string, (value: string, selector: string) => void>,
) {
  $(table)
    .find("tr")
    .each((rowIndex, row) => {
      const cells = $(row)
        .find("th, td")
        .toArray()
        .map(cell => clean($(cell).text()));
      for (let index = 0; index + 1 < cells.length; index += 2) {
        const label = normalize(cells[index]);
        const value = cells[index + 1];
        for (const [needle, setter] of Object.entries(labels)) {
          if (label.includes(needle)) setter(value, cellSelector(tableIndex, rowIndex, index + 1));
        }
      }
    });
}

function parseBankRows(
  $: cheerio.CheerioAPI,
  table: any,
  tableIndex: number,
  metadata: SourceMetadata,
  sink: FieldProvenance[],
): BankAccount[] {
  const accounts: BankAccount[] = [];
  $(table)
    .find("tr")
    .slice(1)
    .each((rowIndex, row) => {
      const cells = $(row)
        .find("td")
        .toArray()
        .map(cell => clean($(cell).text()));
      if (cells.length < 4 || !cells[0]) return;
      const accountIndex = accounts.length;
      const rowOffset = rowIndex + 1;
      const path = `bankAccounts[${accountIndex}]`;
      const accountKey = `bank-account:${normalize(cells[0])}`;
      const classification = classifyBankProgram(cells[0]);
      const programProvenance = capture(metadata, sink, `${path}.program`, cells[0], cells[0], cellSelector(tableIndex, rowOffset, 0), "bank-account-row", `${accountKey}:program`);
      programProvenance.validationResults.push({
        code: "bank-program-catalog",
        level: classification.status === "known" ? "passed" : "failed",
        message: classification.status === "known" ? `Programa bancário reconhecido: ${classification.key}.` : "Programa bancário não reconhecido pelo catálogo; exportação deve ser bloqueada até revisão.",
      });
      const bankProvenance = capture(metadata, sink, `${path}.bank`, cells[1] ?? "", cells[1] ?? "", cellSelector(tableIndex, rowOffset, 1), "bank-account-row", `${accountKey}:bank`);
      const agencyProvenance = capture(metadata, sink, `${path}.agency`, cells[2] ?? "", cells[2] ?? "", cellSelector(tableIndex, rowOffset, 2), "bank-account-row", `${accountKey}:agency`);
      const accountProvenance = capture(metadata, sink, `${path}.account`, cells[3] ?? "", cells[3] ?? "", cellSelector(tableIndex, rowOffset, 3), "bank-account-row", `${accountKey}:account`);
      validate(agencyProvenance, "bank-agency-format", !agencyProvenance.rawValue || /^\d{1,8}$/.test(agencyProvenance.rawValue), "Agência vazia ou composta apenas por dígitos, preservada como texto.", true);
      validate(accountProvenance, "bank-account-format", !accountProvenance.rawValue || /^\d{1,24}$/.test(accountProvenance.rawValue), "Conta vazia ou composta apenas por dígitos, preservada como texto.", true);
      accounts.push({
        program: cells[0],
        programSemanticKey: classification.key,
        programSemanticStatus: classification.status,
        bank: cells[1] ?? "",
        agency: cells[2] ?? "",
        account: cells[3] ?? "",
        balance: cells[4] ?? "",
        provenance: {
          program: programProvenance,
          bank: bankProvenance,
          agency: agencyProvenance,
          account: accountProvenance,
          balance: capture(metadata, sink, `${path}.balance`, cells[4] ?? "", cells[4] ?? "", cellSelector(tableIndex, rowOffset, 4), "bank-account-row", `${accountKey}:balance`),
        },
      });
    });
  return accounts;
}

function parsePaymentRows(
  $: cheerio.CheerioAPI,
  table: any,
  tableIndex: number,
  metadata: SourceMetadata,
  sink: FieldProvenance[],
): PaymentLine[] {
  const payments: PaymentLine[] = [];
  const headers = $(table).find("tr").first().find("th, td").toArray().map(cell => normalize($(cell).text()));
  const paidCusteioColumn = headers.findIndex(header => header.includes("PAGO CUSTEIO"));
  const paidCapitalColumn = headers.findIndex(header => header.includes("PAGO CAPITAL"));
  $(table)
    .find("tr")
    .slice(1)
    .each((rowIndex, row) => {
      const cells = $(row)
        .find("td")
        .toArray()
        .map(cell => clean($(cell).text()));
      const destination = cells[0] ?? "";
      const destinationNormalized = normalize(destination);
      if (cells.length < 11 || !destination || destinationNormalized.includes("SUBTOTAL") || destinationNormalized.includes("TOTAL GERAL")) return;
      const paymentIndex = payments.length;
      const rowOffset = rowIndex + 1;
      const path = `payments[${paymentIndex}]`;
      const paymentKey = `payment:${normalize(destination)}`;
      const expectedRaw = cells[7] ?? "0";
      const paidRaw = cells[10] ?? "0";
      const paymentDateRaw = cells[11] ?? "";
      const expected = parseBrazilianCurrency(expectedRaw);
      const paid = parseBrazilianCurrency(paidRaw);
      const paymentDate = parseBrazilianDate(paymentDateRaw);
      const paidCusteioRaw = paidCusteioColumn >= 0 ? cells[paidCusteioColumn] ?? "" : "";
      const paidCapitalRaw = paidCapitalColumn >= 0 ? cells[paidCapitalColumn] ?? "" : "";
      const paidCusteio = paidCusteioColumn >= 0 ? parseBrazilianCurrency(paidCusteioRaw) : null;
      const paidCapital = paidCapitalColumn >= 0 ? parseBrazilianCurrency(paidCapitalRaw) : null;
      const classification = classifyDestination(destination);
      const semanticMessage = classification.status === "known"
        ? `Destinação reconhecida no catálogo: ${classification.key}.`
        : classification.status === "unknown"
          ? "Destinação não reconhecida pelo catálogo; exportação deve ser bloqueada até revisão."
          : `Destinação ambígua no catálogo: ${classification.candidates.join(", ")}.`;
      const arithmeticMessage = paidCusteio !== null && paidCapital !== null
        ? Math.abs(paid - (paidCusteio + paidCapital)) < 0.005
          ? "Valor pago total confere com custeio mais capital."
          : "Valor pago total diverge de custeio mais capital."
        : "Componentes de custeio/capital não informados na tabela de origem.";
      const destinationProvenance = capture(metadata, sink, `${path}.destination`, destination, destination, cellSelector(tableIndex, rowOffset, 0), "payment-destination-row", `${paymentKey}:destination`);
      destinationProvenance.validationResults.push({
        code: "destination-catalog",
        level: classification.status === "known" ? "passed" : "failed",
        message: semanticMessage,
      });
      const expectedProvenance = capture(metadata, sink, `${path}.expected`, expectedRaw, expected, cellSelector(tableIndex, rowOffset, 7), "brl-currency", `${paymentKey}:expected`);
      validate(expectedProvenance, "expected-currency-format", isBrazilianCurrency(expectedRaw), "Valor previsto possui formato monetário brasileiro válido.");
      const paidProvenance = capture(
        metadata, sink, `${path}.paid`, paidRaw, paid, cellSelector(tableIndex, rowOffset, 10), "brl-currency", `${paymentKey}:paid`,
        derivePaymentEvidenceState({ pddeInfoPaymentRegistered: paid > 0, sigefLiberationMatched: false, sigefCreditMatched: false, directBankStatementConfirmed: false, reversalMatched: false, divergent: false, allRequiredSourcesCompleted: false }),
      );
      validate(paidProvenance, "paid-currency-format", isBrazilianCurrency(paidRaw), "Valor pago possui formato monetário brasileiro válido.");
      const paymentDateProvenance = capture(metadata, sink, `${path}.paymentDate`, paymentDateRaw, paymentDate, cellSelector(tableIndex, rowOffset, 11), "br-date-to-iso", `${paymentKey}:payment-date`);
      validate(paymentDateProvenance, "payment-date-format", !paymentDateRaw || paymentDate !== null, "Data de pagamento vazia ou no formato DD/MM/AAAA.", true);
      payments.push({
        destination,
        semanticKey: classification.key,
        semanticStatus: classification.status,
        expected,
        paid,
        paidCusteio,
        paidCapital,
        paymentDate,
        provenance: {
          destination: destinationProvenance,
          expected: expectedProvenance,
          paid: paidProvenance,
          paidCusteio: paidCusteioColumn >= 0 ? capture(metadata, sink, `${path}.paidCusteio`, paidCusteioRaw, paidCusteio, cellSelector(tableIndex, rowOffset, paidCusteioColumn), "brl-currency", `${paymentKey}:paid-custeio`) : null,
          paidCapital: paidCapitalColumn >= 0 ? capture(metadata, sink, `${path}.paidCapital`, paidCapitalRaw, paidCapital, cellSelector(tableIndex, rowOffset, paidCapitalColumn), "brl-currency", `${paymentKey}:paid-capital`) : null,
          paymentDate: paymentDateProvenance,
        },
      });
      if (paidProvenance) paidProvenance.validationResults.push({
        code: "paid-arithmetic",
        level: paidCusteio !== null && paidCapital !== null && Math.abs(paid - (paidCusteio + paidCapital)) >= 0.005 ? "failed" : "passed",
        message: arithmeticMessage,
      });
    });
  return payments;
}

export function parseSchoolPage(
  html: string,
  inep: string,
  sme: string,
  sourceUrl: string,
  consultedAt: string,
  sourceHashSha256: string | null = null,
): SchoolExtraction {
  const $ = cheerio.load(html);
  const metadata: SourceMetadata = { inep, sourceUrl, consultedAt, sourceHashSha256 };
  const fieldProvenance: FieldProvenance[] = [];
  let schoolName = "";
  let uex = "";
  let cnpj = "";
  const bankAccounts: BankAccount[] = [];
  const payments: PaymentLine[] = [];

  $("table").each((tableIndex, table) => {
    const tableText = normalize($(table).text());
    if (tableText.includes("COD. ESCOLA:")) {
      readLabelPairs($, table, tableIndex, {
        "COD. ESCOLA:": (value, selector) => {
          const provenance = capture(metadata, fieldProvenance, "inep", value, value, selector, "label-pair:COD. ESCOLA");
          validate(provenance, "inep-request-match", value === inep && /^\d{8}$/.test(value), "INEP da fonte possui oito dígitos e corresponde ao INEP consultado.");
        },
        "NOME ESCOLA:": (value, selector) => {
          schoolName = value;
          capture(metadata, fieldProvenance, "schoolName", value, value, selector, "label-pair:NOME ESCOLA");
        },
      });
    }
    if (tableText.includes("EXECUTORA:")) {
      readLabelPairs($, table, tableIndex, {
        "EXECUTORA:": (value, selector) => {
          uex = value;
          capture(metadata, fieldProvenance, "uex", value, value, selector, "label-pair:EXECUTORA");
        },
        "CNPJ:": (value, selector) => {
          cnpj = value;
          const provenance = capture(metadata, fieldProvenance, "cnpj", value, value, selector, "label-pair:CNPJ");
          validate(provenance, "cnpj-format", /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value), "CNPJ está no formato 00.000.000/0000-00.");
        },
      });
    }
    if (tableText.includes("PROGRAMA/ACAO") && tableText.includes("AGENCIA") && tableText.includes("CONTA")) {
      bankAccounts.push(...parseBankRows($, table, tableIndex, metadata, fieldProvenance));
    }
    if (tableText.includes("DESTINACAO") && tableText.includes("VL FINAL DEVIDO TOTAL")) {
      payments.push(...parsePaymentRows($, table, tableIndex, metadata, fieldProvenance));
    }
  });

  const record: SchoolExtraction = {
    inep,
    sme,
    sourceUrl,
    consultedAt,
    schoolName,
    uex,
    cnpj,
    bankAccounts,
    payments,
    semanticIssues: [
      ...payments.filter(payment => payment.semanticStatus !== "known").map(payment => `Destinação ${payment.semanticStatus}: ${payment.destination}`),
      ...bankAccounts.filter(account => account.programSemanticStatus !== "known").map(account => `Programa bancário unknown: ${account.program}`),
    ],
    schemaIssues: [],
    rawPrograms: bankAccounts.map(account => account.program),
    fieldProvenance,
  };
  record.schemaIssues = schoolExtractionSchemaIssues(record);
  return record;
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
