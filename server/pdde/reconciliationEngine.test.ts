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

  it("concilia duas ordens fracionadas somente quando a identidade bancária comum coincide e a soma fecha", () => {
    const result = reconcilePaymentEvidence(key, [
      { source: "SIGEF_LIBERACAO", kind: "BANK_ORDER", amount: 60, key: { ...key, amount: 60, bankOrder: "OB-124" }, sourceUrl: "https://sigef.test/liberacao/1", consultedAt: "2026-08-12T00:00:00.000Z", artifactKey: "ob-1" },
      { source: "SIGEF_LIBERACAO", kind: "BANK_ORDER", amount: 40, key: { ...key, amount: 40, bankOrder: "OB-125" }, sourceUrl: "https://sigef.test/liberacao/2", consultedAt: "2026-08-12T00:01:00.000Z", artifactKey: "ob-2" },
    ]);
    expect(result).toMatchObject({ state: "OB_CORROBORADA_CREDITO_NAO_LOCALIZADO" });
    expect(result.aggregation).toMatchObject({ totalOrders: 100, reconciliationAmount: 100, componentCount: 2, status: "EXACT" });
    expect(result.matchedEvidence).toHaveLength(2);
  });

  it("concilia créditos fracionados e registra aplicação automática sem tratá-la como novo crédito", () => {
    const result = reconcilePaymentEvidence(key, [
      { source: "SIGEF_EXTRATO", kind: "CREDIT", amount: 70, creditLocated: true, key: { ...key, amount: 70, bankOrder: "OB-124" }, sourceUrl: "https://sigef.test/extrato/1", consultedAt: "2026-08-12T00:00:00.000Z", artifactKey: "credito-1" },
      { source: "SIGEF_EXTRATO", kind: "CREDIT", amount: 30, creditLocated: true, key: { ...key, amount: 30, bankOrder: "OB-125" }, sourceUrl: "https://sigef.test/extrato/2", consultedAt: "2026-08-12T00:01:00.000Z", artifactKey: "credito-2" },
      { source: "SIGEF_EXTRATO", kind: "AUTOMATIC_APPLICATION", amount: 30, key: { ...key, amount: 30, bankOrder: "OB-125" }, sourceUrl: "https://sigef.test/extrato/3", consultedAt: "2026-08-12T00:02:00.000Z", artifactKey: "aplicacao-1" },
    ]);
    expect(result).toMatchObject({ state: "CREDITO_LOCALIZADO_SIGEF" });
    expect(result.aggregation).toMatchObject({ totalCredits: 100, totalApplications: 30, reconciliationAmount: 100, status: "EXACT" });
  });

  it("registra devolução ou estorno em componente fracionado sem ocultar a evidência de reversão", () => {
    const result = reconcilePaymentEvidence(key, [
      { source: "SIGEF_EXTRATO", kind: "CREDIT", amount: 100, creditLocated: true, key, sourceUrl: "https://sigef.test/extrato/credito", consultedAt: "2026-08-12T00:00:00.000Z", artifactKey: "credito" },
      { source: "SIGEF_EXTRATO", kind: "RETURN", amount: 25, reversalLocated: true, key: { ...key, amount: 25, bankOrder: "OB-124" }, sourceUrl: "https://sigef.test/extrato/devolucao", consultedAt: "2026-08-12T00:01:00.000Z", artifactKey: "devolucao" },
    ]);
    expect(result).toMatchObject({ state: "CREDITO_ESTORNADO_OU_DEVOLVIDO" });
    expect(result.aggregation).toMatchObject({ totalReversalsAndReturns: 25, reconciliationAmount: 75, status: "PARTIAL" });
  });
});
