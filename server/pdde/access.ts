const recentRunStarts = new Map<number, number>();
const recentOperationalRequests = new Map<string, number>();
export const MINIMUM_RUN_INTERVAL_MS = 5 * 60 * 1000;
export const MINIMUM_OPERATIONAL_REQUEST_INTERVAL_MS = 750;

export type PddeResource = "master-list" | "sources" | "run" | "run-status" | "audit-runs" | "audit-sigef-coverage" | "audit-schools" | "audit-dossier" | "audit-findings" | "artifact" | "open-data-import" | "cgu-import" | "source-import-runs";

export type PddeAccessDecision = { allowed: true; status: 200; retryAfterSeconds: 0 } | { allowed: false; status: 401 | 429; retryAfterSeconds: number; message: string };

export function decidePddeAccess(userId: number | null, resource: PddeResource, now = Date.now()): PddeAccessDecision {
  if (!userId) return { allowed: false, status: 401, retryAfterSeconds: 0, message: "Autenticação institucional necessária para acessar a operação PDDE." };
  if (resource === "run") {
    const reservation = reserveRunStart(userId, now);
    return reservation.allowed ? { allowed: true, status: 200, retryAfterSeconds: 0 } : { allowed: false, status: 429, retryAfterSeconds: reservation.retryAfterSeconds, message: `Aguarde ${reservation.retryAfterSeconds} segundos antes de iniciar outra execução.` };
  }
  const key = `${userId}:${resource}`;
  const previous = recentOperationalRequests.get(key);
  if (previous !== undefined && now - previous < MINIMUM_OPERATIONAL_REQUEST_INTERVAL_MS) {
    return { allowed: false, status: 429, retryAfterSeconds: Math.max(1, Math.ceil((MINIMUM_OPERATIONAL_REQUEST_INTERVAL_MS - (now - previous)) / 1000)), message: "Aguarde antes de repetir a consulta operacional." };
  }
  recentOperationalRequests.set(key, now);
  return { allowed: true, status: 200, retryAfterSeconds: 0 };
}

export function reserveRunStart(userId: number, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
  const previous = recentRunStarts.get(userId);
  if (previous !== undefined && now - previous < MINIMUM_RUN_INTERVAL_MS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((MINIMUM_RUN_INTERVAL_MS - (now - previous)) / 1000) };
  }
  recentRunStarts.set(userId, now);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearRunReservationForTest(userId: number) {
  recentRunStarts.delete(userId);
  for (const key of Array.from(recentOperationalRequests.keys())) if (key.startsWith(`${userId}:`)) recentOperationalRequests.delete(key);
}
