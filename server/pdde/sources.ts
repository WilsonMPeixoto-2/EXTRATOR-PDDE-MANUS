import type { EvidenceSource, SourceAccessState } from "./types";

export type SourceAutomationDefinition = {
  source: EvidenceSource;
  label: string;
  accessState: SourceAccessState;
  autonomous: boolean;
  collectionMethod: "http" | "file-import" | "browser-script" | "institutional-channel";
  detail: string;
  baseUrl: string;
};

export const pddeInfoSchoolUrl = (inep: string) =>
  `https://www.fnde.gov.br/pddeinfo/pddeinfo/escola/consultar/ano/2026/co_escola/${inep}/cnpj//co_esfera_adm/2/sg_uf/RJ/co_municipio_fnde/330455/consultar/Consultar/page/1`;

const SOURCE_AUTOMATION_CATALOG: SourceAutomationDefinition[] = [
  {
    source: "PDDEINFO",
    label: "PDDEInfo — consulta por INEP",
    accessState: "AUTONOMOUS_AVAILABLE",
    autonomous: true,
    collectionMethod: "http",
    detail: "Fonte principal para contas informadas e pagamentos registrados por unidade. Consulta disponível para o exercício de 2026.",
    baseUrl: "https://www.fnde.gov.br/pddeinfo/",
  },
  {
    source: "DADOS_ABERTOS",
    label: "CGU — Recursos Transferidos PDDE",
    accessState: "PILOT_COMPLETED_WITH_LIMITATIONS",
    autonomous: false,
    collectionMethod: "http",
    detail: "Fonte complementar em teste. Ajuda a conferir transferências por período, unidade e valor, mas não confirma crédito bancário, saldo ou pagamento registrado no PDDEInfo.",
    baseUrl: "https://portaldatransparencia.gov.br/download-de-dados/transferencias",
  },
  {
    source: "SIGEF_LIBERACAO",
    label: "SIGEF — Liberações (rota legada pública)",
    accessState: "AUTONOMOUS_AVAILABLE",
    autonomous: true,
    collectionMethod: "http",
    detail: "Consulta complementar disponível em escopo controlado. Seus resultados não substituem a referência principal do PDDEInfo.",
    baseUrl: "https://www.fnde.gov.br/pls/simad/internet_fnde.liberacoes_01_pc",
  },
  {
    source: "SIGEF_CONTA_CORRENTE",
    label: "SIGEF — Conta Corrente",
    accessState: "CAPTCHA_REQUIRED",
    autonomous: false,
    collectionMethod: "institutional-channel",
    detail: "Acesso externo exige validação institucional. Enquanto esse acesso não estiver autorizado, a fonte não é usada para completar contas ou confirmar créditos.",
    baseUrl: "https://www.fnde.gov.br/sigefweb/default/conta-corrente/extrato-conta-corrente",
  },
  {
    source: "SIGEF_EXTRATO",
    label: "SIGEF — Extrato de Conta Corrente (detalhamento público)",
    accessState: "AUTONOMOUS_AVAILABLE",
    autonomous: true,
    collectionMethod: "http",
    detail: "Fonte complementar em teste para unidades cuja conta PDDE Básico já foi identificada. Prioriza 2026, não infere contas e não altera os dados principais do PDDEInfo.",
    baseUrl: "https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento",
  },
  {
    source: "EXTRATO_BB",
    label: "Extrato bancário autorizado",
    accessState: "AUTHORIZATION_REQUIRED",
    autonomous: false,
    collectionMethod: "file-import",
    detail: "Permite conferir movimentações quando um extrato autorizado é fornecido. O sistema não acessa contas nem obtém arquivos sem autorização institucional.",
    baseUrl: "",
  },
];

export function sourceAutomationCatalog(): SourceAutomationDefinition[] {
  return SOURCE_AUTOMATION_CATALOG.map(source => ({ ...source }));
}

export function sourceDefinition(source: EvidenceSource): SourceAutomationDefinition {
  const definition = SOURCE_AUTOMATION_CATALOG.find(item => item.source === source);
  if (!definition) throw new Error(`Fonte não configurada: ${source}`);
  return { ...definition };
}
