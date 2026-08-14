import { useAuth } from "../_core/hooks/useAuth";
import "./audit-reference.css";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HighContrastToggle } from "@/components/HighContrastToggle";
import { AlertTriangle, ArrowLeft, CalendarClock, CircleHelp, FileCheck2, FileSearch, Layers3, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import { buildFinancialSchoolDossier, buildSigefMovementDossier, evidenceStateExplanation, filterAuditObservations, filterAuditSchools, isPrimaryPddeInfoAuditRun, operationalConsultationStatus, operationalRunStatus, primaryAuditRunId, sigefCoverageSummary } from "./auditFilters";

type AuditRun = { id: string; status: "running" | "approved" | "partial" | "blocked" | "failed"; masterCount: number; processedCount: number; parserVersion: string; startedAt: string; completedAt: string | null; validationJson: { passed?: boolean; errors?: string[]; sourceLimitations?: string[] } };
type School = { inep: string; sme: string; schoolName: string | null; status: "success" | "failed"; consultedAt: string; programsJson: string[]; exception: string | null };
type Finding = { id: number; severity: "info" | "warning" | "critical"; code: string; message: string; inep: string | null; previousValue: string | null; currentValue: string | null };
type Observation = { id: number; fieldPath: string; logicalKey: string; source: string; sourceUrl: string; consultedAt: string; rawValue: string | null; normalizedValueJson: { value?: string | number | null } | null; parserVersion: string; extractionRule: string; selector: string; evidenceSnippet: string | null; state: string | null; sourceHashSha256: string | null; rawHtmlKey: string | null; normalizedJsonKey: string | null; validationResultsJson: Array<{ code: string; level: string; message: string }> };
type Artifact = { id: number; kind: string; storageKey: string; sha256: string; contentType: string; createdAt?: string };
type RunAuditEvent = { id: string; occurredAt: string; type: string; severity: string; message: string; payloadJson?: { source?: string; exercise?: number; matchedSchools?: number; warnings?: string[] } };
type Dossier = { consultation: School | null; observations: Observation[]; events: Array<{ id: string; occurredAt: string; type: string; severity: string; message: string }>; findings: Finding[]; artifacts: Artifact[] };
type SigefCoverage = { referenceMasterCount: number; coveredUex: number; contributingRuns: number; lastCollectedAt: string | null };

function displayDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("pt-BR") : "—";
}

function displayMoney(value: number) {
  return value ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
}

async function operationalFetch(url: string, attempts = 2): Promise<Response> {
  let response = await fetch(url);
  for (let attempt = 0; response.status === 429 && attempt < attempts; attempt += 1) {
    const retryAfter = Math.max(1, Number(response.headers.get("Retry-After") ?? "1"));
    await new Promise(resolve => window.setTimeout(resolve, retryAfter * 1_000));
    response = await fetch(url);
  }
  return response;
}

function badgeClass(status: string) {
  if (["approved", "success", "info", "unchanged"].includes(status)) return "audit-badge audit-badge-ok";
  if (["partial", "blocked", "warning", "changed"].includes(status)) return "audit-badge audit-badge-warn";
  return "audit-badge audit-badge-error";
}

function evidenceStateLabel(state: string | null) {
  const labels: Record<string, string> = {
    PAGAMENTO_INFORMADO_PDDEINFO: "Pagamento registrado no PDDEInfo",
    OB_CORROBORADA_CREDITO_NAO_LOCALIZADO: "OB corroborada; crédito não localizado",
    CREDITO_LOCALIZADO_SIGEF: "Crédito localizado no SIGEF",
    CREDITO_CONFIRMADO_EXTRATO_BB: "Crédito confirmado em extrato BB",
    CREDITO_ESTORNADO_OU_DEVOLVIDO: "Crédito estornado ou devolvido",
    SEM_PAGAMENTO_REGISTRADO_ATE_CONSULTA: "Sem pagamento registrado até a consulta",
    DIVERGENCIA_ENTRE_FONTES: "Divergência entre fontes",
    CONSULTA_INCONCLUSIVA: "Consulta inconclusiva para crédito bancário",
    REVISAO_NECESSARIA: "Revisão necessária",
  };
  return state ? labels[state] ?? state : "Sem estado de evidência";
}

function EvidenceStateBadge({ state, className = "" }: { state: string | null; className?: string }) {
  const label = evidenceStateLabel(state);
  return <Tooltip>
    <TooltipTrigger asChild><span tabIndex={0} className={`${className} audit-evidence-tooltip-trigger`} aria-label={`Explicação: ${label}`}>{label}</span></TooltipTrigger>
    <TooltipContent side="top" sideOffset={7} className="audit-evidence-tooltip">{evidenceStateExplanation(state)}</TooltipContent>
  </Tooltip>;
}

function operationalEventLabel(type: string) {
  const labels: Record<string, string> = {
    FIELD_PARSED: "Campo identificado",
    FIELD_VALIDATED: "Validação registrada",
    FINDING_OPENED: "Achado registrado",
    ARTIFACT_STORED: "Evidência preservada",
  };
  return labels[type] ?? "Evento registrado";
}

function auditRunOptionLabel(run: AuditRun) {
  const scope = isPrimaryPddeInfoAuditRun(run) ? "PDDEInfo aprovado" : run.parserVersion.startsWith("SIGEF_") ? "SIGEF complementar" : operationalRunStatus(run.status);
  return `${scope} · ${run.processedCount}/${run.masterCount} unidades · ${displayDate(run.completedAt ?? run.startedAt)}`;
}

function SigefCoverageIndicator({ coverage }: { coverage: SigefCoverage | null }) {
  const summary = sigefCoverageSummary(coverage?.coveredUex ?? 0, coverage?.referenceMasterCount ?? 0);
  const progressStyle = { "--sigef-progress": `${summary.percentage}%` } as CSSProperties;
  const lastCollected = coverage?.lastCollectedAt ? displayDate(coverage.lastCollectedAt) : "Sem evidência registrada";

  return <section className="audit-sigef-coverage" aria-label="Cobertura complementar SIGEF">
    <div className="audit-sigef-heading">
      <span><Layers3 size={13} aria-hidden="true" /> EVIDÊNCIA COMPLEMENTAR · SIGEF</span>
      <Tooltip>
        <TooltipTrigger asChild><button type="button" className="audit-sigef-help" aria-label="Entender a cobertura SIGEF"><CircleHelp size={14} /></button></TooltipTrigger>
        <TooltipContent side="top" sideOffset={8} className="audit-evidence-tooltip">A cobertura conta apenas UEx com evidência SIGEF preservada. Ela não substitui os dados do PDDEInfo e não mede ausência de crédito.</TooltipContent>
      </Tooltip>
    </div>
    <div className="audit-sigef-body">
      <div className="audit-sigef-ring" style={progressStyle} aria-hidden="true"><div><strong>{summary.percentage}<small>%</small></strong><span>coberto</span></div></div>
      <div className="audit-sigef-measure">
        <strong>{coverage ? summary.covered : "—"}<small>{coverage ? ` de ${summary.total} UEx` : ""}</small></strong>
        <span>com evidência SIGEF preservada</span>
      </div>
    </div>
    <div className="audit-sigef-progress" role="progressbar" aria-label="Cobertura SIGEF sobre a lista PDDEInfo" aria-valuemin={0} aria-valuemax={summary.total} aria-valuenow={summary.covered} aria-valuetext={`${summary.covered} de ${summary.total} UEx com evidência SIGEF preservada`}><span style={{ width: `${summary.percentage}%` }} /></div>
    <div className="audit-sigef-stats"><span><FileCheck2 size={13} aria-hidden="true" /> {coverage ? `${coverage.contributingRuns} lote(s) com evidência` : "Calculando lotes"}</span><span>{coverage ? `${summary.pending} UEx sem evidência SIGEF` : "Carregando cobertura"}</span></div>
    <footer><span><CalendarClock size={13} aria-hidden="true" /> Última evidência: {lastCollected}</span><small>Não substitui a referência PDDEInfo.</small></footer>
  </section>;
}

function EvidenceActions({ dossier, observation, runId, onOpenArtifact }: { dossier: Dossier; observation: Observation | null; runId: string; onOpenArtifact: (runId: string, artifactId: number) => void }) {
  if (!observation) return <p><b>Campo:</b> inexistente nesta execução.</p>;
  const htmlArtifact = dossier.artifacts.find(item => item.storageKey === observation.rawHtmlKey);
  const jsonArtifact = dossier.artifacts.find(item => item.storageKey === observation.normalizedJsonKey);
  return <>
    <p><b>Valor bruto:</b> {observation.rawValue ?? "—"}</p>
    <p><b>Normalizado:</b> {String(observation.normalizedValueJson?.value ?? "—")}</p>
    <p><b>Fonte:</b> {observation.source} · {displayDate(observation.consultedAt)}</p>
    <p><b>URL:</b> <code>{observation.sourceUrl}</code></p>
    <p><b>Estado:</b> <EvidenceStateBadge state={observation.state} className="audit-evidence-state-inline" /></p>
    <p><b>Trecho:</b> {observation.evidenceSnippet ?? "não disponível"}</p>
    <div className="audit-evidence-actions">
      {htmlArtifact && <button className="audit-evidence-button" onClick={() => onOpenArtifact(runId, htmlArtifact.id)}>HTML bruto · {htmlArtifact.sha256.slice(0, 12)}</button>}
      {jsonArtifact && <button className="audit-evidence-button" onClick={() => onOpenArtifact(runId, jsonArtifact.id)}>JSON normalizado · {jsonArtifact.sha256.slice(0, 12)}</button>}
    </div>
    {!htmlArtifact && !jsonArtifact && <p><b>Evidência:</b> não vinculada</p>}
  </>;
}

export default function Audit() {
  const { isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [sigefCoverage, setSigefCoverage] = useState<SigefCoverage | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [runArtifacts, setRunArtifacts] = useState<Artifact[]>([]);
  const [runEvents, setRunEvents] = useState<RunAuditEvent[]>([]);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [selectedInep, setSelectedInep] = useState<string | null>(null);
  const [programFilter, setProgramFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = async () => {
    if (!isAuthenticated) return;
    setLoading(true); setError(null);
    try {
      const [response, coverageResponse] = await Promise.all([
        operationalFetch("/api/pdde/audit/runs"),
        operationalFetch("/api/pdde/audit/sigef-coverage"),
      ]);
      if (!response.ok || !coverageResponse.ok) throw new Error("Não foi possível carregar o histórico de execuções.");
      const [payload, coveragePayload] = await Promise.all([
        response.json() as Promise<{ runs: AuditRun[] }>,
        coverageResponse.json() as Promise<{ coverage: SigefCoverage }>,
      ]);
      setRuns(payload.runs);
      setSigefCoverage(coveragePayload.coverage);
      setSelectedRunId(current => current && payload.runs.some(run => run.id === current) ? current : primaryAuditRunId(payload.runs));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao carregar auditoria."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadRuns(); }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedRunId || !isAuthenticated) { setSchools([]); setFindings([]); setRunArtifacts([]); setRunEvents([]); setDossier(null); return; }
    const loadRunDetails = async () => {
      setLoading(true); setError(null); setSelectedInep(null); setDossier(null);
      try {
        const [schoolResponse, findingResponse, overviewResponse] = await Promise.all([
          operationalFetch(`/api/pdde/audit/run/${selectedRunId}/schools`),
          operationalFetch(`/api/pdde/audit/run/${selectedRunId}/findings`),
          operationalFetch(`/api/pdde/audit/run/${selectedRunId}`),
        ]);
        if (!schoolResponse.ok || !findingResponse.ok || !overviewResponse.ok) throw new Error("Não foi possível carregar os detalhes da execução selecionada.");
        setSchools((await schoolResponse.json() as { schools: School[] }).schools);
        setFindings((await findingResponse.json() as { findings: Finding[] }).findings);
        const overview = await overviewResponse.json() as { artifacts: Artifact[]; events: RunAuditEvent[] };
        setRunArtifacts(overview.artifacts);
        setRunEvents(overview.events);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao carregar detalhes."); }
      finally { setLoading(false); }
    };
    void loadRunDetails();
  }, [isAuthenticated, selectedRunId]);

  const openDossier = async (inep: string) => {
    if (!selectedRunId) return;
    setSelectedInep(inep); setLoading(true); setError(null);
    try {
      const response = await operationalFetch(`/api/pdde/audit/run/${selectedRunId}/school/${inep}`);
      if (!response.ok) throw new Error("Não foi possível abrir o dossiê da unidade.");
      setDossier(await response.json() as Dossier);
      window.setTimeout(() => document.getElementById("dossie-financeiro")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao abrir dossiê."); }
    finally { setLoading(false); }
  };

  const openArtifact = async (runId: string, artifactId: number) => {
    setError(null);
    try {
      const response = await operationalFetch(`/api/pdde/audit/run/${runId}/artifact/${artifactId}`);
      if (!response.ok) throw new Error("Não foi possível abrir a evidência solicitada.");
      const payload = await response.json() as { artifact: { url: string } };
      window.open(payload.artifact.url, "_blank", "noopener,noreferrer");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao abrir evidência."); }
  };

  const selectedRun = runs.find(run => run.id === selectedRunId) ?? null;
  const selectedRunIsPrimary = selectedRun ? isPrimaryPddeInfoAuditRun(selectedRun) : false;
  const filteredSchools = useMemo(() => filterAuditSchools(schools, programFilter, schoolFilter), [schools, programFilter, schoolFilter]);
  const filteredObservations = useMemo(() => dossier ? filterAuditObservations(dossier.observations, fieldFilter) : [], [dossier, fieldFilter]);
  const financialDossier = useMemo(() => dossier ? buildFinancialSchoolDossier(dossier.observations) : null, [dossier]);
  const sigefMovements = useMemo(() => dossier ? buildSigefMovementDossier(dossier.observations) : [], [dossier]);
  const openDataArtifacts = runArtifacts.filter(artifact => artifact.kind === "open_data_file");
  const openDataEvents = runEvents.filter(event => event.payloadJson?.source === "DADOS_ABERTOS");
  const sigefArtifacts = runArtifacts.filter(artifact => artifact.kind === "sigef_movement_pdf");
  const sigefEvents = runEvents.filter(event => event.payloadJson?.source === "SIGEF_EXTRATO");

  return (
    <div className="audit-page">
      <header className="audit-topbar">
        <div className="audit-title-group"><div className="audit-title-mark" aria-hidden="true"><span>4</span><sup>ª</sup></div><div><span className="audit-kicker">4ª CRE · GAD · USO INTERNO</span><h1>Auditoria das escolas</h1><p>Escolha uma execução e uma unidade para consultar contas, parcelas, valores e, quando necessário, a respectiva evidência.</p></div></div>
        <div className="audit-actions"><HighContrastToggle /><button onClick={() => void loadRuns()} disabled={loading || authLoading} className="audit-button"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Atualizar</button><Link href="/" className="audit-back"><ArrowLeft size={16} /> Execução</Link></div>
      </header>

      {error && <div className="audit-error"><AlertTriangle size={17} /> {error}</div>}

      <section className="audit-reference-control" aria-label="Referência da auditoria">
        <div className="audit-reference-primary"><span>REFERÊNCIA EXIBIDA</span><strong>{selectedRunIsPrimary ? "PDDEInfo · execução aprovada" : "Evidência complementar"}</strong><small>{selectedRunIsPrimary ? "Os 163 registros aprovados do PDDEInfo permanecem como leitura principal da auditoria." : "Esta execução parcial é complementar. Selecione a referência PDDEInfo aprovada para consultar a lista completa de escolas."}</small></div>
        <SigefCoverageIndicator coverage={sigefCoverage} />
        <label className="audit-reference-select" htmlFor="audit-run-select">Execução disponível<select id="audit-run-select" value={selectedRunId ?? ""} onChange={event => setSelectedRunId(event.target.value || null)}>{runs.map(run => <option key={run.id} value={run.id}>{auditRunOptionLabel(run)}</option>)}</select></label>
      </section>

      <section className="audit-summary-grid">
        <div className="audit-summary"><span>COBERTURA DA CONSULTA</span><strong>{selectedRun ? `${selectedRun.processedCount}/${selectedRun.masterCount}` : "—"}</strong><small>unidades processadas na referência atual</small></div>
        <div className="audit-summary"><span>UNIDADES CONSULTADAS</span><strong>{selectedRun?.processedCount ?? "—"}</strong><small>dados disponíveis para conferência</small></div>
        <div className="audit-summary"><span>EXCEÇÕES</span><strong>{findings.length}</strong><small>pontos que merecem atenção</small></div>
        <div className="audit-summary"><span>SITUAÇÃO DA EXECUÇÃO</span><strong>{selectedRun ? operationalRunStatus(selectedRun.status) : "—"}</strong><small>pagamento registrado não confirma crédito bancário</small></div>
      </section>

      <section className="audit-workspace">
        <main className="audit-panel audit-schools"><div className="audit-panel-heading"><FileSearch size={17} /><h2>Unidades da execução</h2><span>{selectedRunId ? `${filteredSchools.length}/${schools.length} unidades` : "selecione uma execução"}</span></div>{schools.length ? <><p className="audit-panel-instruction">Selecione uma unidade para abrir imediatamente o resumo financeiro abaixo.</p><div className="audit-filter-grid"><input className="audit-filter" value={schoolFilter} onChange={event => setSchoolFilter(event.target.value)} placeholder="Buscar nome, INEP ou SME" aria-label="Buscar escola por nome, INEP ou SME" /><input className="audit-filter" value={programFilter} onChange={event => setProgramFilter(event.target.value)} placeholder="Filtrar por programa" aria-label="Filtrar escolas por programa" /></div><div className="audit-table-scroll"><table className="audit-data-table audit-school-table"><thead><tr><th>Unidade escolar</th><th>INEP / SME</th><th>Situação da consulta</th><th>Programas identificados</th></tr></thead><tbody>{filteredSchools.map(school => <tr key={`${school.inep}-${school.sme}`} className={selectedInep === school.inep ? "audit-row-selected" : ""} onClick={() => void openDossier(school.inep)}><td><button className="audit-school-button"><strong>{school.schoolName ?? "Nome da unidade não registrado"}</strong><span>Selecionar resumo financeiro</span></button></td><td><strong>{school.inep}</strong><small>SME {school.sme}</small></td><td><span className={badgeClass(school.status)}>{operationalConsultationStatus(school.status)}</span><small>{displayDate(school.consultedAt)}</small></td><td>{school.programsJson?.join(" · ") || "Nenhum programa identificado"}</td></tr>)}</tbody></table></div></> : <p className="audit-empty">Selecione uma execução com consultas persistidas.</p>}</main>

        <aside className="audit-panel audit-findings"><div className="audit-panel-heading"><ShieldCheck size={17} /><h2>Pontos de atenção</h2></div>{findings.length ? <div className="audit-finding-list">{findings.map(finding => <article key={finding.id} className="audit-finding"><span className={badgeClass(finding.severity)}>{finding.severity === "critical" ? "prioritário" : finding.severity === "warning" ? "atenção" : "informativo"}</span><p>{finding.message}</p>{(finding.previousValue !== null || finding.currentValue !== null) && <small>Anterior: {finding.previousValue ?? "—"} · Atual: {finding.currentValue ?? "—"}</small>}<small>{finding.inep ? `INEP ${finding.inep}` : "Execução geral"}</small></article>)}</div> : <p className="audit-empty">Nenhum ponto de atenção foi identificado nesta execução.</p>}</aside>
      </section>

      <section className="audit-panel audit-financial-dossier" id="dossie-financeiro">
        <div className="audit-panel-heading"><FileSearch size={17} /><h2>Resumo financeiro da unidade</h2><span>{selectedInep ? `INEP ${selectedInep}` : "selecione uma unidade acima"}</span></div>
        {dossier && financialDossier ? <div className="financial-dossier-content">
          <div className="financial-identity">
            <div className="financial-identity-primary"><span>UNIDADE EXECUTORA</span><strong>{financialDossier.schoolName ?? "Nome não informado pela fonte"}</strong></div>
            <div><span>UEx</span><strong>{financialDossier.uex ?? "—"}</strong></div>
            <div><span>CNPJ</span><strong>{financialDossier.cnpj ?? "—"}</strong></div>
            <div><span>CONSULTA</span><strong>{displayDate(dossier.consultation?.consultedAt)}</strong></div>
          </div>
          <div className="financial-sections">
            <article className="financial-accounts-panel">
              <header><h3>Contas informadas no PDDEInfo</h3><small>A conta do PDDE Básico somente aparece quando o rótulo é exatamente PDDE.</small></header>
              {financialDossier.accounts.length ? <div className="financial-table-scroll"><table className="financial-data-table"><thead><tr><th>Programa</th><th>Banco</th><th>Agência</th><th>Conta</th><th>Saldo</th></tr></thead><tbody>{financialDossier.accounts.map(account => <tr key={account.index}><td><span className={`financial-program ${account.program === "PDDE" ? "financial-program-basic" : ""}`}>{account.program ?? "—"}</span></td><td>{account.bank ?? "—"}</td><td>{account.agency ?? "—"}</td><td className="financial-code">{account.account ?? "não informado"}</td><td className="financial-amount">{account.balance ?? "—"}</td></tr>)}</tbody></table></div> : <p className="audit-empty">Nenhuma conta bancária foi exibida na página consultada.</p>}
            </article>
            <article className="financial-payments-panel">
              <header><h3>Parcelas e valores registrados</h3><small>“Valor pago” significa pagamento registrado no PDDEInfo; não confirma crédito bancário.</small></header>
              {financialDossier.payments.length ? <div className="financial-table-scroll"><table className="financial-data-table"><thead><tr><th>Destinação</th><th>Previsto</th><th>Pago registrado</th><th>Data da ordem</th><th>Estado</th></tr></thead><tbody>{financialDossier.payments.map(payment => <tr key={payment.index}><td className="financial-destination">{payment.destination ?? "—"}</td><td className="financial-amount">{payment.expected ?? "—"}</td><td className="financial-amount financial-paid">{payment.paid ?? "—"}</td><td>{payment.paymentDate ?? "—"}</td><td><EvidenceStateBadge state={payment.state} className={`financial-evidence-state ${payment.state === "PAGAMENTO_INFORMADO_PDDEINFO" ? "financial-evidence-confirmed" : ""}`} /></td></tr>)}</tbody></table></div> : <p className="audit-empty">Nenhuma parcela foi exibida na página consultada.</p>}
            </article>
            <article className="financial-payments-panel">
              <header><h3>Movimentações SIGEF — piloto PDDE Básico</h3><small>Créditos e débitos retornados pelo extrato do programa 02. Os lançamentos não classificam despesa, saldo real ou prestação de contas.</small></header>
              {sigefMovements.length ? <div className="financial-table-scroll"><table className="financial-data-table"><thead><tr><th>Data</th><th>Crédito</th><th>Débito</th><th>Documento</th><th>Histórico</th><th>Favorecido</th></tr></thead><tbody>{sigefMovements.map(movement => <tr key={`${movement.date}-${movement.document}`}><td>{movement.date}</td><td className="financial-amount financial-paid">{displayMoney(movement.credit)}</td><td className="financial-amount">{displayMoney(movement.debit)}</td><td className="financial-code">{movement.document}</td><td>{movement.historic}</td><td>{movement.beneficiaryName ?? "—"}<small>{movement.beneficiaryCnpj ?? ""}</small></td></tr>)}</tbody></table></div> : <p className="audit-empty">Nenhuma movimentação SIGEF foi preservada para esta unidade na execução selecionada.</p>}
            </article>
          </div>
        </div> : <p className="audit-empty">Selecione uma unidade na tabela acima. O resumo financeiro mostrará contas, parcelas e valores efetivamente extraídos.</p>}
      </section>

      <section className="audit-panel audit-dossier">
        <details className="audit-technical-foldout">
          <summary><FileSearch size={17} /><span><strong>Rastreabilidade e evidências</strong><small>Use apenas quando precisar conferir origem, regras de extração ou arquivos preservados.</small></span><span className="audit-foldout-action">Abrir detalhes</span></summary>
          {dossier && selectedRunId ? <div className="audit-dossier-grid">
            <div>
              <h3>Consulta e eventos registrados</h3>
              <p><strong>Situação:</strong> {operationalConsultationStatus(dossier.consultation?.status ?? "")}</p>
              <p><strong>Fonte:</strong> PDDEInfo. Pagamento registrado não equivale a crédito bancário confirmado.</p>
              <div className="audit-timeline">{dossier.events.map(event => <div key={event.id}><time>{displayDate(event.occurredAt)}</time><span className={badgeClass(event.severity)}>{operationalEventLabel(event.type)}</span><p>{event.message}</p></div>)}</div>
            </div>
            <div>
              <h3>Campos e evidências preservados</h3>
              <input className="audit-filter" value={fieldFilter} onChange={event => setFieldFilter(event.target.value)} placeholder="Buscar campo ou evidência" aria-label="Buscar campo ou evidência" />
              <div className="audit-observation-list">{filteredObservations.map(observation => <article key={observation.id}><header><strong>{observation.fieldPath}</strong><EvidenceStateBadge state={observation.state} className={badgeClass(observation.state ?? "info")} /></header><EvidenceActions dossier={dossier} observation={observation} runId={selectedRunId} onOpenArtifact={(runId, artifactId) => void openArtifact(runId, artifactId)} /><p><b>Regra:</b> {observation.extractionRule} · {observation.parserVersion}</p><p><b>Hash:</b> <code>{observation.sourceHashSha256?.slice(0, 18) ?? "—"}</code></p>{observation.validationResultsJson?.map(result => <small key={`${observation.id}-${result.code}`} className={`audit-validation audit-validation-${result.level}`}>{result.message}</small>)}</article>)}</div>
            </div>
          </div> : <p className="audit-empty">Selecione uma unidade para consultar os registros técnicos preservados.</p>}
          <div className="audit-source-records">
            <h3>Fontes complementares desta execução</h3>
            <p>Esses arquivos são controles de apoio. Eles não substituem os dados financeiros apresentados acima.</p>
            <div className="audit-source-record-grid">
              <article><strong>Dados Abertos FNDE</strong><span>{openDataArtifacts.length ? `${openDataArtifacts.length} arquivo(s) registrado(s)` : "Nenhum arquivo registrado"}</span>{openDataArtifacts.map(artifact => <button key={artifact.id} className="audit-evidence-button" onClick={() => void openArtifact(selectedRunId!, artifact.id)}>Abrir arquivo de apoio</button>)}{openDataEvents.map(event => <small key={event.id}>{displayDate(event.occurredAt)} · {event.message}</small>)}</article>
              <article><strong>SIGEF</strong><span>{sigefArtifacts.length ? `${sigefArtifacts.length} evidência(s) parcial(is)` : "Nenhuma evidência registrada"}</span>{sigefArtifacts.map(artifact => <button key={artifact.id} className="audit-evidence-button" onClick={() => void openArtifact(selectedRunId!, artifact.id)}>Abrir evidência registrada</button>)}{sigefEvents.map(event => <small key={event.id}>{displayDate(event.occurredAt)} · {event.message}</small>)}{selectedRun?.validationJson.sourceLimitations?.length ? <small>Limitações: {selectedRun.validationJson.sourceLimitations.join(" · ")}</small> : null}</article>
            </div>
          </div>
        </details>
      </section>

    </div>
  );
}
