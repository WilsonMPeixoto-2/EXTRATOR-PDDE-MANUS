import { describe, expect, it } from "vitest";
import { comparePaymentSnapshots } from "./history";
import { validateExtraction } from "./workbook";

describe("comparação histórica de pagamentos", () => {
  const previous = [{ inep: "33069247", logicalKey: "payment:PDDE_BASIC_P1:paid", fieldId: "old", value: 100 }];

  it("abre achado crítico quando pagamento anteriormente registrado desaparece", () => {
    const findings = comparePaymentSnapshots(previous, [{ ...previous[0], fieldId: "new", value: 0 }]);
    expect(findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "PAYMENT_DISAPPEARED", severity: "critical", previousValue: 100, currentValue: 0 })]));
    expect(validateExtraction([], [], findings).errors.join(" ")).toContain("perda(s) aparente(s) de pagamento");
  });

  it("registra alteração e novo pagamento sem reescrever a baseline", () => {
    const changed = comparePaymentSnapshots(previous, [{ ...previous[0], fieldId: "new", value: 125 }]);
    const created = comparePaymentSnapshots([], [{ ...previous[0], fieldId: "new", value: 125 }]);
    expect(changed).toEqual(expect.arrayContaining([expect.objectContaining({ code: "PAYMENT_VALUE_CHANGED", severity: "warning" })]));
    expect(created).toEqual(expect.arrayContaining([expect.objectContaining({ code: "NEW_PAYMENT_RECORDED", severity: "info" })]));
  });
});
