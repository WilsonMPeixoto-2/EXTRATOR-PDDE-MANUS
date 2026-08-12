import { index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const extractionRuns = mysqlTable("extraction_runs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  status: mysqlEnum("status", ["running", "approved", "blocked", "failed"]).notNull(),
  masterCount: int("master_count").notNull(),
  processedCount: int("processed_count").notNull().default(0),
  parserVersion: varchar("parser_version", { length: 32 }).notNull(),
  validationJson: json("validation_json").notNull(),
  createdByUserId: int("created_by_user_id"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, table => [index("extraction_runs_status_idx").on(table.status), index("extraction_runs_created_idx").on(table.createdAt)]);

export const schoolConsultations = mysqlTable("school_consultations", {
  id: int("id").autoincrement().primaryKey(),
  runId: varchar("run_id", { length: 64 }).notNull(),
  inep: varchar("inep", { length: 8 }).notNull(),
  sme: varchar("sme", { length: 16 }).notNull(),
  sourceUrl: text("source_url").notNull(),
  consultedAt: timestamp("consulted_at").notNull(),
  status: mysqlEnum("status", ["success", "failed"]).notNull(),
  attempts: int("attempts").notNull(),
  httpStatus: int("http_status"),
  parserVersion: varchar("parser_version", { length: 32 }).notNull(),
  sourceHashSha256: varchar("source_hash_sha256", { length: 64 }),
  rawHtmlKey: text("raw_html_key"),
  normalizedJsonKey: text("normalized_json_key"),
  programsJson: json("programs_json").notNull(),
  unknownDestinationsJson: json("unknown_destinations_json").notNull(),
  validationIssuesJson: json("validation_issues_json").notNull(),
  exception: text("exception"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, table => [index("school_consultations_run_idx").on(table.runId), index("school_consultations_inep_idx").on(table.inep), index("school_consultations_run_inep_idx").on(table.runId, table.inep)]);

export const runArtifacts = mysqlTable("run_artifacts", {
  id: int("id").autoincrement().primaryKey(),
  runId: varchar("run_id", { length: 64 }).notNull(),
  kind: mysqlEnum("kind", ["workbook", "manifest", "raw_html", "normalized_json", "open_data_file"]).notNull(),
  storageKey: text("storage_key").notNull(),
  storageUrl: text("storage_url").notNull(),
  contentType: varchar("content_type", { length: 128 }).notNull(),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, table => [index("run_artifacts_run_idx").on(table.runId), index("run_artifacts_kind_idx").on(table.kind)]);

export const runFindings = mysqlTable("run_findings", {
  id: int("id").autoincrement().primaryKey(),
  runId: varchar("run_id", { length: 64 }).notNull(),
  inep: varchar("inep", { length: 8 }),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).notNull(),
  code: varchar("code", { length: 80 }).notNull(),
  message: text("message").notNull(),
  previousValue: text("previous_value"),
  currentValue: text("current_value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, table => [index("run_findings_run_idx").on(table.runId), index("run_findings_severity_idx").on(table.severity)]);

/**
 * Observações normalizadas por campo. Não possuem updatedAt por desenho: cada execução
 * acrescenta uma nova observação, preservando a comparação histórica.
 */
export const fieldObservations = mysqlTable("field_observations", {
  id: int("id").autoincrement().primaryKey(),
  runId: varchar("run_id", { length: 64 }).notNull(),
  inep: varchar("inep", { length: 8 }).notNull(),
  fieldId: varchar("field_id", { length: 512 }).notNull(),
  fieldPath: varchar("field_path", { length: 255 }).notNull(),
  logicalKey: varchar("logical_key", { length: 255 }).notNull(),
  source: mysqlEnum("source", ["PDDEINFO", "SIGEF_LIBERACAO", "SIGEF_CONTA_CORRENTE", "SIGEF_EXTRATO", "EXTRATO_BB", "DADOS_ABERTOS"]).notNull(),
  sourceUrl: text("source_url").notNull(),
  consultedAt: timestamp("consulted_at").notNull(),
  sourceHashSha256: varchar("source_hash_sha256", { length: 64 }),
  rawHtmlKey: text("raw_html_key"),
  normalizedJsonKey: text("normalized_json_key"),
  rawValue: text("raw_value"),
  normalizedValueJson: json("normalized_value_json"),
  parserVersion: varchar("parser_version", { length: 32 }).notNull(),
  extractionRule: varchar("extraction_rule", { length: 80 }).notNull(),
  selector: text("selector").notNull(),
  evidenceSnippet: text("evidence_snippet"),
  validationResultsJson: json("validation_results_json").notNull(),
  state: varchar("state", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, table => [
  index("field_observations_run_idx").on(table.runId),
  index("field_observations_run_inep_idx").on(table.runId, table.inep),
  index("field_observations_field_idx").on(table.fieldId),
  index("field_observations_logical_idx").on(table.inep, table.logicalKey),
]);

/**
 * Log de auditoria somente de inclusão. Eventos posteriores explicam ou sucedem eventos
 * anteriores, mas não modificam o registro histórico original.
 */
export const runAuditEvents = mysqlTable("run_audit_events", {
  id: varchar("id", { length: 64 }).primaryKey(),
  runId: varchar("run_id", { length: 64 }).notNull(),
  occurredAt: timestamp("occurred_at").notNull(),
  type: mysqlEnum("type", ["RUN_STARTED", "SOURCE_FETCHED", "SOURCE_AUTOMATION_BLOCKED", "SOURCE_SCHEMA_CHANGED", "FIELD_PARSED", "FIELD_VALIDATED", "FIELD_RECONCILED", "FINDING_OPENED", "HUMAN_DECISION", "WORKBOOK_RELEASED"]).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).notNull(),
  inep: varchar("inep", { length: 8 }),
  fieldId: varchar("field_id", { length: 512 }),
  message: text("message").notNull(),
  payloadJson: json("payload_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, table => [
  index("run_audit_events_run_idx").on(table.runId),
  index("run_audit_events_run_inep_idx").on(table.runId, table.inep),
  index("run_audit_events_field_idx").on(table.fieldId),
  index("run_audit_events_type_idx").on(table.type),
]);

export type ExtractionRun = typeof extractionRuns.$inferSelect;
export type SchoolConsultation = typeof schoolConsultations.$inferSelect;
export type RunArtifact = typeof runArtifacts.$inferSelect;
export type RunFinding = typeof runFindings.$inferSelect;
export type FieldObservation = typeof fieldObservations.$inferSelect;
export type RunAuditEvent = typeof runAuditEvents.$inferSelect;
