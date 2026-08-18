import type { Express, Response } from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { getRun, masterListSummary, registerSecondaryOpenDataControl, runExtraction } from "./run";
import { appendAuditTrail, completeAuditRun, getCguTransferSummary, getHomeFinanceSummary, getSigefAuditCoverage, listSourceImportRuns } from "../db";
import { sourceAutomationCatalog } from "./sources";
import { sdk } from "../_core/sdk";
import { decidePddeAccess, type PddeResource } from "./access";
import { getPersistedAuditRun, getPersistedRunAuditOverview, getRunArtifact, getSchoolAuditDossier, listPersistedAuditRuns, listRunFindings, listRunSchools } from "../db";
import { storageGetSignedUrl } from "../storage";
import { currentAndPreviousReferencePeriods, importCguTransfers } from "./cguTransferencias";

function writeEvent(response: Response, payload: unknown) {
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function restoredRunPayload(overview: Awaited<ReturnType<typeof getPersistedRunAuditOverview>>) {
  if (!overview.run) return null;
  const workbookArtifact = overview.artifacts.find(artifact => artifact.kind === "workbook");
  const releasedEvent = overview.events.find(event => event.type === "WORKBOOK_RELEASED");
  const eventDownloadUrl = typeof (releasedEvent?.payloadJson as { downloadUrl?: unknown } | undefined)?.downloadUrl === "string"
    ? (releasedEvent?.payloadJson as { downloadUrl: string }).downloadUrl
    : null;
  return {
    id: overview.run.id,
    status: overview.run.status,
    validation: overview.run.validationJson,
    downloadUrl: eventDownloadUrl ?? workbookArtifact?.storageUrl ?? null,
    records: overview.run.processedCount,
    audits: overview.run.processedCount,
    persisted: true,
  };
}

async function authorize(request: ExpressRequest, response: ExpressResponse, resource: PddeResource) {
  const user = await sdk.authenticateRequest(request).catch(() => null);
  const decision = decidePddeAccess(user?.id ?? null, resource);
  if (!decision.allowed) {
    if (decision.status === 429) response.setHeader("Retry-After", String(decision.retryAfterSeconds));
    response.status(decision.status).json({ message: decision.message });
    return null;
  }
  return user;
}

async function authorizeRunStream(request: ExpressRequest, response: ExpressResponse) {
  const user = await sdk.authenticateRequest(request).catch(() => null);
  const decision = decidePddeAccess(user?.id ?? null, "run");
  if (decision.allowed) return user;
  response.status(200);
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.flushHeaders();
  writeEvent(response, { type: "fatal", message: decision.message });
  response.end();
  return null;
}

export function registerPddeRoutes(app: Express) {
  app.get("/api/pdde/master-list", async (request, response) => {
    if (!await authorize(request, response, "master-list")) return;
    response.json(masterListSummary());
  });

  app.get("/api/pdde/sources", async (request, response) => {
    if (!await authorize(request, response, "sources")) return;
    response.json({ sources: sourceAutomationCatalog() });
  });

  app.get("/api/pdde/run", async (request, response) => {
    const user = await authorizeRunStream(request, response);
    if (!user) return;
    response.status(200);
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();
    let closed = false;
    request.on("close", () => { closed = true; });
    try {
      await runExtraction(event => { if (!closed) writeEvent(response, event); }, user.id);
    } catch (error) {
      writeEvent(response, { type: "fatal", message: error instanceof Error ? error.message : "Falha inesperada na extração." });
    } finally {
      response.end();
    }
  });

  app.get("/api/pdde/run/:runId", async (request, response) => {
    if (!await authorize(request, response, "run-status")) return;
    const run = getRun(request.params.runId);
    if (run) return response.json({ id: run.id, status: run.status, validation: run.validation, downloadUrl: run.downloadUrl, records: run.records.length, audits: run.audits.length, persisted: false });
    let overview = await getPersistedRunAuditOverview(request.params.runId);
    if (overview.run?.status === "running") {
      const schools = await listRunSchools(request.params.runId);
      const interruptedAt = new Date().toISOString();
      const validation = {
        passed: false,
        uniqueIneps: schools.length,
        firstInstallmentPaid: 0,
        secondInstallmentExpected: 0,
        missingBasicAccounts: 0,
        errors: [`A execução foi interrompida pelo reinício do servidor após ${schools.length}/163 consulta(s) persistida(s). As evidências já coletadas permanecem disponíveis na auditoria; inicie uma nova execução para obter um Excel validado.`],
      };
      await appendAuditTrail(request.params.runId, "00000000", [], [{
        eventId: `interrupted-${request.params.runId}-${Date.now()}`,
        runId: request.params.runId,
        occurredAt: interruptedAt,
        type: "FIELD_VALIDATED",
        severity: "critical",
        inep: null,
        fieldId: null,
        message: validation.errors[0],
        payload: { recoveredConsultations: schools.length, reason: "server-restart-without-active-worker" },
      }]);
      await completeAuditRun(request.params.runId, "failed", schools.length, validation);
      overview = await getPersistedRunAuditOverview(request.params.runId);
    }
    const payload = restoredRunPayload(overview);
    if (!payload) return response.status(404).json({ message: "Execução auditável não encontrada." });
    return response.json(payload);
  });

  app.get("/api/pdde/latest-approved", async (request, response) => {
    if (!await authorize(request, response, "run-status")) return;
    const latestApproved = (await listPersistedAuditRuns(100)).find(run =>
      run.status === "approved" && Number(run.masterCount) === 163 && Number(run.processedCount) === 163,
    );
    if (!latestApproved) return response.status(404).json({ message: "Nenhuma execução aprovada foi encontrada." });
    const payload = restoredRunPayload(await getPersistedRunAuditOverview(latestApproved.id));
    if (!payload) return response.status(404).json({ message: "A execução aprovada não pôde ser recuperada." });
    return response.json(payload);
  });

  app.get("/api/pdde/home/finance-summary", async (request, response) => {
    if (!await authorize(request, response, "run-status")) return;
    response.json(await getHomeFinanceSummary());
  });

  app.get("/api/pdde/home/schools", async (request, response) => {
    if (!await authorize(request, response, "run-status")) return;
    const latestApproved = (await listPersistedAuditRuns(100)).find(run =>
      run.status === "approved" && Number(run.masterCount) === 163 && Number(run.processedCount) === 163,
    );
    if (!latestApproved) return response.status(404).json({ message: "Nenhuma execução aprovada foi encontrada." });
    response.json({ runId: latestApproved.id, schools: await listRunSchools(latestApproved.id) });
  });

  app.get("/api/pdde/audit/runs", async (request, response) => {
    if (!await authorize(request, response, "audit-runs")) return;
    const limit = Math.max(1, Math.min(Number(request.query.limit ?? 25), 100));
    response.json({ runs: await listPersistedAuditRuns(limit) });
  });

  app.get("/api/pdde/audit/sigef-coverage", async (request, response) => {
    if (!await authorize(request, response, "audit-sigef-coverage")) return;
    response.json({ coverage: await getSigefAuditCoverage() });
  });

  app.post("/api/pdde/import/cgu-transferencias", async (request, response) => {
    if (!await authorize(request, response, "cgu-import")) return;
    const referencePeriods = currentAndPreviousReferencePeriods();
    const results = await Promise.allSettled(referencePeriods.map(referencePeriod => importCguTransfers(referencePeriod)));
    const imports = results.map((result, index) => result.status === "fulfilled"
      ? { referencePeriod: referencePeriods[index], ok: true as const, result: result.value }
      : { referencePeriod: referencePeriods[index], ok: false as const, message: result.reason instanceof Error ? result.reason.message : "Falha não especificada na importação CGU." },
    );
    const hasSuccess = imports.some(item => item.ok);
    response.status(hasSuccess ? 200 : 502).json({
      imports,
      notice: "A CGU é uma fonte complementar: suas transferências não confirmam crédito bancário nem alteram conta, parcela ou pagamento do PDDEInfo.",
    });
  });

  app.get("/api/pdde/import/runs", async (request, response) => {
    if (!await authorize(request, response, "source-import-runs")) return;
    const limit = Math.max(1, Math.min(Number(request.query.limit ?? 25), 100));
    const referencePeriod = typeof request.query.referencePeriod === "string" ? request.query.referencePeriod : null;
    const runs = await listSourceImportRuns(limit);
    const cguSummary = referencePeriod && /^202[56]-(0[1-9]|1[0-2])$/.test(referencePeriod)
      ? await getCguTransferSummary(referencePeriod)
      : null;
    response.json({ runs, cguSummary });
  });

  app.get("/api/pdde/audit/run/:runId", async (request, response) => {
    if (!await authorize(request, response, "run-status")) return;
    const overview = await getPersistedRunAuditOverview(request.params.runId);
    if (!overview.run) return response.status(404).json({ message: "Execução auditável não encontrada." });
    response.json(overview);
  });

  app.post("/api/pdde/audit/run/:runId/open-data", async (request, response) => {
    if (!await authorize(request, response, "open-data-import")) return;
    const run = await getPersistedAuditRun(request.params.runId);
    if (!run) return response.status(404).json({ message: "Execução auditável não encontrada." });
    const body = request.body as Record<string, unknown>;
    const contentBase64 = typeof body.contentBase64 === "string" ? body.contentBase64 : "";
    const columns = Array.isArray(body.columns) && body.columns.every(column => typeof column === "string") ? body.columns : [];
    const bytes = Buffer.from(contentBase64, "base64");
    if (!contentBase64 || bytes.length === 0 || bytes.length > 10 * 1024 * 1024) return response.status(400).json({ message: "Arquivo secundário inválido ou superior a 10 MB." });
    try {
      const result = await registerSecondaryOpenDataControl(request.params.runId, {
        file: bytes,
        fileName: typeof body.fileName === "string" ? body.fileName : "dados_abertos.csv",
        contentType: typeof body.contentType === "string" ? body.contentType : "text/csv",
        sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl : "",
        obtainedAt: typeof body.obtainedAt === "string" ? body.obtainedAt : "",
        declaredUpdatedAt: typeof body.declaredUpdatedAt === "string" ? body.declaredUpdatedAt : "",
        exercise: typeof body.exercise === "number" ? body.exercise : Number.NaN,
        columns,
        totalRows: typeof body.totalRows === "number" ? body.totalRows : Number.NaN,
        matchedSchools: typeof body.matchedSchools === "number" ? body.matchedSchools : Number.NaN,
      });
      response.status(201).json({ validation: result.validation, artifact: { storageKey: result.artifact.key, sha256: result.validation.fileHashSha256 }, event: result.event });
    } catch (error) {
      response.status(400).json({ message: error instanceof Error ? error.message : "Não foi possível registrar o arquivo secundário." });
    }
  });

  app.get("/api/pdde/audit/run/:runId/schools", async (request, response) => {
    if (!await authorize(request, response, "audit-schools")) return;
    response.json({ schools: await listRunSchools(request.params.runId) });
  });

  app.get("/api/pdde/audit/run/:runId/school/:inep", async (request, response) => {
    if (!await authorize(request, response, "audit-dossier")) return;
    response.json(await getSchoolAuditDossier(request.params.runId, request.params.inep));
  });

  app.get("/api/pdde/audit/run/:runId/findings", async (request, response) => {
    if (!await authorize(request, response, "audit-findings")) return;
    response.json({ findings: await listRunFindings(request.params.runId) });
  });

  app.get("/api/pdde/audit/run/:runId/artifact/:artifactId", async (request, response) => {
    if (!await authorize(request, response, "artifact")) return;
    const artifactId = Number(request.params.artifactId);
    if (!Number.isSafeInteger(artifactId) || artifactId < 1) return response.status(400).json({ message: "Identificador de artefato inválido." });
    const artifact = await getRunArtifact(request.params.runId, artifactId);
    if (!artifact) return response.status(404).json({ message: "Artefato não encontrado para esta execução." });
    const url = await storageGetSignedUrl(artifact.storageKey);
    response.json({ artifact: { id: artifact.id, kind: artifact.kind, sha256: artifact.sha256, contentType: artifact.contentType, url } });
  });
}
