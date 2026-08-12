import type { EvidenceSource } from "./types";
import { sourceDefinition } from "./sources";

export type SourceCollectionPlan = {
  source: EvidenceSource;
  version: string;
  allowed: boolean;
  maxAttempts: number;
  retryBackoffMs: number;
  reason: string;
};

/**
 * Centraliza os limites da navegação por fonte. Uma fonte sem acesso comprovado
 * nunca recebe um executor; o plano apenas registra o bloqueio de forma auditável.
 */
export function sourceCollectionPlan(source: EvidenceSource): SourceCollectionPlan {
  const definition = sourceDefinition(source);
  const allowed = definition.autonomous && definition.accessState === "AUTONOMOUS_AVAILABLE";
  return {
    source,
    version: source === "PDDEINFO" ? "PDDEINFO_HTTP_RUNNER_V1" : "SOURCE_RUNNER_BLOCKED_V1",
    allowed,
    maxAttempts: allowed ? 3 : 0,
    retryBackoffMs: allowed ? 900 : 0,
    reason: allowed
      ? "Roteiro HTTP público autorizado, parametrizado e versionado."
      : `Coleta autônoma não habilitada: ${definition.accessState}. ${definition.detail}`,
  };
}

export function assertSourceCollectionPermitted(source: EvidenceSource): SourceCollectionPlan {
  const plan = sourceCollectionPlan(source);
  if (!plan.allowed) throw new Error(plan.reason);
  return plan;
}
