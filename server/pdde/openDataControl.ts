import { createHash, randomUUID } from "node:crypto";
import { appendAuditTrail, persistRunArtifact } from "../db";
import { storagePut } from "../storage";
import type { AuditEvent } from "./types";

export type OpenDataControlInput = {
  file: Buffer | string;
  sourceUrl: string;
  obtainedAt: string;
  declaredUpdatedAt: string;
  exercise: number;
  columns: string[];
  totalRows: number;
  matchedSchools: number;
};

export type OpenDataControlValidation = {
  passed: boolean;
  fileHashSha256: string;
  coverageRatio: number;
  detectedIdentifier: "INEP" | "CNPJ" | null;
  hasFinancialMeasure: boolean;
  errors: string[];
  warnings: string[];
};

export type OpenDataControlPersistence = {
  store: (key: string, data: Buffer, contentType: string) => Promise<{ key: string; url: string }>;
  persistArtifact: (input: { runId: string; kind: "open_data_file"; storageKey: string; storageUrl: string; contentType: string; sha256: string }) => Promise<void>;
  appendAudit: (runId: string, inep: string, provenance: [], events: AuditEvent[]) => Promise<void>;
};

function normalizedHeader(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function isIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value)) && /\d{4}-\d{2}-\d{2}T/.test(value);
}

/**
 * Dados Abertos do FNDE são controle secundário: este contrato registra identidade,
 * atualização, exercício e cobertura, mas não promove conta, OB ou crédito bancário.
 */
export function validateOpenDataControl(input: OpenDataControlInput): OpenDataControlValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fileHashSha256 = createHash("sha256").update(input.file).digest("hex");
  const headers = input.columns.map(normalizedHeader);
  const detectedIdentifier = headers.some(header => header.includes("INEP")) ? "INEP" : headers.some(header => header.includes("CNPJ")) ? "CNPJ" : null;
  const hasFinancialMeasure = headers.some(header => ["VALOR", "REPASSE", "PAGAMENTO", "SALDO", "CREDITO"].some(measure => header.includes(measure)));
  const coverageRatio = input.totalRows > 0 ? input.matchedSchools / input.totalRows : 0;

  try {
    const parsed = new URL(input.sourceUrl);
    if (parsed.protocol !== "https:") errors.push("A URL de origem do arquivo de Dados Abertos deve usar HTTPS.");
  } catch {
    errors.push("A URL de origem do arquivo de Dados Abertos é inválida.");
  }
  if (!isIsoDate(input.obtainedAt)) errors.push("A data/hora de obtenção deve estar em ISO 8601 com horário.");
  if (!isIsoDate(input.declaredUpdatedAt)) errors.push("A data/hora de atualização declarada pelo arquivo deve estar em ISO 8601 com horário.");
  if (!Number.isInteger(input.exercise) || input.exercise < 2000 || input.exercise > 2100) errors.push("O exercício do arquivo deve ser um ano válido.");
  if (input.totalRows <= 0) errors.push("O arquivo de Dados Abertos não possui linhas de dados.");
  if (input.matchedSchools < 0 || input.matchedSchools > input.totalRows) errors.push("A cobertura de escolas informada é inválida.");
  if (!detectedIdentifier) errors.push("O arquivo deve disponibilizar ao menos uma chave institucional de INEP ou CNPJ.");
  if (!hasFinancialMeasure) errors.push("O arquivo deve disponibilizar ao menos uma medida financeira declarada.");
  if (input.matchedSchools === 0) errors.push("Nenhuma escola da lista-mestre foi localizada no arquivo secundário.");
  if (input.matchedSchools > 0 && input.matchedSchools < 163) warnings.push(`Cobertura parcial: ${input.matchedSchools} de 163 escolas da 4ª CRE encontradas no arquivo secundário.`);
  if (input.declaredUpdatedAt > input.obtainedAt) warnings.push("A data de atualização declarada é posterior ao horário de obtenção; conferir metadado do arquivo.");

  return { passed: errors.length === 0, fileHashSha256, coverageRatio, detectedIdentifier, hasFinancialMeasure, errors, warnings };
}

/**
 * Registra o arquivo secundário como artefato imutável da execução. A função não gera
 * observação financeira nem promove seus dados a fonte primária; somente preserva a
 * validação de controle, hash e metadados para auditoria posterior.
 */
export async function persistOpenDataControl(
  runId: string,
  input: OpenDataControlInput & { fileName: string; contentType: string },
  dependencies: OpenDataControlPersistence = {
    store: storagePut,
    persistArtifact: persistRunArtifact,
    appendAudit: appendAuditTrail,
  },
) {
  const validation = validateOpenDataControl(input);
  if (!validation.passed) throw new Error(`Arquivo de Dados Abertos rejeitado: ${validation.errors.join(" ")}`);
  const file = Buffer.isBuffer(input.file) ? input.file : Buffer.from(input.file, "utf8");
  const fileName = input.fileName.replace(/[^A-Za-z0-9._-]/g, "_");
  const stored = await dependencies.store(`evidence/pdde-4cre/${runId}/dados-abertos/${fileName}`, file, input.contentType);
  await dependencies.persistArtifact({ runId, kind: "open_data_file", storageKey: stored.key, storageUrl: stored.url, contentType: input.contentType, sha256: validation.fileHashSha256 });
  const event: AuditEvent = {
    eventId: randomUUID(), runId, occurredAt: new Date().toISOString(), type: "SOURCE_FETCHED",
    severity: validation.warnings.length > 0 ? "warning" : "info", inep: null, fieldId: null,
    message: "Arquivo de Dados Abertos FNDE registrado como controle secundário; não substitui fonte primária.",
    payload: {
      source: "DADOS_ABERTOS", sourceUrl: input.sourceUrl, fileName, contentType: input.contentType,
      fileHashSha256: validation.fileHashSha256, obtainedAt: input.obtainedAt, declaredUpdatedAt: input.declaredUpdatedAt,
      exercise: input.exercise, totalRows: input.totalRows, matchedSchools: input.matchedSchools,
      coverageRatio: validation.coverageRatio, detectedIdentifier: validation.detectedIdentifier,
      hasFinancialMeasure: validation.hasFinancialMeasure, warnings: validation.warnings,
    },
  };
  await dependencies.appendAudit(runId, "00000000", [], [event]);
  return { validation, artifact: stored, event };
}
