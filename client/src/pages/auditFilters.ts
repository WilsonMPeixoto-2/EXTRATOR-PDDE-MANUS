export type AuditSchoolFilterItem = { inep: string; sme?: string | null; schoolName?: string | null; programsJson?: string[] | null };
export type AuditRunFilterItem = { id: string; status: string; startedAt?: string | null; completedAt?: string | null };
export type AuditObservationFilterItem = {
  fieldPath: string;
  logicalKey: string;
  rawValue?: string | null;
  normalizedValueJson?: unknown;
  evidenceSnippet?: string | null;
  state?: string | null;
};

export type AuditObservationComparison<T extends AuditObservationFilterItem> = {
  logicalKey: string;
  fieldPath: string;
  status: "new" | "removed" | "changed" | "unchanged";
  current: T | null;
  previous: T | null;
};

export type FinancialSchoolDossier = {
  schoolName: string | null;
  uex: string | null;
  cnpj: string | null;
  accounts: Array<{ index: number; program: string | null; bank: string | null; agency: string | null; account: string | null; balance: string | null }>;
  payments: Array<{ index: number; destination: string | null; expected: string | null; paid: string | null; paidCusteio: string | null; paidCapital: string | null; paymentDate: string | null; state: string | null }>;
};

const includesNormalized = (value: string, query: string) => value.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"));

export function filterAuditRuns<T extends AuditRunFilterItem>(runs: T[], runQuery: string): T[] {
  if (!runQuery.trim()) return runs;
  return runs.filter(run => [run.id, run.status, run.startedAt ?? "", run.completedAt ?? ""].some(value => includesNormalized(value, runQuery)));
}

export function filterAuditSchools<T extends AuditSchoolFilterItem>(schools: T[], programQuery: string, schoolQuery = ""): T[] {
  const normalizedProgramQuery = programQuery.trim();
  const normalizedSchoolQuery = schoolQuery.trim();
  if (!normalizedProgramQuery && !normalizedSchoolQuery) return schools;
  return schools.filter(school => {
    const matchesProgram = !normalizedProgramQuery || (school.programsJson ?? []).some(program => includesNormalized(program, normalizedProgramQuery));
    const matchesSchool = !normalizedSchoolQuery || [school.inep, school.sme ?? "", school.schoolName ?? ""].some(value => includesNormalized(value, normalizedSchoolQuery));
    return matchesProgram && matchesSchool;
  });
}

export function operationalRunStatus(status: string): string {
  return ({ approved: "Aprovada", partial: "Parcial", blocked: "Bloqueada", failed: "Com falha", running: "Em andamento" } as Record<string, string>)[status] ?? status;
}

export function operationalConsultationStatus(status: string): string {
  return status === "success" ? "Dados extraídos" : status === "failed" ? "Consulta sem dados" : status;
}

const EVIDENCE_STATE_EXPLANATIONS: Record<string, string> = {
  PAGAMENTO_INFORMADO_PDDEINFO: "O PDDEInfo registra pagamento ou ordem. Isso não confirma, por si só, o crédito na conta bancária.",
  OB_CORROBORADA_CREDITO_NAO_LOCALIZADO: "A ordem bancária foi corroborada, mas o crédito correspondente ainda não foi localizado na fonte consultada.",
  CREDITO_LOCALIZADO_SIGEF: "Um crédito correspondente foi localizado no SIGEF, sem substituir as regras de conciliação documental.",
  CREDITO_CONFIRMADO_EXTRATO_BB: "O crédito foi confirmado em extrato bancário vinculado à evidência preservada.",
  CREDITO_ESTORNADO_OU_DEVOLVIDO: "A evidência indica estorno ou devolução; o valor não deve ser tratado como crédito disponível.",
  SEM_PAGAMENTO_REGISTRADO_ATE_CONSULTA: "Não havia pagamento registrado na fonte até a data e hora desta consulta.",
  DIVERGENCIA_ENTRE_FONTES: "As fontes consultadas apresentam informações incompatíveis e exigem conferência na rastreabilidade.",
  CONSULTA_INCONCLUSIVA: "As fontes disponíveis não permitem concluir se houve crédito bancário confirmado.",
  REVISAO_NECESSARIA: "O registro requer conferência antes de qualquer conclusão operacional.",
};

export function evidenceStateExplanation(state: string | null | undefined): string {
  return state ? EVIDENCE_STATE_EXPLANATIONS[state] ?? "Estado registrado na fonte consultada. Abra a rastreabilidade para conferir a evidência preservada." : "Não há estado de evidência informado para este campo.";
}

export function filterAuditObservations<T extends AuditObservationFilterItem>(observations: T[], fieldQuery: string): T[] {
  if (!fieldQuery.trim()) return observations;
  return observations.filter(observation => [observation.fieldPath, observation.logicalKey, observation.rawValue ?? "", observation.evidenceSnippet ?? ""].some(value => includesNormalized(value, fieldQuery)));
}

function observationFingerprint(observation: AuditObservationFilterItem) {
  return JSON.stringify({ rawValue: observation.rawValue ?? null, normalizedValueJson: observation.normalizedValueJson ?? null, state: observation.state ?? null });
}

function observationDisplayValue(observation: AuditObservationFilterItem | undefined): string | null {
  if (!observation) return null;
  if (observation.rawValue !== null && observation.rawValue !== undefined && observation.rawValue !== "") return observation.rawValue;
  const normalized = observation.normalizedValueJson as { value?: string | number | null } | undefined;
  return normalized?.value === null || normalized?.value === undefined ? null : String(normalized.value);
}

export function buildFinancialSchoolDossier<T extends AuditObservationFilterItem>(observations: T[]): FinancialSchoolDossier {
  const byPath = new Map(observations.map(observation => [observation.fieldPath, observation]));
  const valuesFor = (prefix: "bankAccounts" | "payments", fields: string[]) => {
    const indexes = Array.from(new Set(observations.flatMap(observation => {
      const match = observation.fieldPath.match(new RegExp(`^${prefix}\\[(\\d+)\\]\\.`));
      return match ? [Number(match[1])] : [];
    }))).toSorted((left, right) => left - right);
    return indexes.map(index => ({ index, ...Object.fromEntries(fields.map(field => [field, observationDisplayValue(byPath.get(`${prefix}[${index}].${field}`))])) }));
  };
  const accounts = valuesFor("bankAccounts", ["program", "bank", "agency", "account", "balance"]) as FinancialSchoolDossier["accounts"];
  const payments = valuesFor("payments", ["destination", "expected", "paid", "paidCusteio", "paidCapital", "paymentDate"])
    .map(payment => ({ ...payment, state: byPath.get(`payments[${payment.index}].paid`)?.state ?? null })) as FinancialSchoolDossier["payments"];
  return {
    schoolName: observationDisplayValue(byPath.get("schoolName")),
    uex: observationDisplayValue(byPath.get("uex")),
    cnpj: observationDisplayValue(byPath.get("cnpj")),
    accounts,
    payments,
  };
}

export function buildObservationComparisons<T extends AuditObservationFilterItem>(currentObservations: T[], previousObservations: T[]): AuditObservationComparison<T>[] {
  const currentByKey = new Map(currentObservations.map(observation => [observation.logicalKey, observation]));
  const previousByKey = new Map(previousObservations.map(observation => [observation.logicalKey, observation]));
  const keys = Array.from(new Set([...Array.from(currentByKey.keys()), ...Array.from(previousByKey.keys())])).toSorted((left, right) => left.localeCompare(right, "pt-BR"));
  return keys.map(logicalKey => {
    const current = currentByKey.get(logicalKey) ?? null;
    const previous = previousByKey.get(logicalKey) ?? null;
    const status = !previous ? "new" : !current ? "removed" : observationFingerprint(current) === observationFingerprint(previous) ? "unchanged" : "changed";
    return { logicalKey, fieldPath: current?.fieldPath ?? previous?.fieldPath ?? logicalKey, status, current, previous };
  });
}
