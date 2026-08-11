import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { extractionRuns, fieldObservations, InsertUser, runAuditEvents, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import type { AuditEvent, FieldProvenance, ValidationSummary } from "./pdde/types";

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

export async function createAuditRun(runId: string, masterCount: number, parserVersion: string) {
  const db = await getAuditDbOrThrow();
  await db.insert(extractionRuns).values({
    id: runId,
    status: "running",
    masterCount,
    processedCount: 0,
    parserVersion,
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

export async function completeAuditRun(
  runId: string,
  status: "approved" | "blocked" | "failed",
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
