import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { assertSourceCollectionPermitted } from "./collectionRunners";
import { derivePaymentEvidenceState } from "./reconciliation";
import type { FieldState, PaymentLine } from "./types";

export const SIGEF_LEGACY_LIBERATION_PARSER_VERSION = "SIGEF_LEGACY_LIBERATION_V1";
export const SIGEF_LEGACY_LIBERATION_ENDPOINT = "https://www.fnde.gov.br/pls/simad/internet_fnde.liberacoes_result_pc";

const MONTHS: Record<string, string> = {
  JAN: "01", FEV: "02", MAR: "03", ABR: "04", MAI: "05", JUN: "06",
  JUL: "07", AGO: "08", SET: "09", OUT: "10", NOV: "11", DEZ: "12",
};

const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
const normalize = (value: string | null | undefined) => clean(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/ª/g, "A")
  .replace(/º/g, "O")
  .replace(/[^A-Z0-9]+/gi, " ")
  .trim()
  .toUpperCase();
const digits = (value: string | null | undefined) => String(value ?? "").replace(/\D/g, "");

export type SigefLegacyLiberationRow = {
  paymentDate: string;
  bankOrder: string;
  amount: number;
  program: string;
  bank: string;
  agency: string;
  account: string;
  selector: string;
};

export type SigefLegacyLiberationCollection = {
  sourceUrl: string;
  consultedAt: string;
  httpStatus: number;
  attempts: number;
  sourceHashSha256: string;
  rawHtml: string;
  rows: SigefLegacyLiberationRow[];
};

export type SigefLegacyFetch = (url: string, init?: RequestInit) => Promise<Response>;

export function sigefLegacyLiberationUrl(cnpj: string, exercise: number) {
  const query = new URLSearchParams({
    p_ano: String(exercise),
    p_programa: "02",
    p_uf: "RJ",
    p_municipio: "330455",
    p_tp_entidade: "",
    p_cgc: digits(cnpj),
  });
  return `${SIGEF_LEGACY_LIBERATION_ENDPOINT}?${query.toString()}`;
}

export function parseSigefLegacyDate(value: string): string | null {
  const match = clean(value).toUpperCase().match(/^(\d{2})\/([A-Z]{3})\/(\d{4})$/);
  if (!match || !MONTHS[match[2]]) return null;
  return `${match[3]}-${MONTHS[match[2]]}-${match[1]}`;
}

export function parseSigefLegacyCurrency(value: string): number | null {
  const parsed = Number(clean(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Lê somente as linhas financeiras explicitamente apresentadas no detalhe público do SIGEF legado. */
export function parseSigefLegacyLiberationHtml(html: string): SigefLegacyLiberationRow[] {
  const $ = cheerio.load(html);
  const rows: SigefLegacyLiberationRow[] = [];
  $("tr").each((rowIndex, tr) => {
    const cells = $(tr).children("td").map((_, cell) => clean($(cell).text())).get();
    if (cells.length !== 7) return;
    const paymentDate = parseSigefLegacyDate(cells[0]);
    const amount = parseSigefLegacyCurrency(cells[2]);
    if (!paymentDate || amount === null || !cells[1] || !cells[3]) return;
    rows.push({
      paymentDate,
      bankOrder: cells[1],
      amount,
      program: cells[3],
      bank: cells[4],
      agency: cells[5],
      account: cells[6],
      selector: `tr:nth-of-type(${rowIndex + 1})`,
    });
  });
  return rows;
}

export async function collectSigefLegacyLiberation(input: {
  cnpj: string;
  exercise: number;
}, dependencies: { fetcher?: SigefLegacyFetch; now?: () => Date; pause?: (milliseconds: number) => Promise<void> } = {}): Promise<SigefLegacyLiberationCollection> {
  const plan = assertSourceCollectionPermitted("SIGEF_LIBERACAO");
  const fetcher = dependencies.fetcher ?? fetch;
  const now = dependencies.now ?? (() => new Date());
  const pause = dependencies.pause ?? (milliseconds => new Promise<void>(resolve => setTimeout(resolve, milliseconds)));
  const sourceUrl = sigefLegacyLiberationUrl(input.cnpj, input.exercise);
  let lastError = "";

  for (let attempt = 1; attempt <= plan.maxAttempts; attempt += 1) {
    try {
      const response = await fetcher(sourceUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; 4CRE-PDDEInfo-Extractor/SIGEF-Legacy-1.0)", Accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) throw new Error(`SIGEF legado retornou HTTP ${response.status}`);
      const rawHtml = Buffer.from(await response.arrayBuffer()).toString("latin1");
      if (/recaptcha|captcha/i.test(rawHtml)) throw new Error("SIGEF legado apresentou desafio CAPTCHA; a coleta foi interrompida sem tentativa de contorno.");
      return {
        sourceUrl,
        consultedAt: now().toISOString(),
        httpStatus: response.status,
        attempts: attempt,
        sourceHashSha256: createHash("sha256").update(rawHtml, "latin1").digest("hex"),
        rawHtml,
        rows: parseSigefLegacyLiberationHtml(rawHtml),
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Falha desconhecida no SIGEF legado";
      if (attempt < plan.maxAttempts) await pause(plan.retryBackoffMs * attempt);
    }
  }
  throw new Error(lastError);
}

export type SigefLegacyLiberationMatch = {
  matched: boolean;
  divergent: boolean;
  state: FieldState;
  row: SigefLegacyLiberationRow | null;
  divergenceFields: Array<"amount" | "bankOrder" | "bank" | "agency" | "account">;
  message: string;
};

/**
 * Concilia somente pagamento explicitamente registrado no PDDEInfo. A conta SIGEF
 * permanece em evidência externa e nunca preenche o campo bancário primário.
 */
export function matchSigefLegacyLiberationToPayment(cnpj: string, payment: PaymentLine, rows: SigefLegacyLiberationRow[]): SigefLegacyLiberationMatch {
  const expectedProgram = payment.semanticKey === "PDDE_BASIC_P1" ? "PDDE BASICO 1A PARCELA"
    : payment.semanticKey === "PDDE_BASIC_P2" ? "PDDE BASICO 2A PARCELA"
      : null;
  const sameIdentity = expectedProgram && payment.paid > 0 && payment.paymentDate
    ? rows.filter(candidate => normalize(candidate.program) === expectedProgram && candidate.paymentDate === payment.paymentDate)
    : [];
  const exactRows = sameIdentity.filter(candidate => candidate.amount === payment.paid);
  const row = exactRows[0] ?? sameIdentity[0];
  const divergentAmount = sameIdentity.length > 0 && exactRows.length === 0;
  const divergentExternalIdentity = exactRows.length > 1 && new Set(exactRows.map(candidate => `${candidate.bankOrder}|${candidate.bank}|${candidate.agency}|${candidate.account}`)).size > 1;
  const divergenceFields: SigefLegacyLiberationMatch["divergenceFields"] = [
    ...(divergentAmount ? ["amount" as const] : []),
    ...(divergentExternalIdentity ? ["bankOrder", "bank", "agency", "account"] as const : []),
  ];
  const divergent = divergenceFields.length > 0;
  const state = derivePaymentEvidenceState({
    pddeInfoPaymentRegistered: payment.paid > 0,
    sigefLiberationMatched: Boolean(exactRows.length === 1 && digits(cnpj)),
    sigefCreditMatched: false,
    directBankStatementConfirmed: false,
    reversalMatched: false,
    divergent,
    allRequiredSourcesCompleted: false,
  });
  if (divergent && row) {
    return { matched: false, divergent: true, state, row, divergenceFields, message: "A consulta SIGEF legada retornou identidade básica coincidente, mas com divergência de valor ou identidade bancária; associação bloqueada." };
  }
  return row && exactRows.length === 1
    ? { matched: true, divergent: false, state, row, divergenceFields: [], message: "Ordem bancária SIGEF legada corroborou CNPJ, parcela, data e valor registrados no PDDEInfo; crédito bancário não foi confirmado." }
    : { matched: false, divergent: false, state, row: null, divergenceFields: [], message: "A consulta SIGEF legada não apresentou linha coincidente para a parcela PDDEInfo; nenhuma associação foi inferida." };
}
