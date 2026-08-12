import { describe, expect, it } from "vitest";
import { fndeOrderEvidenceFromMovement, parseSigefMovementText, registerSigefMovementPilot } from "./sigefMovement";
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

  it("processa relatório parcial como execução concluída, preservando limitações sem bloquear o operador", async () => {
    const calls: Array<{ name: string; value: unknown }> = [];
    const identifiers = ["run-unit", "event-unit"];
    const result = await registerSigefMovementPilot({
      pdfBytes: Buffer.from("pdf autorizado"), fileName: "movimentacao.pdf", sourceUrl: "arquivo-autorizado", extractedText: anonymizedReport,
    }, {
      store: async key => {
        calls.push({ name: "store", value: key });
        return { key: "evidence/pilot/movimentacao.pdf", url: "https://storage.test/movimentacao.pdf" };
      },
      createRun: async (...value) => { calls.push({ name: "createRun", value }); },
      persistArtifact: async value => { calls.push({ name: "persistArtifact", value }); },
      appendTrail: async (...value) => { calls.push({ name: "appendTrail", value }); },
      completeRun: async (...value) => { calls.push({ name: "completeRun", value }); },
      createId: () => identifiers.shift()!,
      now: () => new Date("2026-08-12T12:00:00.000Z"),
    });

    expect(result).toMatchObject({ runId: "pilot-sigef-run-unit", artifactKey: "evidence/pilot/movimentacao.pdf", transactionCount: 2, fndeOrderCount: 1, totalFndeOrders: 4915 });
    expect(calls.find(call => call.name === "persistArtifact")?.value).toMatchObject({ kind: "sigef_movement_pdf", sha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
    const event = (calls.find(call => call.name === "appendTrail")?.value as unknown[])?.[3]?.[0] as { payload: { sourceLimitations: string[]; reconciliationReadiness: string } };
    expect(event.payload).toMatchObject({ reconciliationReadiness: "EVIDENCIA_PARCIAL_SEM_PROGRAMA_PARCELA_E_CONTA_DESTINATARIA", sourceLimitations: expect.arrayContaining(["Programa/ação não disponível no relatório"]) });
    const completion = calls.find(call => call.name === "completeRun")?.value as unknown[];
    expect(completion[1]).toBe("partial");
    expect(completion[3]).toMatchObject({ passed: true, errors: [], sourceLimitations: expect.arrayContaining([expect.stringContaining("não contém programa")]) });
  });
});
