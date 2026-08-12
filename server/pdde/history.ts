import type { FieldProvenance, SchoolExtraction } from "./types";

export type PaymentSnapshot = {
  inep: string;
  logicalKey: string;
  value: number;
  fieldId: string;
};

export type HistoricalFinding = {
  severity: "info" | "warning" | "critical";
  code: "PAYMENT_DISAPPEARED" | "PAYMENT_VALUE_CHANGED" | "NEW_PAYMENT_RECORDED";
  inep: string;
  logicalKey: string;
  previousValue: number | null;
  currentValue: number | null;
  message: string;
};

function numericValue(field: FieldProvenance): number | null {
  return typeof field.normalizedValue === "number" && Number.isFinite(field.normalizedValue) ? field.normalizedValue : null;
}

export function paymentSnapshotsFromRecords(records: SchoolExtraction[]): PaymentSnapshot[] {
  return records.flatMap(record => record.fieldProvenance
    .filter(field => field.fieldPath.endsWith(".paid"))
    .flatMap(field => {
      const value = numericValue(field);
      return value === null ? [] : [{ inep: record.inep, logicalKey: field.logicalKey, value, fieldId: field.fieldId }];
    }));
}

export function comparePaymentSnapshots(previous: PaymentSnapshot[], current: PaymentSnapshot[]): HistoricalFinding[] {
  const previousByKey = new Map(previous.map(snapshot => [`${snapshot.inep}:${snapshot.logicalKey}`, snapshot]));
  const currentByKey = new Map(current.map(snapshot => [`${snapshot.inep}:${snapshot.logicalKey}`, snapshot]));
  const findings: HistoricalFinding[] = [];

  for (const [key, before] of Array.from(previousByKey.entries())) {
    const after = currentByKey.get(key);
    if (before.value > 0 && (!after || after.value <= 0)) {
      findings.push({ severity: "critical", code: "PAYMENT_DISAPPEARED", inep: before.inep, logicalKey: before.logicalKey, previousValue: before.value, currentValue: after?.value ?? null, message: `Pagamento anteriormente registrado (${before.value.toFixed(2)}) não foi encontrado nesta execução; revisão obrigatória.` });
      continue;
    }
    if (after && before.value > 0 && after.value > 0 && Math.abs(before.value - after.value) >= 0.005) {
      findings.push({ severity: "warning", code: "PAYMENT_VALUE_CHANGED", inep: before.inep, logicalKey: before.logicalKey, previousValue: before.value, currentValue: after.value, message: `Valor de pagamento registrado mudou de ${before.value.toFixed(2)} para ${after.value.toFixed(2)}; conferir evidências.` });
    }
  }

  for (const [key, after] of Array.from(currentByKey.entries())) {
    const before = previousByKey.get(key);
    if (!before && after.value > 0) {
      findings.push({ severity: "info", code: "NEW_PAYMENT_RECORDED", inep: after.inep, logicalKey: after.logicalKey, previousValue: null, currentValue: after.value, message: `Novo pagamento registrado nesta execução: ${after.value.toFixed(2)}.` });
    }
  }
  return findings;
}
