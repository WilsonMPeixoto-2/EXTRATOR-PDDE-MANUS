import type { Express, Response } from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { getRun, masterListSummary, runExtraction } from "./run";
import { sourceAutomationCatalog } from "./sources";
import { sdk } from "../_core/sdk";
import { decidePddeAccess, type PddeResource } from "./access";

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
}
