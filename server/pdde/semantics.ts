const normalizeSemantic = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/ª/g, "A")
  .replace(/º/g, "O")
  .replace(/\s+/g, " ")
  .trim()
  .toUpperCase();

export type DestinationSemanticKey =
  | "PDDE_BASIC_P1"
  | "PDDE_BASIC_P2"
  | "PRIMEIRA_INFANCIA_P1"
  | "PRIMEIRA_INFANCIA_P2"
  | "EDUCACAO_CONECTADA_2026"
  | "ESCOLA_E_COMUNIDADE_2026"
  | "ESCOLA_DAS_ADOLESCENCIAS_2026"
  | "CANTINHO_DA_LEITURA_2026"
  | "PDDE_SRM_2026";

type DestinationDefinition = {
  key: DestinationSemanticKey;
  label: string;
  aliases: string[];
};

const definitions: DestinationDefinition[] = [
  { key: "PDDE_BASIC_P1", label: "PDDE Básico — 1ª parcela", aliases: ["PDDE / PDDE BASICO - 1A PARCELA", "PDDE BASICO - 1A PARCELA"] },
  { key: "PDDE_BASIC_P2", label: "PDDE Básico — 2ª parcela", aliases: ["PDDE / PDDE BASICO - 2A PARCELA", "PDDE BASICO - 2A PARCELA"] },
  { key: "PRIMEIRA_INFANCIA_P1", label: "Primeira Infância — P1", aliases: ["PRIMEIRA INFANCIA - P1"] },
  { key: "PRIMEIRA_INFANCIA_P2", label: "Primeira Infância — P2", aliases: ["PRIMEIRA INFANCIA - P2"] },
  { key: "EDUCACAO_CONECTADA_2026", label: "Educação Conectada 2026", aliases: ["EDUCACAO CONECTADA 2026"] },
  { key: "ESCOLA_E_COMUNIDADE_2026", label: "Escola e Comunidade 2026", aliases: ["ESCOLA E COMUNIDADE 2026"] },
  { key: "ESCOLA_DAS_ADOLESCENCIAS_2026", label: "Escola das Adolescências 2026", aliases: ["ESCOLA DAS ADOLESCENCIAS 2026"] },
  { key: "CANTINHO_DA_LEITURA_2026", label: "Cantinho da Leitura 2026", aliases: ["CANTINHO DA LEITURA 2026"] },
  { key: "PDDE_SRM_2026", label: "PDDE SRM 2026", aliases: ["PDDE SRM 2026"] },
];

export type DestinationClassification = {
  status: "known" | "unknown" | "ambiguous";
  key: DestinationSemanticKey | null;
  candidates: DestinationSemanticKey[];
};

export type BankProgramKey = "PDDE_BASIC" | "PDDE_QUALIDADE" | "PDDE_EQUIDADE" | "PDDE_EDUCACAO_INTEGRAL";

const bankPrograms: Array<{ key: BankProgramKey; aliases: string[] }> = [
  { key: "PDDE_BASIC", aliases: ["PDDE"] },
  { key: "PDDE_QUALIDADE", aliases: ["PDDE QUALIDADE"] },
  { key: "PDDE_EQUIDADE", aliases: ["PDDE EQUIDADE"] },
  { key: "PDDE_EDUCACAO_INTEGRAL", aliases: ["PDDE-EDUCACAO INTEGRAL", "PDDE EDUCACAO INTEGRAL"] },
];

export function classifyBankProgram(program: string): { status: "known" | "unknown"; key: BankProgramKey | null } {
  const normalized = normalizeSemantic(program);
  const match = bankPrograms.find(definition => definition.aliases.some(alias => normalizeSemantic(alias) === normalized));
  return match ? { status: "known", key: match.key } : { status: "unknown", key: null };
}

export function classifyDestination(destination: string): DestinationClassification {
  const normalized = normalizeSemantic(destination);
  const matches = definitions
    .filter(definition => definition.aliases.some(alias => normalized.includes(normalizeSemantic(alias))))
    .map(definition => definition.key);
  if (matches.length === 1) return { status: "known", key: matches[0]!, candidates: matches };
  if (matches.length === 0) return { status: "unknown", key: null, candidates: [] };
  return { status: "ambiguous", key: null, candidates: matches };
}

export function destinationLabel(key: DestinationSemanticKey): string {
  return definitions.find(definition => definition.key === key)?.label ?? key;
}

export function destinationCatalog(): DestinationDefinition[] {
  return definitions.map(definition => ({ ...definition, aliases: [...definition.aliases] }));
}
