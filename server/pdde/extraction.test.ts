import { describe, expect, it } from "vitest";
import { MASTER_SCHOOLS } from "./masterList";
import { accountForExactProgram, parseSchoolPage } from "./parser";
import { canReleaseDownload, validateExtraction } from "./workbook";
import type { SchoolExtraction } from "./types";

const fixture = `
<table><tr><td>Cod. Escola:</td><td>33069247</td><td>Nome Escola:</td><td>Escola de Teste</td></tr></table>
<table><tr><td>Executora:</td><td>UEx de Teste</td><td>CNPJ:</td><td>00.000.000/0001-00</td></tr></table>
<table><tr><th>Programa/Ação</th><th>Banco</th><th>Agência</th><th>Conta</th><th>Saldo</th></tr><tr><td>PDDE QUALIDADE</td><td>001</td><td>0249</td><td>0000546402</td><td>10,00</td></tr><tr><td>PDDE EQUIDADE</td><td>001</td><td>0249</td><td>0000999999</td><td>20,00</td></tr></table>
<table><tr><th>Destinação</th><th>x</th><th>x</th><th>Vl Devido Total</th><th>x</th><th>x</th><th>x</th><th>Vl Final Devido Total</th><th>x</th><th>x</th><th>Valor Pago Total</th><th>Data Ord. Pgto</th></tr><tr><td>PDDE / PDDE Básico - 1ª Parcela</td><td></td><td></td><td>100,00</td><td></td><td></td><td></td><td>100,00</td><td></td><td></td><td>100,00</td><td>05/08/2026</td></tr></table>`;

describe("lista-mestre 4ª CRE", () => {
  it("contém os 163 INEPs únicos esperados", () => {
    expect(MASTER_SCHOOLS).toHaveLength(163);
    expect(new Set(MASTER_SCHOOLS.map(school => school.inep)).size).toBe(163);
  });
});

describe("vinculação bancária por programa", () => {
  it("não permite que PDDE Qualidade ou Equidade preencham o PDDE Básico", () => {
    const record = parseSchoolPage(fixture, "33069247", "0410001", "https://fonte.test/33069247", "2026-08-11T12:00:00.000Z");
    expect(accountForExactProgram(record, "PDDE")).toBeUndefined();
    expect(accountForExactProgram(record, "PDDE QUALIDADE")?.account).toBe("0000546402");
    expect(accountForExactProgram(record, "PDDE EQUIDADE")?.account).toBe("0000999999");
  });
});

describe("validações de regressão", () => {
  it("bloqueia a liberação quando a cobertura não satisfaz os parâmetros obrigatórios", () => {
    const incomplete: SchoolExtraction[] = [];
    const validation = validateExtraction(incomplete, []);
    expect(validation.passed).toBe(false);
    expect(validation.errors.join(" ")).toContain("Cobertura inválida");
    expect(validation.errors.join(" ")).toContain("1ª parcela");
  });

  it("libera o download somente quando todos os controles forem aprovados", () => {
    expect(canReleaseDownload({ passed: false, uniqueIneps: 163, firstInstallmentPaid: 111, secondInstallmentExpected: 163, missingBasicAccounts: 47, errors: ["falha simulada"] })).toBe(false);
    expect(canReleaseDownload({ passed: true, uniqueIneps: 163, firstInstallmentPaid: 111, secondInstallmentExpected: 163, missingBasicAccounts: 47, errors: [] })).toBe(true);
  });
});
