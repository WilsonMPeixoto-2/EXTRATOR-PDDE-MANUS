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
    ]));
  });

  it("mantém o SIGEF Conta Corrente bloqueado por CAPTCHA e registra o reCAPTCHA da rota pública do piloto de extrato", () => {
    const contaCorrente = sourceDefinition("SIGEF_CONTA_CORRENTE");
    const extrato = sourceDefinition("SIGEF_EXTRATO");
    expect(contaCorrente).toMatchObject({ accessState: "CAPTCHA_REQUIRED", autonomous: false, collectionMethod: "institutional-channel" });
    expect(contaCorrente.baseUrl).toContain("extrato-conta-corrente");
    expect(extrato).toMatchObject({ accessState: "PILOT_COMPLETED_WITH_LIMITATIONS", autonomous: false, collectionMethod: "file-import" });
    expect(extrato.detail).toContain("programa, parcela e conta destinatária");
    expect(extrato.detail).toContain("reCAPTCHA");
  });

  it("versiona os roteiros autônomos comprovados e mantém bloqueadas as fontes não autorizadas", () => {
    expect(sourceCollectionPlan("PDDEINFO")).toMatchObject({ allowed: true, version: "PDDEINFO_HTTP_RUNNER_V1", maxAttempts: 3, retryBackoffMs: 900 });
    expect(assertSourceCollectionPermitted("SIGEF_LIBERACAO")).toMatchObject({ allowed: true, version: "SIGEF_LEGACY_LIBERACAO_HTTP_V1", maxAttempts: 2, retryBackoffMs: 1_200 });
    expect(sourceCollectionPlan("SIGEF_CONTA_CORRENTE")).toMatchObject({ allowed: false, maxAttempts: 0, version: "SOURCE_RUNNER_BLOCKED_V1" });
  });
});
