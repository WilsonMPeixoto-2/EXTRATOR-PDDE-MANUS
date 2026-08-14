import { createHash } from "node:crypto";
import { appendAuditTrail, completeAuditRun, createAuditRun, loadLatestApprovedPaymentSnapshots, persistHistoricalFindings, persistRunArtifact, persistSchoolCollection, updateAuditRunProgress } from "../db";
import { storagePut } from "../storage";
import { MASTER_SCHOOLS } from "./masterList";
import { PDDEINFO_PARSER_VERSION, parseSchoolPage } from "./parser";
import { attachEvidenceArtifacts } from "./provenance";
import { comparePaymentSnapshots, paymentSnapshotsFromRecords } from "./history";
import { pddeInfoSchoolUrl, sourceAutomationCatalog } from "./sources";
import { assertSourceCollectionPermitted } from "./collectionRunners";
import type { AuditEvent, AuditEventType, AuditRecord, SchoolExtraction, ValidationSummary } from "./types";
import { canReleaseDownload, createV2Workbook, validateExtraction } from "./workbook";
import { persistOpenDataControl, type OpenDataControlInput, type OpenDataControlPersistence } from "./openDataControl";
import { registerSigefLegacyLiberationPilot } from "./sigefLiberationPilot";
import { registerSigefDirectExtractPilot } from "./sigefDirectExtractPilot";

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

export type ExtractionEvent =
  | { type: "ready"; runId: string; total: number }
  | { type: "progress"; completed: number; total: number; batch: number; message: string; audit: AuditRecord }
  | { type: "complete"; validation: ValidationSummary; downloadUrl: string | null; completed: number; errors: number }
  | { type: "fatal"; message: string };

export type ExtractionRun = {
  id: string;
  status: "IDLE" | "RUNNING" | "COMPLETE" | "BLOCKED" | "FAILED";
  startedAt: string;
  createdByUserId: number | null;
  completedAt?: string;
  records: SchoolExtraction[];
  audits: AuditRecord[];
  auditEvents: AuditEvent[];
  validation?: ValidationSummary;
  downloadUrl?: string;
};

const activeRuns = new Map<string, ExtractionRun>();
export const getRun = (runId: string) => activeRuns.get(runId);

/** A trilha mantém todas as tentativas; a validação usa a última por INEP. */
export function effectiveAuditsForValidation(audits: AuditRecord[]): AuditRecord[] {
  const latestByInep = new Map<string, AuditRecord>();
  audits.forEach(audit => latestByInep.set(audit.inep, audit));
  return Array.from(latestByInep.values());
}

export type SecondaryOpenDataInput = OpenDataControlInput & { fileName: string; contentType: string };

/**
 * Etapa operacional explícita para anexar um arquivo oficial de Dados Abertos a uma
 * execução já criada. O arquivo atua exclusivamente como controle secundário e não
 * altera campos extraídos do PDDEInfo nem inicia automação de fonte externa.
 */
export async function registerSecondaryOpenDataControl(
  runId: string,
  input: SecondaryOpenDataInput,
  dependencies?: OpenDataControlPersistence,
) {
  const result = dependencies
    ? await persistOpenDataControl(runId, input, dependencies)
    : await persistOpenDataControl(runId, input);
  activeRuns.get(runId)?.auditEvents.push(result.event);
  return result;
}

function event(
  runId: string,
  type: AuditEventType,
  severity: AuditEvent["severity"],
  inep: string | null,
  fieldId: string | null,
  message: string,
  payload: Record<string, unknown>,
): AuditEvent {
  return { eventId: crypto.randomUUID(), runId, occurredAt: new Date().toISOString(), type, severity, inep, fieldId, message, payload };
}

async function fetchSchool(inep: string, sme: string, runId: string): Promise<{ record?: SchoolExtraction; audit: AuditRecord; events: AuditEvent[] }> {
  const collectionPlan = assertSourceCollectionPermitted("PDDEINFO");
  const sourceUrl = pddeInfoSchoolUrl(inep);
  const audit: AuditRecord = {
    inep,
    sme,
    sourceUrl,
    consultedAt: null,
    status: "PENDING",
    attempts: 0,
    httpStatus: null,
    sourceHashSha256: null,
    normalizedHashSha256: null,
    rawHtmlKey: null,
    normalizedJsonKey: null,
    responseBytes: null,
    programsFound: [],
    exception: null,
  };
  const events: AuditEvent[] = [];
  let lastError = "";
  for (let attempt = 1; attempt <= collectionPlan.maxAttempts; attempt += 1) {
    audit.attempts = attempt;
    try {
      const response = await fetch(sourceUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; 4CRE-PDDEInfo-Extractor/2.3)", Accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(25_000),
      });
      audit.httpStatus = response.status;
      if (!response.ok) throw new Error(`FNDE retornou HTTP ${response.status}`);
      // O PDDEInfo entrega páginas em ISO-8859-1. Decodificar o buffer como latin1
      // preserva "Programa/Ação" e "Destinação", essenciais ao parsing estrito.
      const html = Buffer.from(await response.arrayBuffer()).toString("latin1");
      const consultedAt = new Date().toISOString();
      const sourceHashSha256 = createHash("sha256").update(html, "latin1").digest("hex");
      const record = parseSchoolPage(html, inep, sme, sourceUrl, consultedAt, sourceHashSha256);
      if (!record.schoolName || !record.uex) throw new Error("Página recebida sem identificação completa da unidade ou UEx.");
      const rawArtifact = await storagePut(
        `evidence/pdde-4cre/${runId}/${inep}/source.html`,
        html,
        "text/html; charset=iso-8859-1",
      );
      const normalizedJson = JSON.stringify(record, null, 2);
      const normalizedHashSha256 = createHash("sha256").update(normalizedJson, "utf8").digest("hex");
      const normalizedArtifact = await storagePut(
        `evidence/pdde-4cre/${runId}/${inep}/normalized.json`,
        normalizedJson,
        "application/json",
      );
      attachEvidenceArtifacts(record, {
        rawHtmlKey: rawArtifact.key,
        rawHtmlUrl: rawArtifact.url,
        normalizedJsonKey: normalizedArtifact.key,
        normalizedJsonUrl: normalizedArtifact.url,
      });
      audit.status = "SUCCESS";
      audit.consultedAt = consultedAt;
      audit.sourceHashSha256 = sourceHashSha256;
      audit.normalizedHashSha256 = normalizedHashSha256;
      audit.rawHtmlKey = rawArtifact.key;
      audit.normalizedJsonKey = normalizedArtifact.key;
      audit.responseBytes = Buffer.byteLength(html, "latin1");
      audit.programsFound = record.rawPrograms;
      events.push(event(runId, "SOURCE_FETCHED", "info", inep, null, "Resposta PDDEInfo coletada, persistida e identificada por hash.", {
        sourceUrl,
        collectionPlanVersion: collectionPlan.version,
        httpStatus: response.status,
        attempts: attempt,
        sourceHashSha256,
        normalizedHashSha256,
        responseBytes: audit.responseBytes,
        rawHtmlKey: rawArtifact.key,
        normalizedJsonKey: normalizedArtifact.key,
      }));
      record.fieldProvenance.forEach(provenance => {
        events.push(event(runId, "FIELD_PARSED", "info", inep, provenance.fieldId, `Campo ${provenance.fieldPath} extraído do PDDEInfo.`, {
          sourceUrl,
          sourceHashSha256,
          selector: provenance.selector,
          extractionRule: provenance.extractionRule,
          normalizedValue: provenance.normalizedValue,
          rawHtmlKey: provenance.artifact?.rawHtmlKey,
          normalizedJsonKey: provenance.artifact?.normalizedJsonKey,
        }));
        events.push(event(runId, "FIELD_VALIDATED", provenance.validationResults.some(result => result.level === "failed") ? "critical" : provenance.validationResults.some(result => result.level === "warning") ? "warning" : "info", inep, provenance.fieldId, `Validações registradas para ${provenance.fieldPath}.`, {
          validationResults: provenance.validationResults,
          state: provenance.state,
          artifact: provenance.artifact,
        }));
      });
      return { record, audit, events };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Falha desconhecida na consulta";
      if (attempt < collectionPlan.maxAttempts) await delay(collectionPlan.retryBackoffMs * attempt);
    }
  }
  audit.status = "FAILED";
  audit.consultedAt = new Date().toISOString();
  audit.exception = lastError;
  events.push(event(runId, "SOURCE_FETCHED", "critical", inep, null, "Consulta PDDEInfo não concluída após as retentativas configuradas.", {
    sourceUrl,
    attempts: audit.attempts,
    httpStatus: audit.httpStatus,
    exception: lastError,
  }));
  return { audit, events };
}

export function masterListSummary() {
  const unique = new Set(MASTER_SCHOOLS.map(school => school.inep)).size;
  return { count: MASTER_SCHOOLS.length, unique, valid: MASTER_SCHOOLS.length === 163 && unique === 163 };
}

export async function runExtraction(onEvent: (event: ExtractionEvent) => void, createdByUserId: number | null = null): Promise<ExtractionRun> {
  const master = masterListSummary();
  if (!master.valid) throw new Error("A lista-mestre não passou na validação de cobertura e unicidade.");
  const runId = crypto.randomUUID();
  const run: ExtractionRun = { id: runId, status: "RUNNING", startedAt: new Date().toISOString(), createdByUserId, records: [], audits: [], auditEvents: [] };
  run.auditEvents.push(event(runId, "RUN_STARTED", "info", null, null, "Execução iniciada com lista-mestre validada.", {
    masterCount: master.count,
    masterListUnique: master.unique,
    parserVersion: PDDEINFO_PARSER_VERSION,
    createdByUserId,
  }));
  for (const source of sourceAutomationCatalog().filter(item => !item.autonomous)) {
    run.auditEvents.push(event(
      runId,
      "SOURCE_AUTOMATION_BLOCKED",
      source.accessState === "CAPTCHA_REQUIRED" || source.accessState === "AUTHORIZATION_REQUIRED" ? "warning" : "info",
      null,
      null,
      `${source.label}: ${source.detail}`,
      {
        source: source.source,
        accessState: source.accessState,
        collectionMethod: source.collectionMethod,
        baseUrl: source.baseUrl,
      },
    ));
  }
  await createAuditRun(runId, master.count, PDDEINFO_PARSER_VERSION, createdByUserId);
  await appendAuditTrail(runId, "00000000", [], run.auditEvents);
  activeRuns.set(runId, run);
  onEvent({ type: "ready", runId, total: MASTER_SCHOOLS.length });

  // O PDDEInfo responde de forma irregular a rajadas maiores. Três consultas por lote
  // preservam a coleta autônoma e reduzem falhas de transporte sem relaxar validações.
  const batchSize = 3;
  for (let start = 0; start < MASTER_SCHOOLS.length; start += batchSize) {
    const batch = MASTER_SCHOOLS.slice(start, start + batchSize);
    const results = await Promise.all(batch.map(school => fetchSchool(school.inep, school.sme, runId)));
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      const school = batch[index];
      if (!result || !school) continue;
      run.audits.push(result.audit);
      run.auditEvents.push(...result.events);
      if (result.record) run.records.push(result.record);
      await persistSchoolCollection(runId, result.audit, PDDEINFO_PARSER_VERSION);
      await updateAuditRunProgress(runId, effectiveAuditsForValidation(run.audits).length);
      await appendAuditTrail(runId, result.audit.inep, result.record?.fieldProvenance ?? [], result.events);
      const completed = start + index + 1;
      onEvent({
        type: "progress",
        completed,
        total: MASTER_SCHOOLS.length,
        batch: Math.floor(start / batchSize) + 1,
        message: result.record ? `${school.inep} consultado com sucesso.` : `${school.inep} falhou após ${result.audit.attempts} tentativa(s).`,
        audit: result.audit,
      });
    }
    if (start + batchSize < MASTER_SCHOOLS.length) await delay(1_500);
  }

  const initialFailures = effectiveAuditsForValidation(run.audits).filter(audit => audit.status === "FAILED");
  for (const failedAudit of initialFailures) {
    const school = MASTER_SCHOOLS.find(candidate => candidate.inep === failedAudit.inep);
    if (!school) continue;
    const recoveryStarted = event(runId, "SOURCE_FETCHED", "warning", school.inep, null, "Iniciada reconsulta isolada após falha transitória do PDDEInfo.", {
      sourceUrl: failedAudit.sourceUrl,
      previousAttempts: failedAudit.attempts,
      previousException: failedAudit.exception,
      recoveryPass: true,
    });
    run.auditEvents.push(recoveryStarted);
    await appendAuditTrail(runId, school.inep, [], [recoveryStarted]);
    await delay(3_000);
    const recovered = await fetchSchool(school.inep, school.sme, runId);
    run.audits.push(recovered.audit);
    run.auditEvents.push(...recovered.events);
    if (recovered.record) run.records.push(recovered.record);
    await persistSchoolCollection(runId, recovered.audit, PDDEINFO_PARSER_VERSION);
    await updateAuditRunProgress(runId, effectiveAuditsForValidation(run.audits).length);
    await appendAuditTrail(runId, recovered.audit.inep, recovered.record?.fieldProvenance ?? [], recovered.events);
  }

  // Pilotos complementares e limitados: nunca bloqueiam a execução PDDEInfo nem preenchem
  // campos primários. Uma falha externa é preservada como consulta inconclusiva e o fluxo segue.
  const sigefPilots = [
    { source: "SIGEF_LIBERACAO", execute: () => registerSigefLegacyLiberationPilot(runId, run.records) },
    { source: "SIGEF_EXTRATO", execute: () => registerSigefDirectExtractPilot(runId, run.records) },
  ];
  for (const pilot of sigefPilots) {
    try {
      const result = await pilot.execute();
      run.auditEvents.push(...result.events);
    } catch (cause) {
      const pilotFailure = event(runId, "SOURCE_FETCHED", "warning", null, null, `Piloto ${pilot.source} não concluído; a coleta e os controles do PDDEInfo permanecem válidos.`, {
        source: pilot.source,
        state: "CONSULTA_INCONCLUSIVA",
        exception: cause instanceof Error ? cause.message : "Falha desconhecida",
      });
      run.auditEvents.push(pilotFailure);
      await appendAuditTrail(runId, "00000000", [], [pilotFailure]);
    }
  }

  const baseline = await loadLatestApprovedPaymentSnapshots(runId);
  const historicalFindings = baseline.runId
    ? comparePaymentSnapshots(baseline.snapshots, paymentSnapshotsFromRecords(run.records))
    : [];
  await persistHistoricalFindings(runId, historicalFindings);
  const historicalEvents = historicalFindings.map(finding => event(runId, "FINDING_OPENED", finding.severity, finding.inep, null, finding.message, {
    code: finding.code, logicalKey: finding.logicalKey, previousValue: finding.previousValue, currentValue: finding.currentValue, baselineRunId: baseline.runId,
  }));
  if (!baseline.runId) historicalEvents.push(event(runId, "FIELD_RECONCILED", "info", null, null, "Nenhuma baseline aprovada anterior foi encontrada; comparação histórica adiada para a próxima execução aprovada.", {}));
  run.auditEvents.push(...historicalEvents);
  await appendAuditTrail(runId, "00000000", [], historicalEvents);
  const finalAudits = effectiveAuditsForValidation(run.audits);
  run.validation = validateExtraction(run.records, finalAudits, historicalFindings);
  run.auditEvents.push(event(runId, "FIELD_VALIDATED", run.validation.passed ? "info" : "critical", null, null, "Validações bloqueantes da execução concluídas.", {
    passed: run.validation.passed,
    errors: run.validation.errors,
  }));
  run.completedAt = new Date().toISOString();
  if (!canReleaseDownload(run.validation)) {
    run.status = "BLOCKED";
    await completeAuditRun(runId, "blocked", run.records.length, run.validation);
    onEvent({ type: "complete", validation: run.validation, downloadUrl: null, completed: run.records.length, errors: finalAudits.filter(audit => audit.status === "FAILED").length });
    return run;
  }
  const workbook = await createV2Workbook(run.records, finalAudits, run.validation);
  const stored = await storagePut(`exports/pdde-4cre/${runId}/PDDEInfo_4a_CRE_2026_Visao_Financeira_V2.xlsx`, workbook, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  await persistRunArtifact({ runId, kind: "workbook", storageKey: stored.key, storageUrl: stored.url, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", sha256: createHash("sha256").update(workbook).digest("hex") });
  run.downloadUrl = stored.url;
  run.status = "COMPLETE";
  run.auditEvents.push(event(runId, "WORKBOOK_RELEASED", "info", null, null, "Excel liberado após aprovação dos controles bloqueantes.", {
    storageKey: stored.key,
    downloadUrl: stored.url,
  }));
  await appendAuditTrail(runId, "00000000", [], run.auditEvents.slice(-1));
  await completeAuditRun(runId, "approved", run.records.length, run.validation);
  onEvent({ type: "complete", validation: run.validation, downloadUrl: stored.url, completed: run.records.length, errors: 0 });
  return run;
}
