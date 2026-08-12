import { describe, expect, it } from "vitest";
import { effectiveAuditsForValidation } from "./run";
import type { AuditRecord } from "./types";

function audit(status: AuditRecord["status"], attempts: number): AuditRecord {
  return {
    inep: "33070784", sme: "0410000", sourceUrl: "https://fonte.test/33070784", consultedAt: "2026-08-12T13:00:00.000Z",
    status, attempts, httpStatus: status === "SUCCESS" ? 200 : null, sourceHashSha256: null, normalizedHashSha256: null,
    rawHtmlKey: null, normalizedJsonKey: null, responseBytes: null, programsFound: [], exception: status === "FAILED" ? "fetch failed" : null,
  };
}

describe("recuperação de coleta PDDEInfo", () => {
  it("mantém ambas as tentativas na trilha, mas valida a tentativa final da mesma unidade", () => {
    const firstFailure = audit("FAILED", 3);
    const recovered = audit("SUCCESS", 1);
    expect(effectiveAuditsForValidation([firstFailure, recovered])).toEqual([recovered]);
  });
});
