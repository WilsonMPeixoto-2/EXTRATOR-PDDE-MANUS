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
    detail: "Consulta pública por INEP, com lote, retentativas, hash e parser versionado.",
    baseUrl: "https://www.fnde.gov.br/pddeinfo/",
  },
  {
    source: "DADOS_ABERTOS",
    label: "FNDE — Dados Abertos PDDE",
    accessState: "PILOT_PENDING",
    autonomous: false,
    collectionMethod: "file-import",
    detail: "A automação será habilitada após validar arquivo, exercício, cobertura e periodicidade.",
    baseUrl: "https://www.gov.br/fnde/pt-br/acesso-a-informacao/dados-abertos",
  },
  {
    source: "SIGEF_LIBERACAO",
    label: "SIGEF — Liberação de Recursos",
    accessState: "CAPTCHA_REQUIRED",
    autonomous: false,
    collectionMethod: "institutional-channel",
    detail: "A tela pública exige CAPTCHA; o sistema não tenta contornar esse controle de acesso.",
    baseUrl: "https://www.fnde.gov.br/sigefweb/index.php/liberacoes",
  },
  {
    source: "SIGEF_CONTA_CORRENTE",
    label: "SIGEF — Conta Corrente",
    accessState: "PILOT_PENDING",
    autonomous: false,
    collectionMethod: "browser-script",
    detail: "Necessita de piloto para confirmar parâmetros, resposta, cobertura e estabilidade.",
    baseUrl: "https://www.fnde.gov.br/sigefweb/pesquisa-conta",
  },
  {
    source: "SIGEF_EXTRATO",
    label: "SIGEF — Movimentação Bancária",
    accessState: "PILOT_PENDING",
    autonomous: false,
    collectionMethod: "browser-script",
    detail: "Necessita de piloto para comprovar vínculo da conta, período, paginação e estornos.",
    baseUrl: "https://www.fnde.gov.br/sigefweb/index.php/extratos",
  },
  {
    source: "EXTRATO_BB",
    label: "Extrato bancário autorizado",
    accessState: "AUTHORIZATION_REQUIRED",
    autonomous: false,
    collectionMethod: "file-import",
    detail: "O sistema automatiza a leitura de arquivo autorizado; não obtém extratos sem credencial e autorização institucional.",
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
