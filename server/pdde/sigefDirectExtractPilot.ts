import { createHash } from "node:crypto";
import { appendAuditTrail, persistRunArtifact } from "../db";
import { storagePut } from "../storage";
import {
  collectSigefDirectExtract,
  collectSigefDirectExtractFull,
  matchSigefDirectExtractCredits,
  selectSigefDirectExtractTargets,
  SIGEF_DIRECT_EXTRACT_PARSER_VERSION,
  type SigefDirectExtractCollection,
  type SigefDirectExtractFullCollection,
  type SigefDirectExtractPaymentMatch,
  type SigefDirectExtractTarget,
} from "./sigefDirectExtract";
import type { AuditEvent, FieldProvenance, SchoolExtraction } from "./types";

const pause = (milliseconds: number) => new Promise<void>(resolve => setTimeout(resolve, milliseconds));
type StoredArtifact = { key: string; url: string };

export type SigefDirectExtractPilotDependencies = {
  collect: (input: { bank: string; agency: string; account: string; cnpj: string; program: string; period: string }) => Promise<SigefDirectExtractCollection | SigefDirectExtractFullCollection>;
  store: (key: string, data: string, contentType: string) => Promise<StoredArtifact>;
  persistArtifact: typeof persistRunArtifact;
  appendTrail: typeof appendAuditTrail;
  wait: (milliseconds: number) => Promise<void>;
  now: () => Date;
};

const productionDependencies: SigefDirectExtractPilotDependencies = {
  collect: collectSigefDirectExtractFull,
  store: storagePut,
  persistArtifact: persistRunArtifact,
  appendTrail: appendAuditTrail,
  wait: pause,
  now: () => new Date(),
};

export type SigefDirectExtractPilotResult = {
  attempted: number;
  fetched: number;
  movementsPreserved: number;
  duplicateMovementsCollapsed: number;
  locatedCredits: number;
  divergentPayments: number;
  inconclusivePayments: number;
  paginationLimited: number;
  failures: number;
  events: AuditEvent[];
};

function evidenceFields(input: {
  target: SigefDirectExtractTarget;
  collection: SigefDirectExtractCollection;
  matches: SigefDirectExtractPaymentMatch[];
  rawArtifact: StoredArtifact;
  normalizedArtifact: StoredArtifact;
}): FieldProvenance[] {
  const fields: FieldProvenance[] = [];
  for (const match of input.matches) {
    const prefix = `sigefExtrato:${match.payment.semanticKey ?? "PDDE_BASIC"}`;
    const common = {
      source: "SIGEF_EXTRATO" as const,
      sourceUrl: input.collection.sourceUrl,
      consultedAt: input.collection.consultedAt,
      sourceHashSha256: input.collection.sourceHashSha256,
      artifact: {
        rawHtmlKey: input.rawArtifact.key,
        rawHtmlUrl: input.rawArtifact.url,
        normalizedJsonKey: input.normalizedArtifact.key,
        normalizedJsonUrl: input.normalizedArtifact.url,
      },
      parserVersion: SIGEF_DIRECT_EXTRACT_PARSER_VERSION,
      extractionRule: "sigef-direct-extract-program-02-credit-match",
      validationResults: [
        { code: "source-hash", level: "passed" as const, message: "Hash SHA-256 da resposta SIGEF de extrato presente." },
        { code: "account-identity", level: match.divergent ? "failed" as const : "passed" as const, message: match.divergent ? match.message : "CNPJ, banco, agência, conta e programa 02 coincidem com a conta PDDE Básico declarada no PDDEInfo." },
        { code: "credit-location", level: match.matched ? "passed" as const : "warning" as const, message: match.message },
        { code: "date-semantics", level: "warning" as const, message: "A data de crédito do SIGEF é mantida separada da data da ordem registrada no PDDEInfo." },
      ],
      state: match.state,
    };
    const values = match.transaction
      ? {
        credit: match.transaction.credit,
        creditDate: match.transaction.date,
        document: match.transaction.document,
        historic: match.transaction.historic,
        beneficiaryCnpj: match.transaction.beneficiaryCnpj ?? "",
      }
      : { outcome: match.message };
    for (const [field, value] of Object.entries(values)) {
      fields.push({
        ...common,
        fieldId: `${input.target.record.inep}:SIGEF_EXTRATO:${prefix}:${field}`,
        fieldPath: `${prefix}.${field}`,
        logicalKey: `${prefix}:${field}`,
        rawValue: String(value),
        normalizedValue: typeof value === "number" ? value : String(value),
        selector: match.transaction?.selector ?? "#sigef-extrato-outcome",
        evidenceSnippet: match.transaction
          ? `SIGEF extrato: crédito ${match.transaction.credit.toFixed(2)} em ${match.transaction.date}; documento ${match.transaction.document}; histórico ${match.transaction.historic}; beneficiário ${match.transaction.beneficiaryCnpj ?? "não informado"}.`
          : `SIGEF extrato: ${match.message}`,
      });
    }
  }
  return fields;
}

function movementFields(input: {
  target: SigefDirectExtractTarget;
  collection: SigefDirectExtractCollection;
  rawArtifact: StoredArtifact;
  normalizedArtifact: StoredArtifact;
}): FieldProvenance[] {
  const partialPage = input.collection.reportedTotal !== null && input.collection.reportedTotal > input.collection.transactions.length;
  const paginationNotice = partialPage
    ? `Página parcial SIGEF: ${input.collection.transactions.length} de ${input.collection.reportedTotal} movimentações declaradas. `
    : "";
  return input.collection.transactions.map(transaction => {
    const logicalKey = `sigefExtrato:movement:${transaction.deduplicationKey}`;
    const direction = transaction.credit > 0 ? "crédito" : "débito";
    const amount = transaction.credit > 0 ? transaction.credit : transaction.debit;
    return {
      fieldId: `${input.target.record.inep}:SIGEF_EXTRATO:${logicalKey}`,
      fieldPath: `sigefExtrato.movements.${transaction.deduplicationKey}`,
      logicalKey,
      source: "SIGEF_EXTRATO" as const,
      sourceUrl: input.collection.sourceUrl,
      consultedAt: input.collection.consultedAt,
      sourceHashSha256: input.collection.sourceHashSha256,
      artifact: {
        rawHtmlKey: input.rawArtifact.key,
        rawHtmlUrl: input.rawArtifact.url,
        normalizedJsonKey: input.normalizedArtifact.key,
        normalizedJsonUrl: input.normalizedArtifact.url,
      },
      rawValue: JSON.stringify(transaction),
      normalizedValue: transaction.deduplicationKey,
      parserVersion: SIGEF_DIRECT_EXTRACT_PARSER_VERSION,
      extractionRule: "sigef-direct-extract-program-02-movement-row",
      selector: transaction.selector,
      evidenceSnippet: `${paginationNotice}SIGEF extrato: ${direction} de ${amount.toFixed(2)} em ${transaction.date}; documento ${transaction.document}; histórico ${transaction.historic}; favorecido ${transaction.beneficiaryName ?? "não informado"} (${transaction.beneficiaryCnpj ?? "não informado"}); chave auxiliar ${transaction.deduplicationKey.slice(0, 16)}.`,
      validationResults: [
        { code: "source-hash", level: "passed", message: "Hash SHA-256 da resposta SIGEF de extrato presente." },
        { code: "deduplication-key", level: "passed", message: "Chave auxiliar determinística calculada a partir da identidade da conta e dos atributos estáveis da movimentação." },
        ...(partialPage ? [{ code: "pagination-partial", level: "warning" as const, message: `A rota declarou ${input.collection.reportedTotal} movimentações, mas retornou ${input.collection.transactions.length}; esta linha não representa livro-razão completo.` }] : []),
        { code: "movement-semantics", level: "warning", message: "Movimentação preservada como fato do extrato; não classifica despesa, saldo real, prestação de contas ou regularidade." },
      ],
      state: null,
    };
  });
}

/**
 * Piloto não bloqueante do detalhamento público SIGEF: até cinco UEx, somente conta
 * do rótulo exato PDDE e programa 02. Nenhuma conta primária do PDDEInfo é alterada.
 */
export async function registerSigefDirectExtractPilot(
  runId: string,
  records: SchoolExtraction[],
  dependencies: SigefDirectExtractPilotDependencies = productionDependencies,
): Promise<SigefDirectExtractPilotResult> {
  const targets = selectSigefDirectExtractTargets(records, 5);
  const events: AuditEvent[] = [];
  let fetched = 0;
  let movementsPreserved = 0;
  let duplicateMovementsCollapsed = 0;
  let locatedCredits = 0;
  let divergentPayments = 0;
  let inconclusivePayments = 0;
  let paginationLimited = 0;
  let failures = 0;

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index]!;
    try {
      const firstPaymentDate = target.record.payments
        .filter(payment => payment.semanticKey?.startsWith("PDDE_BASIC_P") && payment.paid > 0 && payment.paymentDate)
        .map(payment => payment.paymentDate!)
        .sort()[0];
      if (!firstPaymentDate) throw new Error("UEx elegível sem data de pagamento básico para definir o período inicial do extrato SIGEF.");
      const collection = await dependencies.collect({
        bank: target.bankCode,
        agency: target.account.agency,
        account: target.account.account,
        cnpj: target.record.cnpj,
        program: "02",
        period: firstPaymentDate.slice(0, 7),
      });
      const fullCoverage = !("coverageComplete" in collection) || collection.coverageComplete;
      const detailArtifact = "detailPage" in collection
        ? await dependencies.store(`evidence/pdde-4cre/${runId}/${target.record.inep}/sigef-extrato-detail-page.html`, collection.detailPage.rawHtml, "text/html; charset=iso-8859-1")
        : null;
      const rawArtifact = await dependencies.store(`evidence/pdde-4cre/${runId}/${target.record.inep}/sigef-extrato-integral.xls`, collection.rawHtml, "application/vnd.ms-excel; charset=iso-8859-1");
      const normalized = JSON.stringify({ source: "SIGEF_EXTRATO", inep: target.record.inep, cnpj: target.record.cnpj, collection: { ...collection, rawHtml: undefined } }, null, 2);
      const normalizedArtifact = await dependencies.store(`evidence/pdde-4cre/${runId}/${target.record.inep}/sigef-extrato-normalized.json`, normalized, "application/json");
      if (detailArtifact && "detailPage" in collection) await dependencies.persistArtifact({ runId, kind: "raw_html", storageKey: detailArtifact.key, storageUrl: detailArtifact.url, contentType: "text/html; charset=iso-8859-1", sha256: collection.detailPage.sourceHashSha256 });
      await dependencies.persistArtifact({ runId, kind: "raw_html", storageKey: rawArtifact.key, storageUrl: rawArtifact.url, contentType: "application/vnd.ms-excel; charset=iso-8859-1", sha256: collection.sourceHashSha256 });
      await dependencies.persistArtifact({ runId, kind: "normalized_json", storageKey: normalizedArtifact.key, storageUrl: normalizedArtifact.url, contentType: "application/json", sha256: createHash("sha256").update(normalized).digest("hex") });
      const matches = matchSigefDirectExtractCredits(target, collection);
      const creditProvenance = evidenceFields({ target, collection, matches, rawArtifact, normalizedArtifact });
      const headerDivergent = matches.some(match => match.divergent);
      const movements = headerDivergent ? [] : movementFields({ target, collection, rawArtifact, normalizedArtifact });
      const provenance = [...creditProvenance, ...movements];
      const located = matches.filter(match => match.matched).length;
      const divergent = matches.filter(match => match.divergent).length;
      const inconclusive = matches.filter(match => !match.matched && !match.divergent).length;
      const limited = !fullCoverage || (collection.reportedTotal !== null && collection.reportedTotal > collection.transactions.length);
      locatedCredits += located;
      movementsPreserved += movements.length;
      duplicateMovementsCollapsed += collection.duplicateRows.length;
      divergentPayments += divergent;
      inconclusivePayments += inconclusive;
      if (limited) paginationLimited += 1;
      const fetchedEvent: AuditEvent = {
        eventId: crypto.randomUUID(),
        runId,
        occurredAt: dependencies.now().toISOString(),
        type: "SOURCE_FETCHED",
        severity: divergent > 0 ? "critical" : limited ? "warning" : located > 0 ? "info" : "warning",
        inep: target.record.inep,
        fieldId: null,
        message: divergent > 0
          ? "Detalhamento SIGEF retornou divergência de identidade; associação bloqueada e conta primária do PDDEInfo preservada."
          : limited
          ? `Detalhamento SIGEF retornou ${collection.transactions.length} de ${collection.reportedTotal} movimentações declaradas; créditos não foram conciliados e as linhas ficaram identificadas como página parcial.`
          : located > 0
          ? `Detalhamento SIGEF localizou ${located} crédito(s) FNDE compatível(is) na conta PDDE Básico; data de crédito preservada separadamente.`
          : "Detalhamento SIGEF consultado sem crédito compatível concluído; nenhuma ausência foi inferida.",
        payload: {
          source: "SIGEF_EXTRATO",
          sourceUrl: collection.sourceUrl,
          httpStatus: collection.httpStatus,
          attempts: collection.attempts,
          sourceHashSha256: collection.sourceHashSha256,
          rawHtmlKey: rawArtifact.key,
          normalizedJsonKey: normalizedArtifact.key,
          program: "02",
          pilotLimit: 5,
          returnedRows: collection.transactions.length,
          rawTransactionRows: collection.rawTransactionRows,
          movementsPreserved: movements.length,
          duplicateMovementsCollapsed: collection.duplicateRows.length,
          reportedTotal: collection.reportedTotal,
          paginationLimited: limited,
          locatedCredits: located,
          divergentPayments: divergent,
          inconclusivePayments: inconclusive,
        },
      };
      const reconciliationEvents = matches.map(match => ({
        eventId: crypto.randomUUID(),
        runId,
        occurredAt: fetchedEvent.occurredAt,
        type: "FIELD_RECONCILED" as const,
        severity: match.divergent ? "critical" as const : match.matched ? "info" as const : "warning" as const,
        inep: target.record.inep,
        fieldId: `${target.record.inep}:SIGEF_EXTRATO:sigefExtrato:${match.payment.semanticKey ?? "PDDE_BASIC"}:credit`,
        message: match.matched
          ? "Crédito localizado no extrato SIGEF; o fato externo não altera a conta primária nem a data da ordem do PDDEInfo."
          : match.message,
        payload: { source: "SIGEF_EXTRATO", semanticKey: match.payment.semanticKey, state: match.state, divergenceFields: match.divergenceFields, artifact: rawArtifact.key },
      }));
      const movementEvent = headerDivergent ? null : {
        eventId: crypto.randomUUID(),
        runId,
        occurredAt: fetchedEvent.occurredAt,
        type: "FIELD_PARSED" as const,
        severity: limited ? "warning" as const : "info" as const,
        inep: target.record.inep,
        fieldId: null,
        message: limited
          ? `${movements.length} movimentação(ões) da página parcial SIGEF foram preservadas como evidência incompleta; não representam livro-razão total nem conciliação de crédito.`
          : `${movements.length} movimentação(ões) de crédito e débito do extrato SIGEF foram preservadas como evidência, sem classificação contábil automática.${collection.duplicateRows.length > 0 ? ` ${collection.duplicateRows.length} linha(s) idêntica(s) foram colapsadas pela chave auxiliar, com a resposta bruta preservada.` : ""}`,
        payload: { source: "SIGEF_EXTRATO", program: "02", movementCount: movements.length, rawTransactionRows: collection.rawTransactionRows, duplicateMovementsCollapsed: collection.duplicateRows.length, reportedTotal: collection.reportedTotal, paginationLimited: limited, artifact: rawArtifact.key },
      };
      const trailEvents = movementEvent ? [fetchedEvent, ...reconciliationEvents, movementEvent] : [fetchedEvent, ...reconciliationEvents];
      events.push(...trailEvents);
      await dependencies.appendTrail(runId, target.record.inep, provenance, trailEvents);
      fetched += 1;
    } catch (error) {
      failures += 1;
      const failure: AuditEvent = {
        eventId: crypto.randomUUID(),
        runId,
        occurredAt: dependencies.now().toISOString(),
        type: "SOURCE_FETCHED",
        severity: "warning",
        inep: target.record.inep,
        fieldId: null,
        message: "Detalhamento SIGEF não concluído para a UEx selecionada; o PDDEInfo e o Excel permanecem inalterados.",
        payload: { source: "SIGEF_EXTRATO", program: "02", pilotLimit: 5, exception: error instanceof Error ? error.message : "Falha desconhecida" },
      };
      events.push(failure);
      await dependencies.appendTrail(runId, target.record.inep, [], [failure]);
    }
    if (index + 1 < targets.length) await dependencies.wait(900);
  }
  return { attempted: targets.length, fetched, movementsPreserved, duplicateMovementsCollapsed, locatedCredits, divergentPayments, inconclusivePayments, paginationLimited, failures, events };
}
