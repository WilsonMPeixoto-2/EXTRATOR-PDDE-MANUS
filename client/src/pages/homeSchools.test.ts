import { describe, expect, it } from "vitest";
import { accountStatusLabel, filterHomeSchools, type HomeSchool } from "./homeSchools";

const schools: HomeSchool[] = [
  { inep: "3301", sme: "0410001", schoolName: "EM Horizonte", status: "success", programsJson: ["PDDE", "PDDE QUALIDADE"], basicAccountStatus: "informada", firstInstallmentPaid: true, secondInstallmentExpected: true },
  { inep: "3302", sme: "0410002", schoolName: "EM Aurora", status: "success", programsJson: ["PDDE QUALIDADE"], basicAccountStatus: "nao-informada", firstInstallmentPaid: false, secondInstallmentExpected: true },
];

describe("carteira da Home", () => {
  it("mantém o programa PDDE separado de PDDE QUALIDADE e filtra a situação real da conta", () => {
    expect(filterHomeSchools(schools, "", "account-found").map(school => school.inep)).toEqual(["3301"]);
    expect(filterHomeSchools(schools, "", "account-not-shown").map(school => school.inep)).toEqual(["3302"]);
    expect(filterHomeSchools(schools, "qualidade", "all")).toHaveLength(2);
  });

  it("usa uma mensagem factual para conta não exibida, sem transformá-la em falha", () => {
    expect(accountStatusLabel("informada")).toBe("Conta do PDDE encontrada");
    expect(accountStatusLabel("nao-informada")).toBe("Conta do PDDE não exibida");
  });
});

