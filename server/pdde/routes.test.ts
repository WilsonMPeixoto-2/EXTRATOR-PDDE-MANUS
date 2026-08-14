import express, { type Express } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRunReservationForTest, reserveRunStart } from "./access";

vi.mock("../_core/sdk", () => ({
  sdk: { authenticateRequest: vi.fn() },
}));

vi.mock("./run", () => ({
  getRun: vi.fn(),
  masterListSummary: vi.fn(() => ({ count: 163, unique: 163, valid: true })),
  registerSecondaryOpenDataControl: vi.fn(),
  runExtraction: vi.fn(async (onEvent: (event: unknown) => void) => {
    onEvent({ type: "complete", validation: { passed: false }, downloadUrl: null, completed: 0, errors: 0 });
    return { id: "run-test", status: "BLOCKED" };
  }),
}));

vi.mock("../db", () => ({
  appendAuditTrail: vi.fn(),
  completeAuditRun: vi.fn(),
  getPersistedAuditRun: vi.fn(),
  getPersistedRunAuditOverview: vi.fn(),
  getSigefAuditCoverage: vi.fn(),
  getRunArtifact: vi.fn(),
  getSchoolAuditDossier: vi.fn(),
  listPersistedAuditRuns: vi.fn(),
  listRunFindings: vi.fn(),
  listRunSchools: vi.fn(),
}));

vi.mock("../storage", () => ({ storageGetSignedUrl: vi.fn() }));

import { sdk } from "../_core/sdk";
import { appendAuditTrail, completeAuditRun, getPersistedAuditRun, getPersistedRunAuditOverview, getSigefAuditCoverage, listPersistedAuditRuns, listRunSchools } from "../db";
import { getRun, registerSecondaryOpenDataControl, runExtraction } from "./run";
import { registerPddeRoutes } from "./routes";

const authenticateRequest = vi.mocked(sdk.authenticateRequest);
const mockedGetRun = vi.mocked(getRun);
const mockedRunExtraction = vi.mocked(runExtraction);
const mockedListPersistedAuditRuns = vi.mocked(listPersistedAuditRuns);
const mockedGetPersistedAuditRun = vi.mocked(getPersistedAuditRun);
const mockedGetPersistedRunAuditOverview = vi.mocked(getPersistedRunAuditOverview);
const mockedGetSigefAuditCoverage = vi.mocked(getSigefAuditCoverage);
const mockedRegisterSecondaryOpenDataControl = vi.mocked(registerSecondaryOpenDataControl);
const mockedListRunSchools = vi.mocked(listRunSchools);
const mockedAppendAuditTrail = vi.mocked(appendAuditTrail);
const mockedCompleteAuditRun = vi.mocked(completeAuditRun);

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

async function requestJson(app: Express, path: string, body: unknown) {
  const server = await new Promise<ReturnType<Express["listen"]>>(resolve => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Porta de teste indisponível");
  try {
    return await fetch(`http://127.0.0.1:${address.port}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

function appForTest() {
  const app = express();
  app.use(express.json({ limit: "11mb" }));
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
    for (const path of ["/api/pdde/master-list", "/api/pdde/sources", "/api/pdde/run", "/api/pdde/run/inexistente", "/api/pdde/audit/runs", "/api/pdde/audit/sigef-coverage", "/api/pdde/audit/run/existente", "/api/pdde/audit/run/existente/schools", "/api/pdde/audit/run/existente/school/33069247", "/api/pdde/audit/run/existente/findings", "/api/pdde/audit/run/existente/artifact/1"]) {
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

  it("encerra como falha auditável a execução persistida sem trabalhador ativo", async () => {
    authenticateRequest.mockResolvedValue(user);
    mockedGetRun.mockReturnValue(undefined);
    mockedListRunSchools.mockResolvedValue(Array.from({ length: 156 }, (_, index) => ({ inep: String(index) })) as any);
    mockedGetPersistedRunAuditOverview
      .mockResolvedValueOnce({ run: { id: "run-interrompida", status: "running", processedCount: 0, validationJson: {} }, artifacts: [], events: [] } as any)
      .mockResolvedValueOnce({ run: { id: "run-interrompida", status: "failed", processedCount: 156, validationJson: { passed: false, errors: ["interrompida"] } }, artifacts: [], events: [] } as any);

    const response = await request(appForTest(), "/api/pdde/run/run-interrompida");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "run-interrompida", status: "failed", records: 156, persisted: true });
    expect(mockedAppendAuditTrail).toHaveBeenCalledWith("run-interrompida", "00000000", [], [expect.objectContaining({ severity: "critical", payload: { recoveredConsultations: 156, reason: "server-restart-without-active-worker" } })]);
    expect(mockedCompleteAuditRun).toHaveBeenCalledWith("run-interrompida", "failed", 156, expect.objectContaining({ passed: false }));
  });

  it("permite consultar histórico de auditoria somente após autenticação", async () => {
    authenticateRequest.mockResolvedValue(user);
    mockedListPersistedAuditRuns.mockResolvedValue([{ id: "run-existente", status: "approved", masterCount: 163, processedCount: 163 }] as any);
    const response = await request(appForTest(), "/api/pdde/audit/runs");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ runs: [expect.objectContaining({ id: "run-existente", status: "approved" })] });
  });

  it("expõe cobertura SIGEF única sobre a referência PDDEInfo sem substituir suas escolas", async () => {
    authenticateRequest.mockResolvedValue(user);
    mockedGetSigefAuditCoverage.mockResolvedValue({ referenceMasterCount: 163, coveredUex: 20, contributingRuns: 2, lastCollectedAt: "2026-08-14T19:00:00.000Z" });
    const response = await request(appForTest(), "/api/pdde/audit/sigef-coverage");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ coverage: { referenceMasterCount: 163, coveredUex: 20, contributingRuns: 2, lastCollectedAt: "2026-08-14T19:00:00.000Z" } });
  });

  it("retorna nome da unidade na lista operacional da auditoria", async () => {
    authenticateRequest.mockResolvedValue(user);
    mockedListRunSchools.mockResolvedValue([{ inep: "33069247", sme: "0410001", schoolName: "EM EMA NEGRAO DE LIMA", status: "success", programsJson: ["PDDE"] }] as any);
    const response = await request(appForTest(), "/api/pdde/audit/run/run-existente/schools");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ schools: [expect.objectContaining({ inep: "33069247", schoolName: "EM EMA NEGRAO DE LIMA" })] });
  });

  it("recupera a última execução aprovada com o link persistido do Excel", async () => {
    authenticateRequest.mockResolvedValue(user);
    mockedListPersistedAuditRuns.mockResolvedValue([{ id: "run-aprovada", status: "approved", masterCount: 163, processedCount: 163 }] as any);
    mockedGetPersistedRunAuditOverview.mockResolvedValue({
      run: { id: "run-aprovada", status: "approved", processedCount: 163, validationJson: { passed: true, errors: [] } },
      artifacts: [],
      events: [{ type: "WORKBOOK_RELEASED", payloadJson: { downloadUrl: "/manus-storage/exports/run-aprovada.xlsx" } }],
    } as any);

    const response = await request(appForTest(), "/api/pdde/latest-approved");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "run-aprovada", status: "approved", records: 163, validation: { passed: true }, downloadUrl: "/manus-storage/exports/run-aprovada.xlsx", persisted: true });
  });

  it("registra arquivo secundário autenticado e o recupera no detalhe auditável da execução", async () => {
    authenticateRequest.mockResolvedValue(user);
    mockedGetPersistedAuditRun.mockResolvedValue({ id: "run-existente", status: "approved" } as any);
    mockedRegisterSecondaryOpenDataControl.mockResolvedValue({ validation: { passed: true, fileHashSha256: "a".repeat(64) }, artifact: { key: "evidence/run/dados-abertos/pdde.csv", url: "/manus-storage/pdde.csv" }, event: { type: "SOURCE_FETCHED" } } as any);
    const importResponse = await requestJson(appForTest(), "/api/pdde/audit/run/run-existente/open-data", {
      contentBase64: Buffer.from("INEP,VALOR\n00000001,100").toString("base64"), fileName: "pdde.csv", contentType: "text/csv",
      sourceUrl: "https://dados.gov.br/fnde-pdde", obtainedAt: "2026-08-12T10:00:00.000Z", declaredUpdatedAt: "2026-08-11T00:00:00.000Z",
      exercise: 2026, columns: ["INEP", "VALOR"], totalRows: 163, matchedSchools: 163,
    });
    expect(importResponse.status).toBe(201);
    expect(mockedRegisterSecondaryOpenDataControl).toHaveBeenCalledWith("run-existente", expect.objectContaining({ fileName: "pdde.csv", exercise: 2026, matchedSchools: 163 }));

    clearRunReservationForTest(user.id);
    mockedGetPersistedRunAuditOverview.mockResolvedValue({ run: { id: "run-existente", status: "approved" }, artifacts: [{ id: 22, kind: "open_data_file", storageKey: "evidence/run/dados-abertos/pdde.csv" }], events: [{ id: "event-1", payloadJson: { source: "DADOS_ABERTOS" } }] } as any);
    const overviewResponse = await request(appForTest(), "/api/pdde/audit/run/run-existente");
    expect(overviewResponse.status).toBe(200);
    expect(await overviewResponse.json()).toMatchObject({ artifacts: [expect.objectContaining({ kind: "open_data_file" })], events: [expect.objectContaining({ payloadJson: { source: "DADOS_ABERTOS" } })] });
  });

  it("recupera na auditoria o artefato e as limitações de uma execução SIGEF parcial", async () => {
    authenticateRequest.mockResolvedValue(user);
    mockedGetPersistedRunAuditOverview.mockResolvedValue({
      run: {
        id: "pilot-sigef-parcial", status: "partial",
        validationJson: { passed: true, sourceLimitations: ["Programa/ação não disponível no relatório", "Conta destinatária não disponível no relatório"] },
      },
      artifacts: [{ id: 31, kind: "sigef_movement_pdf", storageKey: "evidence/run/sigef/movimentacao.pdf", sha256: "b".repeat(64) }],
      events: [{ id: "event-sigef-1", type: "SOURCE_FETCHED", payloadJson: { source: "SIGEF_EXTRATO", reconciliationReadiness: "EVIDENCIA_PARCIAL_SEM_PROGRAMA_PARCELA_E_CONTA_DESTINATARIA" } }],
    } as any);

    const response = await request(appForTest(), "/api/pdde/audit/run/pilot-sigef-parcial");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      run: { id: "pilot-sigef-parcial", status: "partial", validationJson: { sourceLimitations: expect.arrayContaining(["Programa/ação não disponível no relatório"]) } },
      artifacts: [expect.objectContaining({ kind: "sigef_movement_pdf", sha256: "b".repeat(64) })],
      events: [{ id: "event-sigef-1", type: "SOURCE_FETCHED", payloadJson: { source: "SIGEF_EXTRATO", reconciliationReadiness: "EVIDENCIA_PARCIAL_SEM_PROGRAMA_PARCELA_E_CONTA_DESTINATARIA" } }],
    });
  });
});
