import { createHash } from "node:crypto";
import { appendAuditTrail, persistRunArtifact } from "../db";
import { storagePut } from "../storage";
import { matchSigefLegacyLiberationToPayment, collectSigefLegacyLiberation, SIGEF_LEGACY_LIBERATION_PARSER_VERSION, type SigefLegacyLiberationCollection } from "./sigefLiberation";
import type { AuditEvent, FieldProvenance, SchoolExtraction } from "./types";

const pause = (milliseconds: number) => new Promise<void>(resolve => setTimeout(resolve, milliseconds));

type StoredArtifact = { key: string; url: string };

export type SigefLiberationPilotDependencies = {
  collect: (input: { cnpj: string; exercise: number }) => Promise<SigefLegacyLiberationCollection>;
  store: (key: string, data: string, contentType: string) => Promise<StoredArtifact>;
  persistArtifact: typeof persistRunArtifact;
  appendTrail: typeof appendAuditTrail;
  wait: (milliseconds: number) => Promise<void>;
  now: () => Date;
};

const productionDependencies: SigefLiberationPilotDependencies = {
  collect: collectSigefLegacyLiberation,
  store: storagePut,
  persistArtifact: persistRunArtifact,
  appendTrail: appendAuditTrail,
  wait: pause,
  now: () => new Date(),
};

export type SigefLiberationPilotResult = {
  attempted: number;
  fetched: number;
  corroboratedPayments: number;
  divergentPayments: number;
  failures: number;
  events: AuditEvent[];
};

function evidenceFields(input: {
  record: SchoolExtraction;
  collection: SigefLegacyLiberationCollection;
  rawArtifact: StoredArtifact;
  normalizedArtifact: StoredArtifact;
}): FieldProvenance[] {
  const fields: FieldProvenance[] = [];
  for (const payment of input.record.payments) {
    const match = matchSigefLegacyLiberationToPayment(input.record.cnpj, payment, input.collection.rows);
    if ((!match.matched && !match.divergent) || !match.row || !payment.semanticKey) continue;
    const prefix = `sigefLiberacao:${payment.semanticKey}`;
    const common = {
      source: "SIGEF_LIBERACAO" as const,
      sourceUrl: input.collection.sourceUrl,
      consultedAt: input.collection.consultedAt,
      sourceHashSha256: input.collection.sourceHashSha256,
      artifact: {
        rawHtmlKey: input.rawArtifact.key,
        rawHtmlUrl: input.rawArtifact.url,
        normalizedJsonKey: input.normalizedArtifact.key,
        normalizedJsonUrl: input.normalizedArtifact.url,
      },
      parserVersion: SIGEF_LEGACY_LIBERATION_PARSER_VERSION,
      extractionRule: "sigef-legacy-liberation-row-exact-payment-match",
      validationResults: [
        { code: "source-hash", level: "passed" as const, message: "Hash SHA-256 da resposta SIGEF legado presente." },
        { code: "payment-identity", level: match.divergent ? "failed" as const : "passed" as const, message: match.divergent ? `Divergência SIGEF detectada em: ${match.divergenceFields.join(", ")}; associação bloqueada.` : "CNPJ, parcela PDDE Básico, data e valor coincidem com o pagamento registrado no PDDEInfo." },
        { code: "credit-semantics", level: "warning" as const, message: "Ordem bancária corroborada não equivale a crédito bancário confirmado." },
      ],
      state: match.state,
    };
    for (const [field, value] of Object.entries({ bankOrder: match.row.bankOrder, bank: match.row.bank, agency: match.row.agency, account: match.row.account })) {
      fields.push({
        ...common,
        fieldId: `${input.record.inep}:SIGEF_LIBERACAO:${prefix}:${field}`,
        fieldPath: `${prefix}.${field}`,
        logicalKey: `${prefix}:${field}`,
        rawValue: value,
        normalizedValue: value,
        selector: match.row.selector,
        evidenceSnippet: `SIGEF legado: ${payment.destination}; OB ${match.row.bankOrder}; valor ${match.row.amount.toFixed(2)}; banco ${match.row.bank}; agência ${match.row.agency}; conta ${match.row.account}.`,
      });
    }
  }
  return fields;
}

/**
 * Executa apenas uma amostra pequena de UEx com pagamento básico registrado. A fonte
 * é complementar: a observação SIGEF é apensada à auditoria e nunca modifica `bankAccounts`.
 */
export async function registerSigefLegacyLiberationPilot(
  runId: string,
  records: SchoolExtraction[],
  dependencies: SigefLiberationPilotDependencies = productionDependencies,
): Promise<SigefLiberationPilotResult> {
  const targets = records.filter(record => record.cnpj && record.payments.some(payment => payment.semanticKey?.startsWith("PDDE_BASIC_P") && payment.paid > 0 && payment.paymentDate)).slice(0, 5);
  const events: AuditEvent[] = [];
  let fetched = 0;
  let corroboratedPayments = 0;
  let divergentPayments = 0;
  let failures = 0;

  for (let index = 0; index < targets.length; index += 1) {
    const record = targets[index]!;
    try {
      const collection = await dependencies.collect({ cnpj: record.cnpj, exercise: 2026 });
      const rawArtifact = await dependencies.store(`evidence/pdde-4cre/${runId}/${record.inep}/sigef-liberacao-source.html`, collection.rawHtml, "text/html; charset=iso-8859-1");
      const normalized = JSON.stringify({ source: "SIGEF_LIBERACAO", collection: { ...collection, rawHtml: undefined }, inep: record.inep, cnpj: record.cnpj }, null, 2);
      const normalizedArtifact = await dependencies.store(`evidence/pdde-4cre/${runId}/${record.inep}/sigef-liberacao-normalized.json`, normalized, "application/json");
      await dependencies.persistArtifact({ runId, kind: "raw_html", storageKey: rawArtifact.key, storageUrl: rawArtifact.url, contentType: "text/html; charset=iso-8859-1", sha256: collection.sourceHashSha256 });
      await dependencies.persistArtifact({ runId, kind: "normalized_json", storageKey: normalizedArtifact.key, storageUrl: normalizedArtifact.url, contentType: "application/json", sha256: createHash("sha256").update(normalized).digest("hex") });
      const provenance = evidenceFields({ record, collection, rawArtifact, normalizedArtifact });
      const matches = provenance.filter(field => field.logicalKey.endsWith(":bankOrder")).length;
      const divergences = provenance.filter(field => field.logicalKey.endsWith(":bankOrder") && field.state === "DIVERGENCIA_ENTRE_FONTES").length;
      corroboratedPayments += matches - divergences;
      divergentPayments += divergences;
      const fetchedEvent: AuditEvent = {
        eventId: `sigef-liberacao-${runId}-${record.inep}-${dependencies.now().getTime()}`,
        runId,
        occurredAt: dependencies.now().toISOString(),
        type: "SOURCE_FETCHED",
        severity: divergences > 0 ? "critical" : matches > 0 ? "info" : "warning",
        inep: record.inep,
        fieldId: null,
        message: divergences > 0
          ? `SIGEF legado retornou ${divergences} divergência(s) de identidade ou valor; associação bloqueada e revisão necessária.`
          : matches > 0
          ? `SIGEF legado corroborou ${matches} pagamento(s) PDDE Básico por CNPJ, parcela, data e valor; crédito não confirmado.`
          : "SIGEF legado foi consultado, mas não retornou coincidência estrita com pagamentos PDDEInfo; nenhuma associação foi inferida.",
        payload: { source: "SIGEF_LIBERACAO", sourceUrl: collection.sourceUrl, httpStatus: collection.httpStatus, attempts: collection.attempts, sourceHashSha256: collection.sourceHashSha256, rawHtmlKey: rawArtifact.key, normalizedJsonKey: normalizedArtifact.key, matchedPayments: matches - divergences, divergentPayments: divergences, rowCount: collection.rows.length, pilotLimit: 5 },
      };
      const reconciliationEvents = provenance.filter(field => field.logicalKey.endsWith(":bankOrder")).map(field => ({
        eventId: `${fetchedEvent.eventId}-${field.fieldId}`,
        runId,
        occurredAt: fetchedEvent.occurredAt,
        type: "FIELD_RECONCILED" as const,
        severity: field.state === "DIVERGENCIA_ENTRE_FONTES" ? "critical" as const : "info" as const,
        inep: record.inep,
        fieldId: field.fieldId,
        message: field.state === "DIVERGENCIA_ENTRE_FONTES"
          ? "Divergência SIGEF registrada; a associação foi bloqueada e a conta primária do PDDEInfo permanece inalterada."
          : "OB SIGEF legado corroborada; o estado não confirma crédito bancário nem substitui a conta primária do PDDEInfo.",
        payload: { source: "SIGEF_LIBERACAO", logicalKey: field.logicalKey, state: field.state, artifact: field.artifact },
      }));
      events.push(fetchedEvent, ...reconciliationEvents);
      await dependencies.appendTrail(runId, record.inep, provenance, [fetchedEvent, ...reconciliationEvents]);
      fetched += 1;
    } catch (error) {
      failures += 1;
      const failure: AuditEvent = {
        eventId: `sigef-liberacao-failure-${runId}-${record.inep}-${dependencies.now().getTime()}`,
        runId,
        occurredAt: dependencies.now().toISOString(),
        type: "SOURCE_FETCHED",
        severity: "warning",
        inep: record.inep,
        fieldId: null,
        message: "Consulta SIGEF legado não concluída para a UEx selecionada; o PDDEInfo e o Excel permanecem inalterados.",
        payload: { source: "SIGEF_LIBERACAO", exception: error instanceof Error ? error.message : "Falha desconhecida", pilotLimit: 5 },
      };
      events.push(failure);
      await dependencies.appendTrail(runId, record.inep, [], [failure]);
    }
    if (index + 1 < targets.length) await dependencies.wait(800);
  }
  return { attempted: targets.length, fetched, corroboratedPayments, divergentPayments, failures, events };
}
