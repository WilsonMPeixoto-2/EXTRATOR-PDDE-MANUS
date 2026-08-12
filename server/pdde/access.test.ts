import { describe, expect, it } from "vitest";
import { clearRunReservationForTest, decidePddeAccess, MINIMUM_OPERATIONAL_REQUEST_INTERVAL_MS, MINIMUM_RUN_INTERVAL_MS, reserveRunStart } from "./access";

describe("proteção de início de execução", () => {
  it("aceita uma execução e limita reinícios consecutivos do mesmo operador", () => {
    const userId = 104;
    clearRunReservationForTest(userId);
    expect(reserveRunStart(userId, 1_000)).toMatchObject({ allowed: true });
    expect(reserveRunStart(userId, 1_001)).toMatchObject({ allowed: false, retryAfterSeconds: Math.ceil((MINIMUM_RUN_INTERVAL_MS - 1) / 1000) });
    expect(reserveRunStart(userId, 1_000 + MINIMUM_RUN_INTERVAL_MS)).toMatchObject({ allowed: true });
  });

  it("nega acesso não autenticado e limita as rotas operacionais de consulta", () => {
    const userId = 105;
    clearRunReservationForTest(userId);
    expect(decidePddeAccess(null, "master-list", 2_000)).toMatchObject({ allowed: false, status: 401 });
    expect(decidePddeAccess(null, "run-status", 2_000)).toMatchObject({ allowed: false, status: 401 });
    expect(decidePddeAccess(userId, "sources", 2_000)).toMatchObject({ allowed: true, status: 200 });
    expect(decidePddeAccess(userId, "sources", 2_001)).toMatchObject({ allowed: false, status: 429 });
    expect(decidePddeAccess(userId, "sources", 2_000 + MINIMUM_OPERATIONAL_REQUEST_INTERVAL_MS)).toMatchObject({ allowed: true, status: 200 });
  });
});
