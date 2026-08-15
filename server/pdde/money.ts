const brazilianCurrencyPattern = /^-?(?:\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{1,2})?$/;

function cleanCurrency(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

/**
 * Converte moeda brasileira em centavos inteiros para evitar imprecisão binária
 * durante a extração e validação. Entrada inválida preserva o comportamento
 * anterior do parser e retorna zero; a validação de formato é feita à parte.
 */
export function parseBrazilianCurrencyToCents(value: string): number {
  const cleaned = cleanCurrency(value);
  if (!brazilianCurrencyPattern.test(cleaned)) return 0;

  const negative = cleaned.startsWith("-");
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const [integerPart, decimalPart = ""] = unsigned.replace(/\./g, "").split(",");
  const integer = Number(integerPart);
  const decimals = Number(`${decimalPart}00`.slice(0, 2));
  const cents = integer * 100 + decimals;

  return Number.isSafeInteger(cents) ? (negative ? -cents : cents) : 0;
}

export function centsToNumber(cents: number): number {
  if (!Number.isSafeInteger(cents)) return 0;
  return cents / 100;
}

export function sumCents(values: readonly number[]): number {
  let total = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] ?? 0;
    if (!Number.isSafeInteger(value) || !Number.isSafeInteger(total + value)) {
      throw new Error("Soma monetária fora do intervalo seguro de centavos.");
    }
    total += value;
  }
  return total;
}

/** Evita que texto originado de fontes externas seja interpretado como fórmula pelo Excel. */
export function neutralizeSpreadsheetText(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}
