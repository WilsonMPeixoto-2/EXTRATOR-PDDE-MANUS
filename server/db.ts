import { and, desc, eq, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { extractionRuns, fieldObservations, InsertUser, runArtifacts, runAuditEvents, runFindings, schoolConsultations, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import type { AuditEvent, AuditRecord, FieldProvenance, ValidationSummary } from "./pdde/types";
import type { HistoricalFinding, PaymentSnapshot } from "./pdde/history";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

async function getAuditDbOrThrow() {
  const db = await getDb();
  if (!db) throw new Error("A base de auditoria não está disponível; a execução foi interrompida para não gerar dados sem histórico.");
  return db;
}

export async function createAuditRun(runId: string, masterCount: number, parserVersion: string, createdByUserId: number | null = null) {
  const db = await getAuditDbOrThrow();
  await db.insert(extractionRuns).values({
    id: runId,
    status: "running",
    masterCount,
    processedCount: 0,
    parserVersion,
    createdByUserId,
    validationJson: {},
  });
}

export async function appendAuditTrail(runId: string, inep: string, provenance: FieldProvenance[], events: AuditEvent[]) {
  const db = await getAuditDbOrThrow();
  if (provenance.length > 0) {
    await db.insert(fieldObservations).values(provenance.map(field => ({
      runId,
      inep,
      fieldId: field.fieldId,
      fieldPath: field.fieldPath,
      logicalKey: field.logicalKey,
      source: field.source,
      sourceUrl: field.sourceUrl,
      consultedAt: new Date(field.consultedAt),
      sourceHashSha256: field.sourceHashSha256,
      rawHtmlKey: field.artifact?.rawHtmlKey ?? null,
      normalizedJsonKey: field.artifact?.normalizedJsonKey ?? null,
      rawValue: field.rawValue,
      normalizedValueJson: { value: field.normalizedValue },
      parserVersion: field.parserVersion,
      extractionRule: field.extractionRule,
      selector: field.selector,
      evidenceSnippet: field.evidenceSnippet,
      validationResultsJson: field.validationResults,
      state: field.state,
    })));
  }
  if (events.length > 0) {
    await db.insert(runAuditEvents).values(events.map(auditEvent => ({
      id: auditEvent.eventId,
      runId,
      occurredAt: new Date(auditEvent.occurredAt),
      type: auditEvent.type,
      severity: auditEvent.severity,
      inep: auditEvent.inep,
      fieldId: auditEvent.fieldId,
      message: auditEvent.message,
      payloadJson: auditEvent.payload,
    })));
  }
}

export function schoolConsultationPayload(runId: string, audit: AuditRecord, parserVersion: string) {
  return {
    runId,
    inep: audit.inep,
    sme: audit.sme,
    sourceUrl: audit.sourceUrl,
    consultedAt: new Date(audit.consultedAt ?? new Date().toISOString()),
    status: audit.status === "SUCCESS" ? "success" as const : "failed" as const,
    attempts: audit.attempts,
    httpStatus: audit.httpStatus,
    parserVersion,
    sourceHashSha256: audit.sourceHashSha256,
    rawHtmlKey: audit.rawHtmlKey,
    normalizedJsonKey: audit.normalizedJsonKey,
    programsJson: audit.programsFound,
    unknownDestinationsJson: [],
    validationIssuesJson: audit.exception ? [{ code: "collection-error", level: "failed", message: audit.exception }] : [],
    exception: audit.exception,
  };
}

export function schoolArtifactPayloads(runId: string, audit: AuditRecord) {
  const artifacts: Array<{
    runId: string;
    kind: "raw_html" | "normalized_json";
    storageKey: string;
    storageUrl: string;
    contentType: string;
    sha256: string;
  }> = [];
  if (audit.rawHtmlKey && audit.sourceHashSha256) {
    artifacts.push({ runId, kind: "raw_html", storageKey: audit.rawHtmlKey, storageUrl: `/manus-storage/${audit.rawHtmlKey}`, contentType: "text/html; charset=iso-8859-1", sha256: audit.sourceHashSha256 });
  }
  if (audit.normalizedJsonKey && audit.normalizedHashSha256) {
    artifacts.push({ runId, kind: "normalized_json", storageKey: audit.normalizedJsonKey, storageUrl: `/manus-storage/${audit.normalizedJsonKey}`, contentType: "application/json", sha256: audit.normalizedHashSha256 });
  }
  return artifacts;
}

/** Persiste a consulta e os artefatos somente por inclusão, sem substituir execuções anteriores. */
export async function persistSchoolCollection(runId: string, audit: AuditRecord, parserVersion: string) {
  const db = await getAuditDbOrThrow();
  const artifacts = schoolArtifactPayloads(runId, audit);
  await db.transaction(async transaction => {
    await transaction.insert(schoolConsultations).values(schoolConsultationPayload(runId, audit, parserVersion));
    if (artifacts.length > 0) await transaction.insert(runArtifacts).values(artifacts);
  });
}

export async function persistRunArtifact(input: {
  runId: string;
  kind: "workbook" | "manifest" | "raw_html" | "normalized_json" | "open_data_file" | "sigef_movement_pdf";
  storageKey: string;
  storageUrl: string;
  contentType: string;
  sha256: string;
}) {
  const db = await getAuditDbOrThrow();
  await db.insert(runArtifacts).values(input);
}

export async function loadLatestApprovedPaymentSnapshots(excludeRunId: string): Promise<{ runId: string | null; snapshots: PaymentSnapshot[] }> {
  const db = await getAuditDbOrThrow();
  const baseline = await db.select({ id: extractionRuns.id })
    .from(extractionRuns)
    .where(and(eq(extractionRuns.status, "approved"), ne(extractionRuns.id, excludeRunId)))
    .orderBy(desc(extractionRuns.completedAt), desc(extractionRuns.createdAt))
    .limit(1);
  const runId = baseline[0]?.id;
  if (!runId) return { runId: null, snapshots: [] };
  const observations = await db.select({ inep: fieldObservations.inep, logicalKey: fieldObservations.logicalKey, fieldId: fieldObservations.fieldId, normalizedValueJson: fieldObservations.normalizedValueJson, fieldPath: fieldObservations.fieldPath })
    .from(fieldObservations)
    .where(eq(fieldObservations.runId, runId));
  const snapshots: PaymentSnapshot[] = observations.flatMap(observation => {
    if (!observation.fieldPath.endsWith(".paid")) return [];
    const candidate = observation.normalizedValueJson as { value?: unknown } | null;
    return typeof candidate?.value === "number" && Number.isFinite(candidate.value)
      ? [{ inep: observation.inep, logicalKey: observation.logicalKey, fieldId: observation.fieldId, value: candidate.value }]
      : [];
  });
  return { runId, snapshots };
}

export async function persistHistoricalFindings(runId: string, findings: HistoricalFinding[]) {
  if (findings.length === 0) return;
  const db = await getAuditDbOrThrow();
  await db.insert(runFindings).values(findings.map(finding => ({
    runId, inep: finding.inep, severity: finding.severity, code: finding.code, message: finding.message,
    previousValue: finding.previousValue === null ? null : String(finding.previousValue), currentValue: finding.currentValue === null ? null : String(finding.currentValue),
  })));
}

export async function listPersistedAuditRuns(limit = 25) {
  const db = await getAuditDbOrThrow();
  return db.select().from(extractionRuns).orderBy(desc(extractionRuns.completedAt), desc(extractionRuns.createdAt)).limit(limit);
}

export async function getPersistedAuditRun(runId: string) {
  const db = await getAuditDbOrThrow();
  const rows = await db.select().from(extractionRuns).where(eq(extractionRuns.id, runId)).limit(1);
  return rows[0] ?? null;
}

export async function getPersistedRunAuditOverview(runId: string) {
  const db = await getAuditDbOrThrow();
  const [runs, artifacts, events] = await Promise.all([
    db.select().from(extractionRuns).where(eq(extractionRuns.id, runId)).limit(1),
    db.select().from(runArtifacts).where(eq(runArtifacts.runId, runId)).orderBy(desc(runArtifacts.createdAt)),
    db.select().from(runAuditEvents).where(eq(runAuditEvents.runId, runId)).orderBy(desc(runAuditEvents.occurredAt)),
  ]);
  return { run: runs[0] ?? null, artifacts, events };
}

export async function listRunSchools(runId: string) {
  const db = await getAuditDbOrThrow();
  return db.select().from(schoolConsultations).where(eq(schoolConsultations.runId, runId)).orderBy(schoolConsultations.inep);
}

export async function getSchoolAuditDossier(runId: string, inep: string) {
  const db = await getAuditDbOrThrow();
  const [consultations, observations, events, findings, artifacts] = await Promise.all([
    db.select().from(schoolConsultations).where(and(eq(schoolConsultations.runId, runId), eq(schoolConsultations.inep, inep))),
    db.select().from(fieldObservations).where(and(eq(fieldObservations.runId, runId), eq(fieldObservations.inep, inep))).orderBy(fieldObservations.logicalKey),
    db.select().from(runAuditEvents).where(and(eq(runAuditEvents.runId, runId), eq(runAuditEvents.inep, inep))).orderBy(desc(runAuditEvents.occurredAt)),
    db.select().from(runFindings).where(and(eq(runFindings.runId, runId), eq(runFindings.inep, inep))).orderBy(desc(runFindings.createdAt)),
    db.select().from(runArtifacts).where(eq(runArtifacts.runId, runId)),
  ]);
  const schoolArtifacts = artifacts.filter(artifact => artifact.storageKey.includes(`/${inep}/`));
  return { consultation: consultations[0] ?? null, observations, events, findings, artifacts: schoolArtifacts };
}

export async function listRunFindings(runId: string) {
  const db = await getAuditDbOrThrow();
  return db.select().from(runFindings).where(eq(runFindings.runId, runId)).orderBy(desc(runFindings.severity), desc(runFindings.createdAt));
}

export async function getRunArtifact(runId: string, artifactId: number) {
  const db = await getAuditDbOrThrow();
  const rows = await db.select().from(runArtifacts).where(and(eq(runArtifacts.runId, runId), eq(runArtifacts.id, artifactId))).limit(1);
  return rows[0] ?? null;
}

export async function completeAuditRun(
  runId: string,
  status: "approved" | "partial" | "blocked" | "failed",
  processedCount: number,
  validation: ValidationSummary,
) {
  const db = await getAuditDbOrThrow();
  await db.update(extractionRuns).set({
    status,
    processedCount,
    validationJson: validation,
    completedAt: new Date(),
  }).where(eq(extractionRuns.id, runId));
}

// TODO: add feature queries here as your schema grows.
