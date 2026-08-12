import type { Express, Response } from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { getRun, masterListSummary, runExtraction } from "./run";
import { sourceAutomationCatalog } from "./sources";
import { sdk } from "../_core/sdk";
import { decidePddeAccess, type PddeResource } from "./access";
import { getPersistedAuditRun, getRunArtifact, getSchoolAuditDossier, listPersistedAuditRuns, listRunFindings, listRunSchools } from "../db";
import { storageGetSignedUrl } from "../storage";

function writeEvent(response: Response, payload: unknown) {
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
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
    const user = await authorize(request, response, "run");
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
    if (!run) return response.status(404).json({ message: "Execução não encontrada neste servidor." });
    return response.json({ id: run.id, status: run.status, validation: run.validation, downloadUrl: run.downloadUrl, records: run.records.length, audits: run.audits.length });
  });

  app.get("/api/pdde/audit/runs", async (request, response) => {
    if (!await authorize(request, response, "audit-runs")) return;
    const limit = Math.max(1, Math.min(Number(request.query.limit ?? 25), 100));
    response.json({ runs: await listPersistedAuditRuns(limit) });
  });

  app.get("/api/pdde/audit/run/:runId", async (request, response) => {
    if (!await authorize(request, response, "run-status")) return;
    const run = await getPersistedAuditRun(request.params.runId);
    if (!run) return response.status(404).json({ message: "Execução auditável não encontrada." });
    response.json({ run });
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
