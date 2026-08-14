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
  if (source === "SIGEF_LIBERACAO" && allowed) {
    return {
      source,
      version: "SIGEF_LEGACY_LIBERACAO_HTTP_V1",
      allowed: true,
      maxAttempts: 2,
      retryBackoffMs: 1_200,
      reason: "Rota SIGEF legada pública comprovada em piloto; a coleta é limitada a CNPJs UEx confirmados e preserva a resposta HTML por consulta.",
    };
  }
  if (source === "SIGEF_EXTRATO" && allowed) {
    return {
      source,
      version: "SIGEF_DIRECT_EXTRATO_HTTP_V1",
      allowed: true,
      maxAttempts: 2,
      retryBackoffMs: 1_200,
      reason: "Detalhamento público SIGEF comprovado em piloto para contas PDDE Básico explicitamente declaradas, Banco do Brasil e programa 02; a coleta preserva HTML, paginação e evidência por consulta.",
    };
  }
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
