import express, { type Express } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRunReservationForTest, reserveRunStart } from "./access";

vi.mock("../_core/sdk", () => ({
  sdk: { authenticateRequest: vi.fn() },
}));

vi.mock("./run", () => ({
  getRun: vi.fn(),
  masterListSummary: vi.fn(() => ({ count: 163, unique: 163, valid: true })),
  runExtraction: vi.fn(async (onEvent: (event: unknown) => void) => {
    onEvent({ type: "complete", validation: { passed: false }, downloadUrl: null, completed: 0, errors: 0 });
    return { id: "run-test", status: "BLOCKED" };
  }),
}));

vi.mock("../db", () => ({
  getPersistedAuditRun: vi.fn(),
  getRunArtifact: vi.fn(),
  getSchoolAuditDossier: vi.fn(),
  listPersistedAuditRuns: vi.fn(),
  listRunFindings: vi.fn(),
  listRunSchools: vi.fn(),
}));

vi.mock("../storage", () => ({ storageGetSignedUrl: vi.fn() }));

import { sdk } from "../_core/sdk";
import { listPersistedAuditRuns } from "../db";
import { getRun, runExtraction } from "./run";
import { registerPddeRoutes } from "./routes";

const authenticateRequest = vi.mocked(sdk.authenticateRequest);
const mockedGetRun = vi.mocked(getRun);
const mockedRunExtraction = vi.mocked(runExtraction);
const mockedListPersistedAuditRuns = vi.mocked(listPersistedAuditRuns);

async function request(app: Express, path: string) {
  const server = await new Promise<ReturnType<Express["listen"]>>(resolve => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Porta de teste indisponível");
  try {
    return await fetch(`http://127.0.0.1:${address.port}${path}`);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

function appForTest() {
  const app = express();
  registerPddeRoutes(app);
  return app;
}

describe("rotas operacionais protegidas do PDDE", () => {
  const user = { id: 809 } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    clearRunReservationForTest(user.id);
  });

  afterEach(() => clearRunReservationForTest(user.id));

  it("retorna 401 para lista, fontes, início e status quando não há autenticação", async () => {
    authenticateRequest.mockResolvedValue(null);
    for (const path of ["/api/pdde/master-list", "/api/pdde/sources", "/api/pdde/run", "/api/pdde/run/inexistente", "/api/pdde/audit/runs", "/api/pdde/audit/run/existente", "/api/pdde/audit/run/existente/schools", "/api/pdde/audit/run/existente/school/33069247", "/api/pdde/audit/run/existente/findings", "/api/pdde/audit/run/existente/artifact/1"]) {
      const response = await request(appForTest(), path);
      expect(response.status).toBe(401);
    }
  });

  it("retorna 429 para fontes repetidas e para novo início durante a janela de proteção", async () => {
    authenticateRequest.mockResolvedValue(user);
    const firstSources = await request(appForTest(), "/api/pdde/sources");
    const secondSources = await request(appForTest(), "/api/pdde/sources");
    expect(firstSources.status).toBe(200);
    expect(secondSources.status).toBe(429);

    clearRunReservationForTest(user.id);
    reserveRunStart(user.id);
    const runResponse = await request(appForTest(), "/api/pdde/run");
    expect(runResponse.status).toBe(429);
    expect(runResponse.headers.get("retry-after")).not.toBeNull();
  });

  it("retorna 429 também para lista-mestre e status repetidos", async () => {
    authenticateRequest.mockResolvedValue(user);
    mockedGetRun.mockReturnValue({ id: "run-existente", status: "COMPLETE", records: [], audits: [] } as any);
    const firstMaster = await request(appForTest(), "/api/pdde/master-list");
    const secondMaster = await request(appForTest(), "/api/pdde/master-list");
    expect(firstMaster.status).toBe(200);
    expect(secondMaster.status).toBe(429);

    const firstStatus = await request(appForTest(), "/api/pdde/run/run-existente");
    const secondStatus = await request(appForTest(), "/api/pdde/run/run-existente");
    expect(firstStatus.status).toBe(200);
    expect(secondStatus.status).toBe(429);
  });

  it("permite acesso autenticado ao status existente e início autorizado sem executar coleta real", async () => {
    authenticateRequest.mockResolvedValue(user);
    mockedGetRun.mockReturnValue({ id: "run-existente", status: "COMPLETE", validation: { passed: true }, downloadUrl: "/arquivo.xlsx", records: [], audits: [] } as any);
    const statusResponse = await request(appForTest(), "/api/pdde/run/run-existente");
    expect(statusResponse.status).toBe(200);
    expect(await statusResponse.json()).toMatchObject({ id: "run-existente", status: "COMPLETE" });

    clearRunReservationForTest(user.id);
    const runResponse = await request(appForTest(), "/api/pdde/run");
    expect(runResponse.status).toBe(200);
    expect(mockedRunExtraction).toHaveBeenCalledWith(expect.any(Function), user.id);
  });

  it("permite consultar histórico de auditoria somente após autenticação", async () => {
    authenticateRequest.mockResolvedValue(user);
    mockedListPersistedAuditRuns.mockResolvedValue([{ id: "run-existente", status: "approved", masterCount: 163, processedCount: 163 }] as any);
    const response = await request(appForTest(), "/api/pdde/audit/runs");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ runs: [expect.objectContaining({ id: "run-existente", status: "approved" })] });
  });
});
