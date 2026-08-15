import { describe, expect, it } from "vitest";
import { pddeInfoSchoolUrl, sourceAutomationCatalog, sourceDefinition } from "./sources";
import { assertSourceCollectionPermitted, sourceCollectionPlan } from "./collectionRunners";

describe("catálogo de automação por fonte", () => {
  it("mantém a coleta do PDDEInfo plenamente autônoma e parametrizada por INEP", () => {
    const pddeInfo = sourceDefinition("PDDEINFO");
    expect(pddeInfo.autonomous).toBe(true);
    expect(pddeInfo.accessState).toBe("AUTONOMOUS_AVAILABLE");
    expect(pddeInfoSchoolUrl("33069247")).toContain("co_escola/33069247");
  });

  it("habilita apenas a rota SIGEF legada de Liberações comprovada, sem reclassificar a interface moderna com CAPTCHA", () => {
    const liberacoes = sourceDefinition("SIGEF_LIBERACAO");
    expect(liberacoes).toMatchObject({ autonomous: true, accessState: "AUTONOMOUS_AVAILABLE", collectionMethod: "http" });
    expect(liberacoes.baseUrl).toContain("internet_fnde.liberacoes_01_pc");
    expect(liberacoes.detail).toContain("CAPTCHA");
  });

  it("exibe todas as fontes previstas sem depender de serviço externo", () => {
    expect(sourceAutomationCatalog().map(source => source.source)).toEqual(expect.arrayContaining([
      "PDDEINFO", "DADOS_ABERTOS", "SIGEF_LIBERACAO", "SIGEF_CONTA_CORRENTE", "SIGEF_EXTRATO", "EXTRATO_BB",
    ]));
  });

  it("classifica bloqueios externos e pilotos sem mascará-los como falha do PDDEInfo", () => {
    const pending = sourceAutomationCatalog().filter(source => !source.autonomous);
    expect(pending).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "EXTRATO_BB", accessState: "AUTHORIZATION_REQUIRED" }),
      expect.objectContaining({ source: "SIGEF_CONTA_CORRENTE", accessState: "CAPTCHA_REQUIRED" }),
      expect.objectContaining({ source: "DADOS_ABERTOS", accessState: "PILOT_COMPLETED_WITH_LIMITATIONS", collectionMethod: "http" }),
    ]));
  });

  it("registra o piloto CGU como evidência de transferências, sem reclassificá-lo como extrato ou automação já habilitada", () => {
    const cgu = sourceDefinition("DADOS_ABERTOS");
    expect(cgu.autonomous).toBe(false);
    expect(cgu.baseUrl).toContain("portaldatransparencia.gov.br/download-de-dados/transferencias");
    expect(cgu.detail).toContain("95 UEx");
    expect(cgu.detail).toContain("não confirma crédito bancário");
  });

  it("mantém o SIGEF Conta Corrente bloqueado por CAPTCHA e habilita somente o detalhamento público de extrato no piloto restrito", () => {
    const contaCorrente = sourceDefinition("SIGEF_CONTA_CORRENTE");
    const extrato = sourceDefinition("SIGEF_EXTRATO");
    expect(contaCorrente).toMatchObject({ accessState: "CAPTCHA_REQUIRED", autonomous: false, collectionMethod: "institutional-channel" });
    expect(contaCorrente.baseUrl).toContain("extrato-conta-corrente");
    expect(extrato).toMatchObject({ accessState: "AUTONOMOUS_AVAILABLE", autonomous: true, collectionMethod: "http" });
    expect(extrato.detail).toContain("programa 02");
    expect(extrato.detail).toContain("quinze UEx");
    expect(extrato.detail).toContain("2026");
  });

  it("versiona os roteiros autônomos comprovados e mantém bloqueadas as fontes não autorizadas", () => {
    expect(sourceCollectionPlan("PDDEINFO")).toMatchObject({ allowed: true, version: "PDDEINFO_HTTP_RUNNER_V1", maxAttempts: 3, retryBackoffMs: 900 });
    expect(assertSourceCollectionPermitted("SIGEF_LIBERACAO")).toMatchObject({ allowed: true, version: "SIGEF_LEGACY_LIBERACAO_HTTP_V1", maxAttempts: 2, retryBackoffMs: 1_200 });
    expect(assertSourceCollectionPermitted("SIGEF_EXTRATO")).toMatchObject({ allowed: true, version: "SIGEF_DIRECT_EXTRATO_HTTP_V2", maxAttempts: 2, retryBackoffMs: 1_200 });
    expect(sourceCollectionPlan("SIGEF_CONTA_CORRENTE")).toMatchObject({ allowed: false, maxAttempts: 0, version: "SOURCE_RUNNER_BLOCKED_V1" });
  });
});
