import { describe, expect, it } from "vitest";
import { matchStrictly, reconcilePaymentEvidence, type ReconciliationKey } from "./reconciliationEngine";

const key: ReconciliationKey = {
  cnpj: "04.500.463/0001-73", exercise: 2026, program: "PDDE BASICO", actionOrInstallment: "1A PARCELA",
  amount: 100, paymentDate: "2026-08-05", bankOrder: "OB-123", bank: "001", agency: "0249", account: "0000546402",
};

describe("conciliação estrita entre fontes", () => {
  it("não associa evidência SIGEF quando a chave está incompleta", () => {
    const match = matchStrictly(key, { ...key, account: undefined });
    expect(match).toMatchObject({ matched: false, divergent: false });
    expect(match.missingFields).toContain("account");
  });

  it("não associa evidência com conta divergente, ainda que o CNPJ e valor coincidam", () => {
    const result = reconcilePaymentEvidence(key, [{ source: "SIGEF_LIBERACAO", key: { ...key, account: "0000999999" }, sourceUrl: "https://sigef.test", consultedAt: "2026-08-12T00:00:00.000Z", artifactKey: "artifact" }]);
    expect(result).toMatchObject({ state: "DIVERGENCIA_ENTRE_FONTES" });
    expect(result.match.mismatchedFields).toContain("account");
  });

  it("corrobora ordem sem declará-la como crédito quando a liberação coincide integralmente", () => {
    const result = reconcilePaymentEvidence(key, [{ source: "SIGEF_LIBERACAO", key, sourceUrl: "https://sigef.test", consultedAt: "2026-08-12T00:00:00.000Z", artifactKey: "artifact" }]);
    expect(result).toMatchObject({ state: "OB_CORROBORADA_CREDITO_NAO_LOCALIZADO" });
  });

  it("eleva o estado somente quando há crédito localizado em extrato SIGEF compatível", () => {
    const result = reconcilePaymentEvidence(key, [{ source: "SIGEF_EXTRATO", key, creditLocated: true, sourceUrl: "https://sigef.test", consultedAt: "2026-08-12T00:00:00.000Z", artifactKey: "artifact" }]);
    expect(result).toMatchObject({ state: "CREDITO_LOCALIZADO_SIGEF" });
  });

  it("considera várias evidências compatíveis e prioriza estorno sobre crédito localizado", () => {
    const result = reconcilePaymentEvidence(key, [
      { source: "SIGEF_LIBERACAO", key, sourceUrl: "https://sigef.test/liberacao", consultedAt: "2026-08-12T00:00:00.000Z", artifactKey: "liberacao" },
      { source: "SIGEF_EXTRATO", key, creditLocated: true, sourceUrl: "https://sigef.test/extrato", consultedAt: "2026-08-12T00:01:00.000Z", artifactKey: "credito" },
      { source: "SIGEF_EXTRATO", key, reversalLocated: true, sourceUrl: "https://sigef.test/extrato", consultedAt: "2026-08-12T00:02:00.000Z", artifactKey: "estorno" },
    ]);
    expect(result.matchedEvidence).toHaveLength(3);
    expect(result.state).toBe("CREDITO_ESTORNADO_OU_DEVOLVIDO");
  });
});
