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
});
