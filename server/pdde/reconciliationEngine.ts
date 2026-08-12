import { derivePaymentEvidenceState } from "./reconciliation";
import type { EvidenceSource, FieldState } from "./types";

export type ReconciliationKey = {
  cnpj: string;
  exercise: number;
  program: string;
  actionOrInstallment: string;
  amount: number;
  paymentDate: string;
  bankOrder: string;
  bank: string;
  agency: string;
  account: string;
};

export type FinancialEvidenceKind = "BANK_ORDER" | "CREDIT" | "AUTOMATIC_APPLICATION" | "REVERSAL" | "RETURN";

export type ExternalFinancialEvidence = {
  source: Exclude<EvidenceSource, "PDDEINFO">;
  key: Partial<ReconciliationKey>;
  /** Valor do componente externo. Quando ausente, preserva-se a conciliação unitária legada. */
  amount?: number;
  kind?: FinancialEvidenceKind;
  creditLocated?: boolean;
  directStatementConfirmed?: boolean;
  reversalLocated?: boolean;
  sourceUrl: string;
  consultedAt: string;
  artifactKey: string;
};

export type EvidenceMatch = {
  matched: boolean;
  divergent: boolean;
  missingFields: Array<keyof ReconciliationKey>;
  mismatchedFields: Array<keyof ReconciliationKey>;
};

export type EvidenceAggregation = {
  reconciliationAmount: number;
  totalOrders: number;
  totalCredits: number;
  totalApplications: number;
  totalReversalsAndReturns: number;
  componentCount: number;
  status: "EXACT" | "PARTIAL" | "EXCESS" | "NO_COMPONENT" | "DIVERGENT";
};

const keyFields: Array<keyof ReconciliationKey> = ["cnpj", "exercise", "program", "actionOrInstallment", "amount", "paymentDate", "bankOrder", "bank", "agency", "account"];
const aggregationIdentityFields: Array<keyof ReconciliationKey> = ["cnpj", "exercise", "program", "actionOrInstallment", "paymentDate", "bank", "agency", "account"];
const EPSILON = 0.005;

export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, "");
}

function comparableValue(field: keyof ReconciliationKey, value: ReconciliationKey[keyof ReconciliationKey] | undefined) {
  if (typeof value === "string") return field === "cnpj" ? normalizeCnpj(value) : value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
  return value;
}

function matchFields(pddeKey: ReconciliationKey, evidenceKey: Partial<ReconciliationKey>, fields: Array<keyof ReconciliationKey>): EvidenceMatch {
  const missingFields = fields.filter(field => evidenceKey[field] === undefined || evidenceKey[field] === null || evidenceKey[field] === "");
  if (missingFields.length > 0) return { matched: false, divergent: false, missingFields, mismatchedFields: [] };
  const mismatchedFields = fields.filter(field => comparableValue(field, pddeKey[field]) !== comparableValue(field, evidenceKey[field]));
  return { matched: mismatchedFields.length === 0, divergent: mismatchedFields.length > 0, missingFields: [], mismatchedFields };
}

/** Nenhuma evidência unitária é associada sem a chave completa, inclusive valor e OB. */
export function matchStrictly(pddeKey: ReconciliationKey, evidenceKey: Partial<ReconciliationKey>): EvidenceMatch {
  return matchFields(pddeKey, evidenceKey, keyFields);
}

function componentKind(item: ExternalFinancialEvidence): FinancialEvidenceKind {
  if (item.kind) return item.kind;
  if (item.reversalLocated) return "REVERSAL";
  if (item.creditLocated || item.directStatementConfirmed) return "CREDIT";
  return "BANK_ORDER";
}

function componentAmount(item: ExternalFinancialEvidence): number {
  return item.amount ?? item.key.amount ?? 0;
}

function aggregationStatus(amount: number, target: number, count: number, divergent: boolean): EvidenceAggregation["status"] {
  if (divergent) return "DIVERGENT";
  if (count === 0) return "NO_COMPONENT";
  if (Math.abs(amount - target) < EPSILON) return "EXACT";
  return amount < target ? "PARTIAL" : "EXCESS";
}

export type ReconciliationResult = {
  state: FieldState;
  match: EvidenceMatch;
  matchedEvidence: ExternalFinancialEvidence[];
  aggregation: EvidenceAggregation;
  message: string;
};

/**
 * Permite que várias ordens ou créditos componham o mesmo pagamento somente se
 * CNPJ, exercício, programa/parcela, data, banco, agência e conta coincidirem.
 * Valor e OB podem divergir entre componentes porque são justamente o objeto da agregação.
 */
export function reconcilePaymentEvidence(pddeKey: ReconciliationKey, evidence: ExternalFinancialEvidence[], allRequiredSourcesCompleted = false): ReconciliationResult {
  const evaluated = evidence.map(item => ({
    item,
    strict: matchStrictly(pddeKey, item.key),
    identity: matchFields(pddeKey, item.key, aggregationIdentityFields),
  }));
  const divergence = evaluated.some(entry => entry.identity.divergent || entry.strict.divergent && entry.strict.mismatchedFields.some(field => aggregationIdentityFields.includes(field)));
  const identityMatched = evaluated.filter(entry => entry.identity.matched).map(entry => entry.item);
  const components = identityMatched.filter(item => componentAmount(item) > 0);
  const orders = components.filter(item => componentKind(item) === "BANK_ORDER");
  const credits = components.filter(item => componentKind(item) === "CREDIT");
  const applications = components.filter(item => componentKind(item) === "AUTOMATIC_APPLICATION");
  const reversalsAndReturns = components.filter(item => ["REVERSAL", "RETURN"].includes(componentKind(item)));
  const totalOrders = orders.reduce((total, item) => total + componentAmount(item), 0);
  const totalCredits = credits.reduce((total, item) => total + componentAmount(item), 0);
  const totalApplications = applications.reduce((total, item) => total + componentAmount(item), 0);
  const totalReversalsAndReturns = reversalsAndReturns.reduce((total, item) => total + componentAmount(item), 0);
  const grossCorroborated = totalCredits > 0 ? totalCredits : totalOrders;
  const reconciliationAmount = grossCorroborated - totalReversalsAndReturns;
  const status = aggregationStatus(reconciliationAmount, pddeKey.amount, components.length, divergence);
  const exact = status === "EXACT";
  const signals = {
    pddeInfoPaymentRegistered: pddeKey.amount > 0,
    sigefLiberationMatched: exact && orders.some(item => item.source === "SIGEF_LIBERACAO"),
    sigefCreditMatched: exact && credits.some(item => item.source === "SIGEF_EXTRATO" && item.creditLocated),
    directBankStatementConfirmed: exact && credits.some(item => item.source === "EXTRATO_BB" && item.directStatementConfirmed),
    reversalMatched: reversalsAndReturns.length > 0,
    divergent: divergence || status === "EXCESS",
    allRequiredSourcesCompleted,
  };
  const state = derivePaymentEvidenceState(signals);
  const strictMatched = evaluated.filter(entry => entry.strict.matched).map(entry => entry.item);
  const match = divergence
    ? evaluated.find(entry => entry.identity.divergent || entry.strict.divergent)!.identity
    : exact
      ? { matched: true, divergent: false, missingFields: [], mismatchedFields: [] }
      : strictMatched.length > 0
        ? evaluated.find(entry => entry.strict.matched)!.strict
        : evaluated[0]?.identity ?? { matched: false, divergent: false, missingFields: aggregationIdentityFields, mismatchedFields: [] };
  const aggregation: EvidenceAggregation = { reconciliationAmount, totalOrders, totalCredits, totalApplications, totalReversalsAndReturns, componentCount: components.length, status };
  const message = state === "CONSULTA_INCONCLUSIVA"
    ? `Não houve composição externa suficiente para associar ${pddeKey.amount.toFixed(2)}; total compatível apurado: ${reconciliationAmount.toFixed(2)}. Nenhuma inferência foi aplicada.`
    : state === "DIVERGENCIA_ENTRE_FONTES"
      ? "A evidência externa diverge da identidade bancária ou excede o valor PDDEInfo; associação bloqueada e revisão necessária."
      : `Estado de evidência apurado: ${state}. Componentes compatíveis: ${components.length}; valor conciliado: ${reconciliationAmount.toFixed(2)}.`;
  return { state, match, matchedEvidence: exact ? identityMatched : strictMatched, aggregation, message };
}
