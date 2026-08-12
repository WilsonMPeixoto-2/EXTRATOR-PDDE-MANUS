import { describe, expect, it } from "vitest";
import { pddeInfoSchoolUrl, sourceAutomationCatalog, sourceDefinition } from "./sources";

describe("catálogo de automação por fonte", () => {
  it("mantém a coleta do PDDEInfo plenamente autônoma e parametrizada por INEP", () => {
    const pddeInfo = sourceDefinition("PDDEINFO");
    expect(pddeInfo.autonomous).toBe(true);
    expect(pddeInfo.accessState).toBe("AUTONOMOUS_AVAILABLE");
    expect(pddeInfoSchoolUrl("33069247")).toContain("co_escola/33069247");
  });

  it("não apresenta a consulta SIGEF protegida por CAPTCHA como autônoma", () => {
    const liberacoes = sourceDefinition("SIGEF_LIBERACAO");
    expect(liberacoes.autonomous).toBe(false);
    expect(liberacoes.accessState).toBe("CAPTCHA_REQUIRED");
    expect(liberacoes.collectionMethod).toBe("institutional-channel");
  });

  it("exibe todas as fontes previstas sem depender de serviço externo", () => {
    expect(sourceAutomationCatalog().map(source => source.source)).toEqual(expect.arrayContaining([
      "PDDEINFO", "DADOS_ABERTOS", "SIGEF_LIBERACAO", "SIGEF_CONTA_CORRENTE", "SIGEF_EXTRATO", "EXTRATO_BB",
    ]));
  });

  it("classifica bloqueios externos e pilotos sem mascará-los como falha do PDDEInfo", () => {
    const pending = sourceAutomationCatalog().filter(source => !source.autonomous);
    expect(pending).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "SIGEF_LIBERACAO", accessState: "CAPTCHA_REQUIRED" }),
      expect.objectContaining({ source: "EXTRATO_BB", accessState: "AUTHORIZATION_REQUIRED" }),
      expect.objectContaining({ source: "SIGEF_CONTA_CORRENTE", accessState: "PILOT_PENDING" }),
    ]));
  });

  it("mantém as consultas SIGEF em piloto nas URLs públicas revalidadas", () => {
    const contaCorrente = sourceDefinition("SIGEF_CONTA_CORRENTE");
    const extrato = sourceDefinition("SIGEF_EXTRATO");
    expect(contaCorrente).toMatchObject({ accessState: "PILOT_PENDING", autonomous: false });
    expect(contaCorrente.baseUrl).toContain("extrato-conta-corrente");
    expect(extrato).toMatchObject({ accessState: "PILOT_PENDING", autonomous: false });
    expect(extrato.detail).toContain("sem chave escolar/CNPJ visível");
  });
});
