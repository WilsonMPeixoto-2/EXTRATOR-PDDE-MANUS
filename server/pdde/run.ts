import { storagePut } from "../storage";
import { MASTER_SCHOOLS } from "./masterList";
import { parseSchoolPage } from "./parser";
import type { AuditRecord, SchoolExtraction, ValidationSummary } from "./types";
import { canReleaseDownload, createV2Workbook, validateExtraction } from "./workbook";

const FNDE_URL = (inep: string) =>
  `https://www.fnde.gov.br/pddeinfo/pddeinfo/escola/consultar/ano/2026/co_escola/${inep}/cnpj//co_esfera_adm/2/sg_uf/RJ/co_municipio_fnde/330455/consultar/Consultar/page/1`;
const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

export type ExtractionEvent =
  | { type: "ready"; runId: string; total: number }
  | { type: "progress"; completed: number; total: number; batch: number; message: string; audit: AuditRecord }
  | { type: "complete"; validation: ValidationSummary; downloadUrl: string | null; completed: number; errors: number }
  | { type: "fatal"; message: string };

export type ExtractionRun = {
  id: string;
  status: "IDLE" | "RUNNING" | "COMPLETE" | "BLOCKED" | "FAILED";
  startedAt: string;
  completedAt?: string;
  records: SchoolExtraction[];
  audits: AuditRecord[];
  validation?: ValidationSummary;
  downloadUrl?: string;
};

const activeRuns = new Map<string, ExtractionRun>();
export const getRun = (runId: string) => activeRuns.get(runId);

async function fetchSchool(inep: string, sme: string): Promise<{ record?: SchoolExtraction; audit: AuditRecord }> {
  const sourceUrl = FNDE_URL(inep);
  const audit: AuditRecord = { inep, sme, sourceUrl, consultedAt: null, status: "PENDING", attempts: 0, programsFound: [], exception: null };
  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    audit.attempts = attempt;
    try {
      const response = await fetch(sourceUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; 4CRE-PDDEInfo-Extractor/1.0)", Accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) throw new Error(`FNDE retornou HTTP ${response.status}`);
      // O PDDEInfo entrega páginas em ISO-8859-1. Decodificar o buffer como latin1
      // preserva "Programa/Ação" e "Destinação", essenciais ao parsing estrito.
      const html = Buffer.from(await response.arrayBuffer()).toString("latin1");
      const consultedAt = new Date().toISOString();
      const record = parseSchoolPage(html, inep, sme, sourceUrl, consultedAt);
      if (!record.schoolName || !record.uex) throw new Error("Página recebida sem identificação completa da unidade ou UEx.");
      audit.status = "SUCCESS";
      audit.consultedAt = consultedAt;
      audit.programsFound = record.rawPrograms;
      return { record, audit };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Falha desconhecida na consulta";
      if (attempt < 3) await delay(900 * attempt);
    }
  }
  audit.status = "FAILED";
  audit.consultedAt = new Date().toISOString();
  audit.exception = lastError;
  return { audit };
}

export function masterListSummary() {
  const unique = new Set(MASTER_SCHOOLS.map(school => school.inep)).size;
  return { count: MASTER_SCHOOLS.length, unique, valid: MASTER_SCHOOLS.length === 163 && unique === 163 };
}

export async function runExtraction(onEvent: (event: ExtractionEvent) => void): Promise<ExtractionRun> {
  const master = masterListSummary();
  if (!master.valid) throw new Error("A lista-mestre não passou na validação de cobertura e unicidade.");
  const runId = crypto.randomUUID();
  const run: ExtractionRun = { id: runId, status: "RUNNING", startedAt: new Date().toISOString(), records: [], audits: [] };
  activeRuns.set(runId, run);
  onEvent({ type: "ready", runId, total: MASTER_SCHOOLS.length });

  const batchSize = 10;
  for (let start = 0; start < MASTER_SCHOOLS.length; start += batchSize) {
    const batch = MASTER_SCHOOLS.slice(start, start + batchSize);
    const results = await Promise.all(batch.map(school => fetchSchool(school.inep, school.sme)));
    results.forEach((result, index) => {
      const school = batch[index];
      run.audits.push(result.audit);
      if (result.record) run.records.push(result.record);
      const completed = start + index + 1;
      onEvent({
        type: "progress",
        completed,
        total: MASTER_SCHOOLS.length,
        batch: Math.floor(start / batchSize) + 1,
        message: result.record ? `${school.inep} consultado com sucesso.` : `${school.inep} falhou após ${result.audit.attempts} tentativa(s).`,
        audit: result.audit,
      });
    });
    if (start + batchSize < MASTER_SCHOOLS.length) await delay(1_100);
  }

  run.validation = validateExtraction(run.records, run.audits);
  run.completedAt = new Date().toISOString();
  if (!canReleaseDownload(run.validation)) {
    run.status = "BLOCKED";
    onEvent({ type: "complete", validation: run.validation, downloadUrl: null, completed: run.records.length, errors: run.audits.filter(audit => audit.status === "FAILED").length });
    return run;
  }
  const workbook = await createV2Workbook(run.records, run.audits, run.validation);
  const stored = await storagePut(`exports/pdde-4cre/${runId}/PDDEInfo_4a_CRE_2026_Visao_Financeira_V2.xlsx`, workbook, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  run.downloadUrl = stored.url;
  run.status = "COMPLETE";
  onEvent({ type: "complete", validation: run.validation, downloadUrl: stored.url, completed: run.records.length, errors: 0 });
  return run;
}
