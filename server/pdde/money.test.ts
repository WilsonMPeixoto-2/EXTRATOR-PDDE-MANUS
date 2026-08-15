import { describe, expect, it } from "vitest";
import { centsToNumber, neutralizeSpreadsheetText, parseBrazilianCurrencyToCents, sumCents } from "./money";

describe("moeda em centavos", () => {
  it("preserva centavos sem usar ponto flutuante para a extração", () => {
    expect(parseBrazilianCurrencyToCents("7.285,00")).toBe(728500);
    expect(parseBrazilianCurrencyToCents("1,2")).toBe(120);
    expect(parseBrazilianCurrencyToCents("-0,01")).toBe(-1);
    expect(centsToNumber(sumCents([10, 20, 3]))).toBe(0.33);
  });

  it("recusa formato inválido sem inventar valor", () => {
    expect(parseBrazilianCurrencyToCents("R$ 12,00")).toBe(0);
    expect(parseBrazilianCurrencyToCents("12,345")).toBe(0);
  });
});

describe("neutralização de fórmula", () => {
  it("prefixa texto que o Excel poderia interpretar como fórmula", () => {
    expect(neutralizeSpreadsheetText("=SOMA(A1:A2)")).toBe("'=SOMA(A1:A2)");
    expect(neutralizeSpreadsheetText("+COMANDO")).toBe("'+COMANDO");
    expect(neutralizeSpreadsheetText("Escola Municipal")).toBe("Escola Municipal");
  });
});
