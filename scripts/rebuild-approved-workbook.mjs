import crypto from "node:crypto";
import { appendAuditTrail, getPersistedAuditRun, listRunSchools, persistRunArtifact } from "../server/db.ts";
import { createV2Workbook } from "../server/pdde/workbook.ts";
import { storageGetSignedUrl, storagePut } from "../server/storage.ts";

const runId = process.argv[2];
if (!runId) throw new Error("Uso: pnpm exec tsx scripts/rebuild-approved-workbook.mjs <run-id-aprovada>");

const run = await getPersistedAuditRun(runId);
if (!run || run.status !== "approved") throw new Error("A reconstrução exige uma execução aprovada existente.");

const consultations = await listRunSchools(runId);
const successful = consultations.filter(consultation => consultation.status === "success" && consultation.normalizedJsonKey);
if (successful.length !== run.processedCount) {
  throw new Error(`A execução possui ${successful.length}/${run.processedCount} JSONs normalizados recuperáveis; o Excel não será reconstruído.`);
}

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function loadNormalizedRecord(consultation) {
  const normalizedJsonKey = consultation.normalizedJsonKey;
  if (!normalizedJsonKey) throw new Error(`JSON normalizado ausente para INEP ${consultation.inep}.`);
  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const signedUrl = await storageGetSignedUrl(normalizedJsonKey);
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error.message : "falha desconhecida";
      if (attempt < 3) await delay(attempt * 800);
    }
  }
  throw new Error(`JSON normalizado indisponível para INEP ${consultation.inep} após retentativas: ${lastError}`);
}

const records = [];
for (const consultation of successful) {
  records.push(await loadNormalizedRecord(consultation));
  await delay(120);
}

const audits = consultations.map(consultation => ({
  inep: consultation.inep,
  sme: consultation.sme,
  sourceUrl: consultation.sourceUrl,
  consultedAt: consultation.consultedAt?.toISOString() ?? null,
  status: consultation.status === "success" ? "SUCCESS" : "FAILED",
  attempts: consultation.attempts,
  httpStatus: consultation.httpStatus,
  sourceHashSha256: consultation.sourceHashSha256,
  normalizedHashSha256: null,
  rawHtmlKey: consultation.rawHtmlKey,
  normalizedJsonKey: consultation.normalizedJsonKey,
  responseBytes: null,
  programsFound: Array.isArray(consultation.programsJson) ? consultation.programsJson : [],
  exception: consultation.exception,
}));

const validation = run.validationJson;
const workbook = await createV2Workbook(records, audits, validation);
const artifact = await storagePut(`exports/pdde-4cre/${runId}/Financeiro_4CRE_2026_analitico.xlsx`, workbook, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
const sha256 = crypto.createHash("sha256").update(workbook).digest("hex");
await persistRunArtifact({ runId, kind: "workbook", storageKey: artifact.key, storageUrl: artifact.url, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", sha256 });
await appendAuditTrail(runId, "00000000", [], [{
  eventId: crypto.randomUUID(),
  runId,
  occurredAt: new Date().toISOString(),
  type: "WORKBOOK_RELEASED",
  severity: "info",
  inep: null,
  fieldId: null,
  message: "Excel reorganizado a partir dos JSONs normalizados já preservados; nenhuma página externa foi consultada novamente.",
  payload: { downloadUrl: artifact.url, storageKey: artifact.key, sha256, rebuiltFromNormalizedEvidence: true, recordCount: records.length },
}]);

console.log(JSON.stringify({ runId, records: records.length, workbookUrl: artifact.url, storageKey: artifact.key, sha256 }, null, 2));
