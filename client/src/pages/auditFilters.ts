export type AuditSchoolFilterItem = { inep: string; sme?: string | null; programsJson?: string[] | null };
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
    const matchesSchool = !normalizedSchoolQuery || [school.inep, school.sme ?? ""].some(value => includesNormalized(value, normalizedSchoolQuery));
    return matchesProgram && matchesSchool;
  });
}

export function filterAuditObservations<T extends AuditObservationFilterItem>(observations: T[], fieldQuery: string): T[] {
  if (!fieldQuery.trim()) return observations;
  return observations.filter(observation => [observation.fieldPath, observation.logicalKey, observation.rawValue ?? "", observation.evidenceSnippet ?? ""].some(value => includesNormalized(value, fieldQuery)));
}

function observationFingerprint(observation: AuditObservationFilterItem) {
  return JSON.stringify({
    rawValue: observation.rawValue ?? null,
    normalizedValueJson: observation.normalizedValueJson ?? null,
    state: observation.state ?? null,
  });
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
