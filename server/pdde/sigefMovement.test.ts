import { describe, expect, it } from "vitest";
import { fndeOrderEvidenceFromMovement, parseSigefMovementText } from "./sigefMovement";
import { reconcilePaymentEvidence } from "./reconciliationEngine";

const anonymizedReport = `SIGEF - SISTEMA INTEGRADO DE GESTÃO FINANCEIRA
CNPJ: 12.345.678/0001-90 Nome: UNIDADE REDIGIDA
Data da consulta: 12/08/2026 10:00:00
Data Crédito Débito Documento Histórico CNPJ Beneficiário Razão Social Banco Beneficiário Agência Beneficiário Conta Corrente Beneficiário
25/09/2025 4.915,00 0 00000000000000001234 ORDEM BANCARIA 00.378.257/0001-81 FUNDO NACIONAL DE DESENVOLVIMENTO DA EDUCACAO 001 1607 0997380845
25/09/2025 0 4.915,00 00000000000000000070 APLICACAO EM BB FIX - - 001 0000 0000000000`;

describe("parser de movimentação SIGEF", () => {
  it("preserva crédito, documento e data, sem inventar programa, parcela ou conta da unidade", () => {
    const extraction = parseSigefMovementText(anonymizedReport);
    expect(extraction.accountHolderCnpj).toBe("12.345.678/0001-90");
    expect(extraction.transactions[0]).toMatchObject({ date: "2025-09-25", credit: 4915, historic: "ORDEM BANCARIA" });
    const evidence = fndeOrderEvidenceFromMovement(extraction, "artifact/sigef.pdf", "file://authorized-pilot");
    expect(evidence).toHaveLength(1);
    expect(evidence[0].key).toEqual(expect.objectContaining({ cnpj: "12.345.678/0001-90", exercise: 2025, amount: 4915, paymentDate: "2025-09-25" }));
    expect(evidence[0].key).not.toHaveProperty("program");
    expect(evidence[0].key).not.toHaveProperty("account");
  });

  it("mantém a conciliação inconclusiva quando o extrato não contém programa, parcela e conta destinatária", () => {
    const evidence = fndeOrderEvidenceFromMovement(parseSigefMovementText(anonymizedReport), "artifact/sigef.pdf", "file://authorized-pilot");
    const result = reconcilePaymentEvidence({
      cnpj: "12.345.678/0001-90", exercise: 2025, program: "PDDE", actionOrInstallment: "1A_PARCELA", amount: 4915,
      paymentDate: "2025-09-25", bankOrder: "00000000000000001234", bank: "001", agency: "0249", account: "0000549797",
    }, evidence);
    expect(result.state).toBe("PAGAMENTO_INFORMADO_PDDEINFO");
    expect(result.aggregation.status).toBe("NO_COMPONENT");
    expect(result.matchedEvidence).toEqual([]);
  });
});
