import { describe, expect, it } from "vitest";
import { buildHomeFinanceSnapshot } from "../db";

describe("resumo financeiro da Home", () => {
  it("reconhece o rótulo PDDE, mas não confunde PDDE QUALIDADE com a conta do PDDE", () => {
    const snapshot = buildHomeFinanceSnapshot(
      { id: "referencia", completedAt: new Date("2026-08-14T00:00:00Z"), validationJson: null },
      [{ inep: "100", status: "success" }, { inep: "200", status: "success" }],
      [
        { inep: "100", fieldPath: "bankAccounts[0].program", logicalKey: "bank-account:PDDE:program", rawValue: "PDDE", normalizedValueJson: null },
        { inep: "100", fieldPath: "bankAccounts[0].agency", logicalKey: "bank-account:PDDE:agency", rawValue: "0249", normalizedValueJson: null },
        { inep: "100", fieldPath: "bankAccounts[0].account", logicalKey: "bank-account:PDDE:account", rawValue: "0000549665", normalizedValueJson: null },
        { inep: "100", fieldPath: "payments[0].expected", logicalKey: "payment:PDDE Básico:1ª Parcela", rawValue: "100,00", normalizedValueJson: null },
        { inep: "100", fieldPath: "payments[0].paid", logicalKey: "payment:PDDE Básico:1ª Parcela", rawValue: "100,00", normalizedValueJson: null },
        { inep: "200", fieldPath: "bankAccounts[0].program", logicalKey: "bank-account:PDDE QUALIDADE:program", rawValue: "PDDE QUALIDADE", normalizedValueJson: null },
        { inep: "200", fieldPath: "bankAccounts[0].agency", logicalKey: "bank-account:PDDE QUALIDADE:agency", rawValue: "0249", normalizedValueJson: null },
        { inep: "200", fieldPath: "bankAccounts[0].account", logicalKey: "bank-account:PDDE QUALIDADE:account", rawValue: "0000546356", normalizedValueJson: null },
      ],
    );

    expect(snapshot.accountedSchools).toBe(1);
    expect(snapshot.missingBasicAccounts).toBe(1);
    expect(snapshot.totalExpected).toBe(100);
    expect(snapshot.totalPaid).toBe(100);
    expect(snapshot.firstInstallmentPaid).toBe(1);
  });
});

