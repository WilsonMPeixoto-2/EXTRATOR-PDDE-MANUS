import { describe, expect, it } from "vitest";
import { buildFinancialSchoolDossier, buildObservationComparisons, buildSigefMovementDossier, evidenceStateExplanation, filterAuditObservations, filterAuditRuns, filterAuditSchools, operationalConsultationStatus, operationalRunStatus } from "./auditFilters";

describe("filtros da auditoria", () => {
  it("filtra escolas pelo programa identificado na execução", () => {
    const schools = [{ inep: "1", sme: "1001", programsJson: ["PDDE BÁSICO", "PDDE QUALIDADE"] }, { inep: "2", sme: "2002", programsJson: ["PNAE"] }];
    expect(filterAuditSchools(schools, "básico")).toEqual([schools[0]]);
  });

  it("combina a busca por INEP ou SME com o filtro de programa", () => {
    const schools = [{ inep: "33069247", sme: "0410001", programsJson: ["PDDE BÁSICO"] }, { inep: "33069248", sme: "0410002", programsJson: ["PNAE"] }];
    expect(filterAuditSchools(schools, "", "0410002")).toEqual([schools[1]]);
    expect(filterAuditSchools(schools, "básico", "33069247")).toEqual([schools[0]]);
    expect(filterAuditSchools(schools, "pnae", "33069247")).toEqual([]);
  });

  it("encontra a unidade pelo nome operacional sem perder os filtros de programa", () => {
    const schools = [{ inep: "33069247", sme: "0410001", schoolName: "EM EMA NEGRAO DE LIMA", programsJson: ["PDDE"] }, { inep: "33069248", sme: "0410002", schoolName: "EM ALBINO SOUZA CRUZ", programsJson: ["PNAE"] }];
    expect(filterAuditSchools(schools, "", "albino")).toEqual([schools[1]]);
    expect(filterAuditSchools(schools, "pdde", "ema")).toEqual([schools[0]]);
  });

  it("traduz estados técnicos para a linguagem operacional da auditoria", () => {
    expect(operationalRunStatus("approved")).toBe("Aprovada");
    expect(operationalRunStatus("blocked")).toBe("Bloqueada");
    expect(operationalConsultationStatus("success")).toBe("Dados extraídos");
    expect(operationalConsultationStatus("failed")).toBe("Consulta sem dados");
  });

  it("explica o alcance dos estados de evidência sem inferir crédito bancário", () => {
    expect(evidenceStateExplanation("PAGAMENTO_INFORMADO_PDDEINFO")).toContain("não confirma");
    expect(evidenceStateExplanation("CONSULTA_INCONCLUSIVA")).toContain("não permitem concluir");
    expect(evidenceStateExplanation(null)).toContain("Não há estado");
  });

  it("filtra execuções por identificador, data ISO ou estado", () => {
    const runs = [
      { id: "run-aprovada-2026", status: "approved", startedAt: "2026-08-10T12:00:00.000Z", completedAt: "2026-08-10T12:05:00.000Z" },
      { id: "run-bloqueada-2026", status: "blocked", startedAt: "2026-08-11T12:00:00.000Z", completedAt: null },
    ];
    expect(filterAuditRuns(runs, "blocked")).toEqual([runs[1]]);
    expect(filterAuditRuns(runs, "2026-08-10")).toEqual([runs[0]]);
    expect(filterAuditRuns(runs, "aprovada")).toEqual([runs[0]]);
  });

  it("filtra observações pelo caminho, chave ou recorte de evidência", () => {
    const observations = [{ fieldPath: "payments[0].paid", logicalKey: "payment:PDDE_BASIC_P1:paid", evidenceSnippet: "Recorte extraído: 1.234,56" }];
    expect(filterAuditObservations(observations, "1.234")).toEqual(observations);
    expect(filterAuditObservations(observations, "agência")).toEqual([]);
  });

  it("compara valores, estado e presença de observações entre duas execuções", () => {
    const previous = [
      { fieldPath: "payments[0].paid", logicalKey: "payment:basic:paid", rawValue: "100,00", normalizedValueJson: { value: 100 }, state: "PAGAMENTO_INFORMADO_PDDEINFO", evidenceSnippet: "Anterior" },
      { fieldPath: "bankAccounts[0].account", logicalKey: "bank:basic:account", rawValue: "0001", normalizedValueJson: { value: "0001" }, state: "AGENCIA_CONTA_INFORMADA", evidenceSnippet: "Conta anterior" },
    ];
    const current = [
      { fieldPath: "payments[0].paid", logicalKey: "payment:basic:paid", rawValue: "125,00", normalizedValueJson: { value: 125 }, state: "PAGAMENTO_INFORMADO_PDDEINFO", evidenceSnippet: "Atual" },
      { fieldPath: "payments[1].paid", logicalKey: "payment:quality:paid", rawValue: "50,00", normalizedValueJson: { value: 50 }, state: "PAGAMENTO_INFORMADO_PDDEINFO", evidenceSnippet: "Novo" },
    ];

    expect(buildObservationComparisons(current, previous).map(item => ({ logicalKey: item.logicalKey, status: item.status }))).toEqual([
      { logicalKey: "bank:basic:account", status: "removed" },
      { logicalKey: "payment:basic:paid", status: "changed" },
      { logicalKey: "payment:quality:paid", status: "new" },
    ]);
  });

  it("projeta contas e parcelas extraídas em um dossiê financeiro legível por escola", () => {
    const dossier = buildFinancialSchoolDossier([
      { fieldPath: "schoolName", logicalKey: "schoolName", rawValue: "Escola de Teste" },
      { fieldPath: "cnpj", logicalKey: "cnpj", rawValue: "00.000.000/0001-00" },
      { fieldPath: "bankAccounts[0].program", logicalKey: "bank:pdde:program", rawValue: "PDDE" },
      { fieldPath: "bankAccounts[0].bank", logicalKey: "bank:pdde:bank", rawValue: "001" },
      { fieldPath: "bankAccounts[0].agency", logicalKey: "bank:pdde:agency", rawValue: "0249" },
      { fieldPath: "bankAccounts[0].account", logicalKey: "bank:pdde:account", rawValue: "000054640X" },
      { fieldPath: "payments[0].destination", logicalKey: "payment:basic:destination", rawValue: "PDDE Básico - 1ª Parcela" },
      { fieldPath: "payments[0].expected", logicalKey: "payment:basic:expected", rawValue: "100,00" },
      { fieldPath: "payments[0].paid", logicalKey: "payment:basic:paid", rawValue: "100,00", state: "PAGAMENTO_INFORMADO_PDDEINFO" },
      { fieldPath: "payments[0].paymentDate", logicalKey: "payment:basic:date", rawValue: "05/08/2026" },
    ]);

    expect(dossier).toMatchObject({
      schoolName: "Escola de Teste",
      cnpj: "00.000.000/0001-00",
      accounts: [{ program: "PDDE", agency: "0249", account: "000054640X" }],
      payments: [{ destination: "PDDE Básico - 1ª Parcela", expected: "100,00", paid: "100,00", paymentDate: "05/08/2026", state: "PAGAMENTO_INFORMADO_PDDEINFO" }],
    });
  });

  it("projeta apenas movimentações SIGEF estruturadas sem atribuir natureza contábil", () => {
    const movements = buildSigefMovementDossier([
      { fieldPath: "sigefExtrato.movements[0]", logicalKey: "sigefExtrato:movement:2026-05-03:1974:0", rawValue: JSON.stringify({ date: "2026-05-03", credit: 5305, debit: 0, document: "1974", historic: "ORDEM BANCARIA", beneficiaryCnpj: "00378257000181", beneficiaryName: "FNDE" }) },
      { fieldPath: "sigefExtrato.movements[1]", logicalKey: "sigefExtrato:movement:invalid:1", rawValue: "conteúdo inválido" },
    ]);
    expect(movements).toEqual([{ date: "2026-05-03", credit: 5305, debit: 0, document: "1974", historic: "ORDEM BANCARIA", beneficiaryCnpj: "00378257000181", beneficiaryName: "FNDE" }]);
  });
});
