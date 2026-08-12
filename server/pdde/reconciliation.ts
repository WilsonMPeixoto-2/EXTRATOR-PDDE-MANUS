import type { FieldState } from "./types";

/**
 * Sinais normalizados de evidência para um repasse. O motor deliberadamente não
 * considera a ordem bancária como sinônimo de crédito efetivado.
 */
export type PaymentEvidenceSignals = {
  pddeInfoPaymentRegistered: boolean;
  sigefLiberationMatched: boolean;
  sigefCreditMatched: boolean;
  directBankStatementConfirmed: boolean;
  reversalMatched: boolean;
  divergent: boolean;
  allRequiredSourcesCompleted: boolean;
};

export function derivePaymentEvidenceState(signals: PaymentEvidenceSignals): FieldState {
  if (signals.reversalMatched) return "CREDITO_ESTORNADO_OU_DEVOLVIDO";
  if (signals.divergent) return "DIVERGENCIA_ENTRE_FONTES";
  if (signals.directBankStatementConfirmed) return "CREDITO_CONFIRMADO_EXTRATO_BB";
  if (signals.sigefCreditMatched) return "CREDITO_LOCALIZADO_SIGEF";
  if (signals.pddeInfoPaymentRegistered && signals.sigefLiberationMatched) return "OB_CORROBORADA_CREDITO_NAO_LOCALIZADO";
  if (signals.pddeInfoPaymentRegistered) return "PAGAMENTO_INFORMADO_PDDEINFO";
  if (signals.allRequiredSourcesCompleted) return "SEM_PAGAMENTO_REGISTRADO_ATE_CONSULTA";
  return "CONSULTA_INCONCLUSIVA";
}
