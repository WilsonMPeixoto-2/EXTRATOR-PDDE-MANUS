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

export type ExternalFinancialEvidence = {
  source: Exclude<EvidenceSource, "PDDEINFO">;
  key: Partial<ReconciliationKey>;
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

const keyFields: Array<keyof ReconciliationKey> = ["cnpj", "exercise", "program", "actionOrInstallment", "amount", "paymentDate", "bankOrder", "bank", "agency", "account"];

export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, "");
}

function comparableValue(field: keyof ReconciliationKey, value: ReconciliationKey[keyof ReconciliationKey] | undefined) {
  if (typeof value === "string") return field === "cnpj" ? normalizeCnpj(value) : value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
  return value;
}

/**
 * Nenhuma conta, ordem ou pagamento de fonte externa é associado sem a chave completa.
 * Ausência de campo produz conciliação inconclusiva, não inferência.
 */
export function matchStrictly(pddeKey: ReconciliationKey, evidenceKey: Partial<ReconciliationKey>): EvidenceMatch {
  const missingFields = keyFields.filter(field => evidenceKey[field] === undefined || evidenceKey[field] === null || evidenceKey[field] === "");
  if (missingFields.length > 0) return { matched: false, divergent: false, missingFields, mismatchedFields: [] };
  const mismatchedFields = keyFields.filter(field => comparableValue(field, pddeKey[field]) !== comparableValue(field, evidenceKey[field]));
  return { matched: mismatchedFields.length === 0, divergent: mismatchedFields.length > 0, missingFields: [], mismatchedFields };
}

export type ReconciliationResult = {
  state: FieldState;
  match: EvidenceMatch;
  matchedEvidence: ExternalFinancialEvidence[];
  message: string;
};

export function reconcilePaymentEvidence(pddeKey: ReconciliationKey, evidence: ExternalFinancialEvidence[], allRequiredSourcesCompleted = false): ReconciliationResult {
  const evaluated = evidence.map(item => ({ item, match: matchStrictly(pddeKey, item.key) }));
  const divergence = evaluated.some(entry => entry.match.divergent);
  const matchedEvidence = evaluated.filter(entry => entry.match.matched).map(entry => entry.item);
  const signals = {
    pddeInfoPaymentRegistered: pddeKey.amount > 0,
    sigefLiberationMatched: matchedEvidence.some(item => item.source === "SIGEF_LIBERACAO"),
    sigefCreditMatched: matchedEvidence.some(item => item.source === "SIGEF_EXTRATO" && item.creditLocated),
    directBankStatementConfirmed: matchedEvidence.some(item => item.source === "EXTRATO_BB" && item.directStatementConfirmed),
    reversalMatched: matchedEvidence.some(item => item.reversalLocated),
    divergent: divergence,
    allRequiredSourcesCompleted,
  };
  const state = derivePaymentEvidenceState(signals);
  const match = divergence
    ? evaluated.find(entry => entry.match.divergent)!.match
    : matchedEvidence.length > 0
      ? evaluated.find(entry => entry.match.matched)!.match
      : evaluated[0]?.match ?? { matched: false, divergent: false, missingFields: keyFields, mismatchedFields: [] };
  const message = state === "CONSULTA_INCONCLUSIVA"
    ? "Não houve evidência externa suficiente para associar o pagamento; nenhuma inferência foi aplicada."
    : state === "DIVERGENCIA_ENTRE_FONTES"
      ? "A evidência externa diverge da chave PDDEInfo; associação bloqueada e revisão necessária."
      : `Estado de evidência apurado: ${state}.`;
  return { state, match, matchedEvidence, message };
}
