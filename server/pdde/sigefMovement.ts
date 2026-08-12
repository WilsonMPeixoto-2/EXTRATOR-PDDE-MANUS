import { createHash, randomUUID } from "node:crypto";
import { appendAuditTrail, completeAuditRun, createAuditRun, persistRunArtifact } from "../db";
import { storagePut } from "../storage";
import type { ExternalFinancialEvidence } from "./reconciliationEngine";

export type SigefMovementTransaction = {
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
};

export type SigefMovementExtraction = {
  accountHolderCnpj?: string;
  accountHolderName?: string;
  consultedAt?: string;
  transactions: SigefMovementTransaction[];
  ignoredLines: number;
};

const money = (value: string) => Number(value.replace(/\./g, "").replace(",", "."));
const dateToIso = (value: string) => {
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
};

/**
 * Lê a saída textual preservada do relatório SIGEF. O parser não adivinha
 * programa, parcela, conta da unidade ou chave de associação inexistente.
 */
export function parseSigefMovementText(text: string): SigefMovementExtraction {
  const accountHolderCnpj = text.match(/CNPJ:\s*([\d./-]+)/)?.[1];
  const accountHolderName = text.match(/Nome:\s*(.+?)(?:\n|$)/)?.[1]?.trim();
  const consultedAt = text.match(/Data da consulta:\s*([^\n]+)/)?.[1]?.trim();
  const transactions: SigefMovementTransaction[] = [];
  let ignoredLines = 0;

  for (const line of text.split(/\r?\n/)) {
    if (!/^\d{2}\/\d{2}\/\d{4}\s/.test(line)) continue;
    const tail = line.match(/\s+(\d{3})\s+(\d{4})\s+([A-Z0-9]+)\s*$/);
    const head = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)\s+([\d.,]+)\s+(\d+)\s+(.+)$/);
    if (!tail || !head) {
      ignoredLines += 1;
      continue;
    }

    const body = head[5].slice(0, -tail[0].length);
    const beneficiary = body.match(/\s+(\d{2}[.\d/-]+|\d{3}[.\d-]+|-)\s+(.+)$/);
    const beforeBeneficiary = beneficiary ? body.slice(0, beneficiary.index).trim() : body.trim();
    const knownHistoricalEvents = ["TRANSFERENCIA ENVIADA", "PAGTO CARTAO CREDITO", "RESGATE AUTOMATICO", "ORDEM BANCARIA", "BB-APLIC C.PRZ-APL.AUT", "APLICACAO EM BB FIX", "RESGATE BB FIX", "PIX RECEBIDO", "CARTAO DE CREDITO"];
    const historic = knownHistoricalEvents.find(event => beforeBeneficiary.includes(event)) ?? beforeBeneficiary;

    transactions.push({
      date: dateToIso(head[1]),
      credit: money(head[2]),
      debit: money(head[3]),
      document: head[4],
      historic,
      beneficiaryCnpj: beneficiary?.[1] === "-" ? undefined : beneficiary?.[1],
      beneficiaryName: beneficiary?.[2]?.trim() === "-" ? undefined : beneficiary?.[2]?.trim(),
      beneficiaryBank: tail[1],
      beneficiaryAgency: tail[2],
      beneficiaryAccount: tail[3],
    });
  }

  return { accountHolderCnpj, accountHolderName, consultedAt, transactions, ignoredLines };
}

/**
 * Converte somente créditos documentados do FNDE em evidência externa.
 * Os campos não presentes no relatório são deliberadamente omitidos, para que
 * reconcilePaymentEvidence() mantenha o vínculo como inconclusivo.
 */
export function fndeOrderEvidenceFromMovement(
  extraction: SigefMovementExtraction,
  artifactKey: string,
  sourceUrl: string,
): ExternalFinancialEvidence[] {
  return extraction.transactions
    .filter(item => item.credit > 0 && item.historic === "ORDEM BANCARIA" && item.beneficiaryCnpj?.replace(/\D/g, "") === "00378257000181")
    .map(item => ({
      source: "SIGEF_EXTRATO" as const,
      kind: "CREDIT" as const,
      creditLocated: true,
      amount: item.credit,
      key: {
        cnpj: extraction.accountHolderCnpj,
        exercise: Number(item.date.slice(0, 4)),
        amount: item.credit,
        paymentDate: item.date,
        bankOrder: item.document,
      },
      sourceUrl,
      consultedAt: extraction.consultedAt ?? new Date().toISOString(),
      artifactKey,
    }));
}

export type SigefMovementPilotResult = {
  runId: string;
  artifactKey: string;
  sha256: string;
  transactionCount: number;
  fndeOrderCount: number;
  totalFndeOrders: number;
};

/**
 * Registra um PDF autorizado como piloto isolado. O piloto é encerrado bloqueado
 * porque o relatório não fornece programa, parcela e conta destinatária da unidade.
 */
export async function registerSigefMovementPilot(input: {
  pdfBytes: Buffer;
  fileName: string;
  sourceUrl: string;
  extractedText: string;
  createdByUserId?: number | null;
}): Promise<SigefMovementPilotResult> {
  const runId = `pilot-sigef-${randomUUID()}`;
  const extraction = parseSigefMovementText(input.extractedText);
  const evidence = fndeOrderEvidenceFromMovement(extraction, "pending", input.sourceUrl);
  const sha256 = createHash("sha256").update(input.pdfBytes).digest("hex");
  const stored = await storagePut(`pdde/pilots/${runId}/${input.fileName}`, input.pdfBytes, "application/pdf");
  const totalFndeOrders = evidence.reduce((sum, item) => sum + (item.amount ?? 0), 0);

  await createAuditRun(runId, 1, "SIGEF_MOVEMENT_PARSER_V1", input.createdByUserId ?? null);
  await persistRunArtifact({
    runId,
    kind: "sigef_movement_pdf",
    storageKey: stored.key,
    storageUrl: stored.url,
    contentType: "application/pdf",
    sha256,
  });
  await appendAuditTrail(runId, "PILOT", [], [{
    eventId: `pilot-source-${randomUUID()}`,
    runId,
    occurredAt: new Date().toISOString(),
    type: "SOURCE_FETCHED",
    severity: "info",
    inep: null,
    fieldId: null,
    message: "PDF SIGEF de movimentação registrado como evidência autorizada de piloto; associação financeira permanece bloqueada sem chave completa.",
    payload: {
      source: "SIGEF_EXTRATO",
      sourceUrl: input.sourceUrl,
      artifactKey: stored.key,
      sha256,
      transactionCount: extraction.transactions.length,
      ignoredLines: extraction.ignoredLines,
      fndeOrderCount: evidence.length,
      totalFndeOrders,
      reconciliationReadiness: "INCONCLUSIVA_SEM_PROGRAMA_PARCELA_E_CONTA_DESTINATARIA",
    },
  }]);
  await completeAuditRun(runId, "blocked", 1, {
    passed: false,
    uniqueIneps: 0,
    firstInstallmentPaid: 0,
    secondInstallmentExpected: 0,
    missingBasicAccounts: 0,
    errors: ["Piloto SIGEF registrado, mas o relatório não contém programa, parcela e conta destinatária suficientes para conciliação estrita."],
  });
  return { runId, artifactKey: stored.key, sha256, transactionCount: extraction.transactions.length, fndeOrderCount: evidence.length, totalFndeOrders };
}
