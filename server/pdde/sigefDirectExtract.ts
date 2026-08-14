import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { assertSourceCollectionPermitted } from "./collectionRunners";
import type { BankAccount, FieldState, PaymentLine, SchoolExtraction } from "./types";

export const SIGEF_DIRECT_EXTRACT_PARSER_VERSION = "SIGEF_DIRECT_EXTRACT_HTTP_V1";
export const SIGEF_DIRECT_EXTRACT_ENDPOINT = "https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento";
export const SIGEF_DIRECT_EXTRACT_SPREADSHEET_ENDPOINT = "https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/visualizaexcel";
export const SIGEF_PROGRAM_PDDE_BASIC = "02";
export const FNDE_CNPJ = "00378257000181";
export const SIGEF_CREDIT_MAX_LAG_DAYS = 45;

const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
const normalize = (value: string | null | undefined) => clean(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^A-Z0-9]+/gi, " ")
  .trim()
  .toUpperCase();
const digits = (value: string | null | undefined) => String(value ?? "").replace(/\D/g, "");

function nullableValue(value: string | undefined) {
  const trimmed = clean(value);
  return trimmed && trimmed !== "-" ? trimmed : undefined;
}

export function parseSigefDirectExtractCurrency(value: string | undefined): number | null {
  const normalized = clean(value);
  if (!normalized || normalized === "-") return 0;
  const parsed = Number(normalized.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseSigefDirectExtractDate(value: string | undefined): string | null {
  const match = clean(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

export function sigefBankCode(value: string): string | null {
  const explicit = clean(value).match(/\b(001|104)\b/);
  if (explicit) return explicit[1]!;
  const normalized = normalize(value);
  if (normalized.includes("BANCO DO BRASIL")) return "001";
  if (normalized.includes("CAIXA")) return "104";
  return null;
}

export type SigefDirectExtractUrlInput = {
  bank: string;
  agency: string;
  account: string;
  cnpj: string;
  program: string;
  period: string;
};

/** Normaliza somente o formato da rota: não tenta descobrir conta, código de programa ou banco. */
export function normalizeSigefDirectExtractQuery(input: SigefDirectExtractUrlInput): SigefDirectExtractUrlInput {
  const bank = digits(input.bank).padStart(3, "0");
  const agency = digits(input.agency).padStart(4, "0");
  const account = clean(input.account).replace(/[^\dA-Za-z]/g, "").toUpperCase().padStart(10, "0");
  const cnpj = digits(input.cnpj);
  const program = clean(input.program).toUpperCase();
  const period = clean(input.period);
  if (!/^\d{3}$/.test(bank)) throw new Error("Código bancário SIGEF inválido.");
  if (!/^\d{4}$/.test(agency)) throw new Error("Agência SIGEF inválida.");
  if (!/^(?:\d{10}|\d{9}[A-Z])$/.test(account)) throw new Error("Conta SIGEF inválida para o piloto Banco do Brasil.");
  if (!/^\d{14}$/.test(cnpj)) throw new Error("CNPJ SIGEF inválido.");
  if (program !== SIGEF_PROGRAM_PDDE_BASIC) throw new Error("O piloto SIGEF de extrato aceita apenas o programa 02 do PDDE Básico.");
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error("Período SIGEF deve ser YYYY-MM.");
  return { bank, agency, account, cnpj, program, period };
}

/** Constrói somente a rota pública de detalhamento já comprovada para o piloto de PDDE Básico. */
export function sigefDirectExtractUrl(input: SigefDirectExtractUrlInput): string {
  const { bank, agency, account, cnpj, program, period } = normalizeSigefDirectExtractQuery(input);
  const [year, month] = period.split("-");
  return `${SIGEF_DIRECT_EXTRACT_ENDPOINT}/banco/${bank}/agencia/${agency}/contacorrente/${account}/cnpj/${cnpj}/programa/${program}/data/${month}${year}`;
}

/** Rota pública de planilha emitida pelo próprio SIGEF para a mesma identidade bancária e programa. */
export function sigefDirectExtractSpreadsheetUrl(input: SigefDirectExtractUrlInput): string {
  const { bank, agency, account, cnpj, program, period } = normalizeSigefDirectExtractQuery(input);
  const [year, month] = period.split("-");
  return `${SIGEF_DIRECT_EXTRACT_SPREADSHEET_ENDPOINT}/banco/${bank}/agencia/${agency}/contacorrente/${account}/cnpj/${cnpj}/programa/${program}/data/${month}${year}`;
}

export type SigefDirectExtractHeader = {
  cnpj: string | null;
  accountHolderName: string | null;
  bank: string | null;
  bankCode: string | null;
  agency: string | null;
  account: string | null;
  program: string | null;
  programCode: string | null;
  period: string | null;
};

export type SigefDirectExtractTransaction = {
  date: string;
  credit: number;
  debit: number;
  document: string;
  historic: string;
  beneficiaryCnpj?: string;
  beneficiaryName?: string;
  beneficiaryBank?: string;
  beneficiaryAgency?: string;
  beneficiaryAccount?: string;
  selector: string;
  deduplicationKey: string;
};

type SigefDirectExtractTransactionInput = Omit<SigefDirectExtractTransaction, "deduplicationKey">;

export type SigefDirectExtractDuplicateRow = {
  deduplicationKey: string;
  retainedSelector: string;
  duplicateSelector: string;
};

export type SigefDirectExtractParsed = {
  header: SigefDirectExtractHeader;
  transactions: SigefDirectExtractTransaction[];
  rawTransactionRows: number;
  duplicateRows: SigefDirectExtractDuplicateRow[];
  reportedTotal: number | null;
  ignoredRows: number;
};

/**
 * Identifica uma linha de extrato sem usar índice ou seletor HTML. A chave é auxiliar:
 * não substitui a resposta bruta, o hash da fonte nem a evidência navegável da linha.
 */
export function sigefDirectExtractMovementDeduplicationKey(
  header: SigefDirectExtractHeader,
  transaction: SigefDirectExtractTransactionInput | SigefDirectExtractTransaction,
): string {
  const direction = transaction.credit > 0 ? "CREDIT" : transaction.debit > 0 ? "DEBIT" : "ZERO";
  const amountInCents = Math.round((transaction.credit > 0 ? transaction.credit : transaction.debit) * 100);
  const canonicalAccount = clean(header.account).replace(/[^\dA-Za-z]/g, "").toUpperCase();
  const identity = [
    "SIGEF_MOVEMENT_V1",
    digits(header.cnpj),
    header.bankCode ?? normalize(header.bank),
    digits(header.agency),
    canonicalAccount,
    header.programCode ?? normalize(header.program),
    transaction.date,
    direction,
    String(amountInCents),
    digits(transaction.document) || normalize(transaction.document),
    normalize(transaction.historic),
  ].join("|");
  return createHash("sha256").update(identity, "utf8").digest("hex");
}

function deduplicateSigefDirectExtractTransactions(
  header: SigefDirectExtractHeader,
  input: SigefDirectExtractTransactionInput[],
): { transactions: SigefDirectExtractTransaction[]; duplicateRows: SigefDirectExtractDuplicateRow[] } {
  const transactions: SigefDirectExtractTransaction[] = [];
  const retainedByKey = new Map<string, SigefDirectExtractTransaction>();
  const duplicateRows: SigefDirectExtractDuplicateRow[] = [];
  for (const row of input) {
    const deduplicationKey = sigefDirectExtractMovementDeduplicationKey(header, row);
    const transaction = { ...row, deduplicationKey };
    const retained = retainedByKey.get(deduplicationKey);
    if (retained) {
      duplicateRows.push({ deduplicationKey, retainedSelector: retained.selector, duplicateSelector: transaction.selector });
      continue;
    }
    retainedByKey.set(deduplicationKey, transaction);
    transactions.push(transaction);
  }
  return { transactions, duplicateRows };
}

function headerValue(text: string, label: string, nextLabel: string): string | null {
  const expression = new RegExp(`${label}:\\s*(.*?)\\s+${nextLabel}:`, "i");
  return nullableValue(text.match(expression)?.[1]) ?? null;
}

/** Lê cabeçalho e linhas financeiras do detalhamento público sem supor saldo, parcela ou programa adicional. */
export function parseSigefDirectExtractHtml(html: string): SigefDirectExtractParsed {
  const $ = cheerio.load(html);
  const text = clean($("body").text() || $.root().text());
  const cnpj = nullableValue(text.match(/CNPJ:\s*([\d./-]+)/i)?.[1]) ?? null;
  const bank = headerValue(text, "Banco", "Ag[êe]ncia");
  const agency = headerValue(text, "Ag[êe]ncia", "Conta Corrente");
  const account = headerValue(text, "Conta Corrente", "Programa");
  const program = headerValue(text, "Programa", "M[êe]s/Ano In[ií]cio");
  const period = nullableValue(text.match(/M[êe]s\/Ano In[ií]cio:\s*(\d{2}\/\d{4})/i)?.[1]) ?? null;
  const accountHolderName = headerValue(text, "Raz[ãa]o Social", "Banco");
  const rawTransactions: SigefDirectExtractTransactionInput[] = [];
  let ignoredRows = 0;

  $("tr").each((rowIndex, tr) => {
    const cells = $(tr).children("td").map((_, cell) => clean($(cell).text())).get();
    if (cells.length < 10) return;
    const date = parseSigefDirectExtractDate(cells[0]);
    const credit = parseSigefDirectExtractCurrency(cells[1]);
    const debit = parseSigefDirectExtractCurrency(cells[2]);
    if (!date || credit === null || debit === null || !cells[3] || !cells[4]) {
      ignoredRows += 1;
      return;
    }
    rawTransactions.push({
      date,
      credit,
      debit,
      document: cells[3],
      historic: cells[4],
      beneficiaryCnpj: nullableValue(cells[5]),
      beneficiaryName: nullableValue(cells[6]),
      beneficiaryBank: nullableValue(cells[7]),
      beneficiaryAgency: nullableValue(cells[8]),
      beneficiaryAccount: nullableValue(cells[9]),
      selector: `tr:nth-of-type(${rowIndex + 1})`,
    });
  });
  const header: SigefDirectExtractHeader = {
    cnpj,
    accountHolderName,
    bank,
    bankCode: bank ? sigefBankCode(bank) : null,
    agency,
    account,
    program,
    programCode: program?.match(/^\s*([A-Z0-9]{2})\b/i)?.[1]?.toUpperCase() ?? null,
    period,
  };
  const { transactions, duplicateRows } = deduplicateSigefDirectExtractTransactions(header, rawTransactions);
  const reportedTotal = Number(text.match(/Exibindo de\s+\d+\s+at[ée]\s+\d+\s+de\s+(\d+)/i)?.[1]);
  return {
    header,
    transactions,
    rawTransactionRows: rawTransactions.length,
    duplicateRows,
    reportedTotal: Number.isFinite(reportedTotal) ? reportedTotal : null,
    ignoredRows,
  };
}

/**
 * A rota visualizaexcel entrega HTML ISO-8859-1 com extensão .xls e não repete todos
 * os rótulos de identidade. O cabeçalho da página de detalhamento já validada é usado
 * somente pelo parser; o artefato bruto da planilha permanece inalterado.
 */
export function parseSigefDirectExtractSpreadsheetHtml(html: string, header: SigefDirectExtractHeader): SigefDirectExtractParsed {
  const identity = `<section>CNPJ: ${header.cnpj ?? ""} Razão Social: ${header.accountHolderName ?? ""} Banco: ${header.bank ?? ""} Agência: ${header.agency ?? ""} Conta Corrente: ${header.account ?? ""} Programa: ${header.program ?? ""} Mês/Ano Início: ${header.period ?? ""}</section>`;
  return parseSigefDirectExtractHtml(`${identity}${html}`);
}

export type SigefDirectExtractCollection = SigefDirectExtractParsed & {
  sourceUrl: string;
  consultedAt: string;
  httpStatus: number;
  attempts: number;
  sourceHashSha256: string;
  rawHtml: string;
  query: SigefDirectExtractUrlInput;
};

export type SigefDirectExtractFullCollection = SigefDirectExtractCollection & {
  coverageComplete: boolean;
  coverageExpectedRows: number;
  coverageBasis: "reported-total" | "detail-row-count";
  detailPage: {
    sourceUrl: string;
    sourceHashSha256: string;
    rawHtml: string;
    returnedRows: number;
    reportedTotal: number | null;
  };
};

export type SigefDirectExtractFetch = (url: string, init?: RequestInit) => Promise<Response>;

export async function collectSigefDirectExtract(
  query: SigefDirectExtractUrlInput,
  dependencies: { fetcher?: SigefDirectExtractFetch; now?: () => Date; pause?: (milliseconds: number) => Promise<void> } = {},
): Promise<SigefDirectExtractCollection> {
  const plan = assertSourceCollectionPermitted("SIGEF_EXTRATO");
  const fetcher = dependencies.fetcher ?? fetch;
  const now = dependencies.now ?? (() => new Date());
  const pause = dependencies.pause ?? (milliseconds => new Promise<void>(resolve => setTimeout(resolve, milliseconds)));
  const normalizedQuery = normalizeSigefDirectExtractQuery(query);
  const sourceUrl = sigefDirectExtractUrl(normalizedQuery);
  let lastError = "";
  for (let attempt = 1; attempt <= plan.maxAttempts; attempt += 1) {
    try {
      const response = await fetcher(sourceUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; 4CRE-PDDEInfo-Extractor/SIGEF-Extract-1.0)", Accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) throw new Error(`Detalhamento SIGEF retornou HTTP ${response.status}`);
      const rawHtml = Buffer.from(await response.arrayBuffer()).toString("latin1");
      if (/recaptcha|captcha/i.test(rawHtml)) throw new Error("Detalhamento SIGEF apresentou desafio CAPTCHA; a coleta foi interrompida sem tentativa de contorno.");
      return {
        sourceUrl,
        consultedAt: now().toISOString(),
        httpStatus: response.status,
        attempts: attempt,
        sourceHashSha256: createHash("sha256").update(rawHtml, "latin1").digest("hex"),
        rawHtml,
        query: normalizedQuery,
        ...parseSigefDirectExtractHtml(rawHtml),
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Falha desconhecida no detalhamento SIGEF";
      if (attempt < plan.maxAttempts) await pause(plan.retryBackoffMs * attempt);
    }
  }
  throw new Error(lastError);
}

/**
 * Recupera o detalhamento para validar identidade e, em seguida, a planilha pública
 * integral. Se a exportação não corresponder ao total declarado, a resposta é mantida,
 * mas marcada como incompleta para impedir conciliação financeira.
 */
export async function collectSigefDirectExtractFull(
  query: SigefDirectExtractUrlInput,
  dependencies: { fetcher?: SigefDirectExtractFetch; now?: () => Date; pause?: (milliseconds: number) => Promise<void> } = {},
): Promise<SigefDirectExtractFullCollection> {
  const detail = await collectSigefDirectExtract(query, dependencies);
  const coverageExpectedRows = detail.reportedTotal ?? detail.rawTransactionRows;
  const coverageBasis = detail.reportedTotal === null ? "detail-row-count" as const : "reported-total" as const;
  const plan = assertSourceCollectionPermitted("SIGEF_EXTRATO");
  const fetcher = dependencies.fetcher ?? fetch;
  const pause = dependencies.pause ?? (milliseconds => new Promise<void>(resolve => setTimeout(resolve, milliseconds)));
  const sourceUrl = sigefDirectExtractSpreadsheetUrl(detail.query);
  let lastError = "";
  for (let attempt = 1; attempt <= plan.maxAttempts; attempt += 1) {
    try {
      const response = await fetcher(sourceUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; 4CRE-PDDEInfo-Extractor/SIGEF-Extract-1.0)", Accept: "application/download,application/vnd.ms-excel,text/html" },
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) throw new Error(`Planilha integral SIGEF retornou HTTP ${response.status}`);
      const rawHtml = Buffer.from(await response.arrayBuffer()).toString("latin1");
      if (/recaptcha|captcha/i.test(rawHtml)) throw new Error("Planilha integral SIGEF apresentou desafio CAPTCHA; a coleta foi interrompida sem tentativa de contorno.");
      const parsed = parseSigefDirectExtractSpreadsheetHtml(rawHtml, detail.header);
      return {
        sourceUrl,
        consultedAt: detail.consultedAt,
        httpStatus: response.status,
        attempts: detail.attempts + attempt,
        sourceHashSha256: createHash("sha256").update(rawHtml, "latin1").digest("hex"),
        rawHtml,
        query: detail.query,
        ...parsed,
        header: detail.header,
        reportedTotal: detail.reportedTotal,
        coverageComplete: parsed.rawTransactionRows === coverageExpectedRows,
        coverageExpectedRows,
        coverageBasis,
        detailPage: {
          sourceUrl: detail.sourceUrl,
          sourceHashSha256: detail.sourceHashSha256,
          rawHtml: detail.rawHtml,
          returnedRows: detail.rawTransactionRows,
          reportedTotal: detail.reportedTotal,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Falha desconhecida na planilha integral SIGEF";
      if (attempt < plan.maxAttempts) await pause(plan.retryBackoffMs * attempt);
    }
  }
  throw new Error(lastError);
}

export type SigefDirectExtractTarget = {
  record: SchoolExtraction;
  account: BankAccount;
  bankCode: "001";
};

/** Apenas contas explicitamente rotuladas como PDDE no PDDEInfo e pertencentes ao Banco do Brasil entram no piloto. */
export function selectSigefDirectExtractTargets(records: SchoolExtraction[], limit = 5): SigefDirectExtractTarget[] {
  return records.flatMap(record => {
    const account = record.bankAccounts.find(candidate => normalize(candidate.program) === "PDDE");
    const bankCode = account ? sigefBankCode(account.bank) : null;
    const hasEligiblePayment = record.payments.some(payment => payment.semanticKey?.startsWith("PDDE_BASIC_P") && payment.paid > 0 && payment.paymentDate);
    if (!account || bankCode !== "001" || !record.cnpj || !account.agency || !account.account || !hasEligiblePayment) return [];
    return [{ record, account, bankCode: "001" as const }];
  }).slice(0, limit);
}

export type SigefDirectExtractPaymentMatch = {
  payment: PaymentLine;
  transaction: SigefDirectExtractTransaction | null;
  matched: boolean;
  divergent: boolean;
  state: FieldState;
  divergenceFields: Array<"cnpj" | "program" | "bank" | "agency" | "account">;
  message: string;
};

function daysBetween(start: string, end: string): number {
  return Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}

/**
 * Localiza crédito FNDE no extrato apenas quando o cabeçalho confirma a mesma conta PDDE
 * e um crédito por OB fecha o valor, após a data da ordem registrada no PDDEInfo.
 */
export function matchSigefDirectExtractCredits(target: SigefDirectExtractTarget, collection: SigefDirectExtractCollection): SigefDirectExtractPaymentMatch[] {
  const { record, account, bankCode } = target;
  const header = collection.header;
  const divergenceFields: SigefDirectExtractPaymentMatch["divergenceFields"] = [
    ...(digits(header.cnpj) !== digits(record.cnpj) ? ["cnpj" as const] : []),
    ...(header.programCode !== SIGEF_PROGRAM_PDDE_BASIC ? ["program" as const] : []),
    ...(header.bankCode !== bankCode ? ["bank" as const] : []),
    ...(normalize(header.agency) !== normalize(account.agency) ? ["agency" as const] : []),
    ...(normalize(header.account) !== normalize(account.account) ? ["account" as const] : []),
  ];
  const payments = record.payments
    .filter(payment => payment.semanticKey?.startsWith("PDDE_BASIC_P") && payment.paid > 0 && payment.paymentDate)
    .sort((left, right) => String(left.paymentDate).localeCompare(String(right.paymentDate)));
  if (divergenceFields.length > 0) {
    return payments.map(payment => ({
      payment,
      transaction: null,
      matched: false,
      divergent: true,
      state: "DIVERGENCIA_ENTRE_FONTES",
      divergenceFields,
      message: `O cabeçalho do extrato SIGEF diverge do PDDEInfo em: ${divergenceFields.join(", ")}; associação bloqueada.`,
    }));
  }

  const coverageComplete = !("coverageComplete" in collection) || collection.coverageComplete;
  const coverageExpectedRows = "coverageExpectedRows" in collection ? collection.coverageExpectedRows : collection.reportedTotal;
  const partialPage = collection.reportedTotal !== null && collection.reportedTotal > collection.transactions.length;
  if (partialPage || !coverageComplete) {
    return payments.map(payment => ({
      payment,
      transaction: null,
      matched: false,
      divergent: false,
      state: "CONSULTA_INCONCLUSIVA" as const,
      divergenceFields: [],
      message: !coverageComplete
        ? `A planilha SIGEF retornou ${collection.rawTransactionRows} de ${coverageExpectedRows} movimentações esperadas; o crédito não foi conciliado por cobertura incompleta.`
        : `A página SIGEF retornou ${collection.transactions.length} de ${collection.reportedTotal} movimentações declaradas; o crédito não foi conciliado a partir de resultado parcial.`,
    }));
  }

  const availableCredits = collection.transactions.filter(transaction =>
    transaction.credit > 0
    && normalize(transaction.historic).includes("ORDEM BANCARIA")
    && digits(transaction.beneficiaryCnpj) === FNDE_CNPJ,
  );
  const usedDocuments = new Set<string>();
  return payments.map(payment => {
    const transaction = availableCredits
      .filter(candidate => candidate.credit === payment.paid && !usedDocuments.has(candidate.document))
      .filter(candidate => payment.paymentDate && daysBetween(payment.paymentDate, candidate.date) >= 0 && daysBetween(payment.paymentDate, candidate.date) <= SIGEF_CREDIT_MAX_LAG_DAYS)
      .sort((left, right) => daysBetween(payment.paymentDate!, left.date) - daysBetween(payment.paymentDate!, right.date))[0] ?? null;
    if (transaction) {
      usedDocuments.add(transaction.document);
      return {
        payment,
        transaction,
        matched: true,
        divergent: false,
        state: "CREDITO_LOCALIZADO_SIGEF" as const,
        divergenceFields: [],
        message: "Crédito por ordem bancária do FNDE localizado no extrato SIGEF para a mesma conta PDDE, programa 02 e valor registrado no PDDEInfo.",
      };
    }
    return {
      payment,
      transaction: null,
      matched: false,
      divergent: false,
      state: "CONSULTA_INCONCLUSIVA" as const,
      divergenceFields: [],
      message: "O extrato SIGEF foi consultado, mas não trouxe crédito FNDE compatível dentro da janela controlada; nenhuma ausência de crédito foi inferida.",
    };
  });
}
