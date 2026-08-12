import type { Express, Response } from "express";
import { getRun, masterListSummary, runExtraction } from "./run";
import { sourceAutomationCatalog } from "./sources";

function writeEvent(response: Response, payload: unknown) {
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function registerPddeRoutes(app: Express) {
  app.get("/api/pdde/master-list", (_request, response) => {
    response.json(masterListSummary());
  });

  app.get("/api/pdde/sources", (_request, response) => {
    response.json({ sources: sourceAutomationCatalog() });
  });

  app.get("/api/pdde/run", async (request, response) => {
    response.status(200);
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();
    let closed = false;
    request.on("close", () => { closed = true; });
    try {
      await runExtraction(event => { if (!closed) writeEvent(response, event); });
    } catch (error) {
      writeEvent(response, { type: "fatal", message: error instanceof Error ? error.message : "Falha inesperada na extração." });
    } finally {
      response.end();
    }
  });

  app.get("/api/pdde/run/:runId", (request, response) => {
    const run = getRun(request.params.runId);
    if (!run) return response.status(404).json({ message: "Execução não encontrada neste servidor." });
    return response.json({ id: run.id, status: run.status, validation: run.validation, downloadUrl: run.downloadUrl, records: run.records.length, audits: run.audits.length });
  });
}
