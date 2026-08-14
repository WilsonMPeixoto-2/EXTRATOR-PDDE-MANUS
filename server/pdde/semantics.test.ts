import { describe, expect, it } from "vitest";
import { parseSchoolPage } from "./parser";
import { classifyBankProgram, classifyDestination } from "./semantics";
import { validateExtraction } from "./workbook";

const paymentTable = (destination: string, cost = "70,00", capital = "30,00") => `
  <table>
    <tr><th>Destinação</th><th>x</th><th>x</th><th>x</th><th>x</th><th>x</th><th>x</th><th>Vl Final Devido Total</th><th>Pago Custeio</th><th>Pago Capital</th><th>Valor Pago Total</th><th>Data Ord. Pgto</th></tr>
    <tr><td>${destination}</td><td></td><td></td><td></td><td></td><td></td><td></td><td>100,00</td><td>${cost}</td><td>${capital}</td><td>100,00</td><td>05/08/2026</td></tr>
  </table>`;

describe("catálogo semântico de destinações", () => {
  it("reconhece as duas formas homologadas da primeira parcela do PDDE Básico", () => {
    expect(classifyDestination("PDDE / PDDE Básico - 1ª Parcela")).toMatchObject({ status: "known", key: "PDDE_BASIC_P1" });
    expect(classifyDestination("PDDE BÁSICO - 1ª PARCELA")).toMatchObject({ status: "known", key: "PDDE_BASIC_P1" });
  });

  it("distingue as parcelas P1 e P2 de Primeira Infância sem colapsar a segunda parcela", () => {
    expect(classifyDestination("PDDE / PDDE Básico - Primeira Infância - P1")).toMatchObject({ status: "known", key: "PRIMEIRA_INFANCIA_P1" });
    expect(classifyDestination("PDDE / PDDE Básico - Primeira Infância - P2")).toMatchObject({ status: "known", key: "PRIMEIRA_INFANCIA_P2" });
  });

  it("marca destinação fora do catálogo como desconhecida", () => {
    expect(classifyDestination("Programa Experimental 2026")).toEqual({ status: "unknown", key: null, candidates: [] });
  });

  it("aceita somente programas bancários explicitamente homologados", () => {
    expect(classifyBankProgram("PDDE")).toMatchObject({ status: "known", key: "PDDE_BASIC" });
    expect(classifyBankProgram("PDDE QUALIDADE")).toMatchObject({ status: "known", key: "PDDE_QUALIDADE" });
    expect(classifyBankProgram("Programa Sem Catálogo")).toEqual({ status: "unknown", key: null });
  });
});

describe("invariantes financeiras do PDDEInfo", () => {
  it("valida que pago total corresponde a custeio mais capital quando a fonte informa os componentes", () => {
    const record = parseSchoolPage(paymentTable("PDDE / PDDE Básico - 1ª Parcela"), "33069247", "0410001", "https://fonte.test", "2026-08-12T12:00:00.000Z", "a".repeat(64));
    const payment = record.payments[0];
    expect(payment).toMatchObject({ semanticKey: "PDDE_BASIC_P1", paid: 100, paidCusteio: 70, paidCapital: 30 });
    expect(payment?.provenance.paid.validationResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "paid-arithmetic", level: "passed" }),
    ]));
  });

  it("registra falha crítica quando pago total diverge de custeio mais capital", () => {
    const record = parseSchoolPage(paymentTable("PDDE / PDDE Básico - 1ª Parcela", "60,00", "30,00"), "33069247", "0410001", "https://fonte.test", "2026-08-12T12:00:00.000Z", "a".repeat(64));
    expect(record.payments[0]?.provenance.paid.validationResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "paid-arithmetic", level: "failed" }),
    ]));
    expect(validateExtraction([record], []).errors.join(" ")).toContain("falha(s) crítica(s) de validação por campo");
  });

  it("contabiliza Primeira Infância P2 como segunda parcela prevista, sem convertê-la em PDDE Básico genérico", () => {
    const record = parseSchoolPage(paymentTable("PDDE / PDDE Básico - Primeira Infância - P2"), "33069247", "0410001", "https://fonte.test", "2026-08-12T12:00:00.000Z", "a".repeat(64));
    expect(record.payments[0]?.semanticKey).toBe("PRIMEIRA_INFANCIA_P2");
    expect(validateExtraction([record], []).secondInstallmentExpected).toBe(1);
  });

  it("bloqueia a validação quando uma destinação extraída não pertence ao catálogo", () => {
    const record = parseSchoolPage(paymentTable("Programa Experimental 2026"), "33069247", "0410001", "https://fonte.test", "2026-08-12T12:00:00.000Z", "a".repeat(64));
    const validation = validateExtraction([record], []);
    expect(record.semanticIssues).toContain("Destinação unknown: Programa Experimental 2026");
    expect(validation.errors.join(" ")).toContain("destinação(ões) desconhecida(s) ou ambígua(s)");
  });
});
