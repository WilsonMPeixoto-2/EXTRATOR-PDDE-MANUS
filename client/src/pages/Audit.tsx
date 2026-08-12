import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, ArrowLeft, FileSearch, History, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { buildObservationComparisons, filterAuditObservations, filterAuditRuns, filterAuditSchools } from "./auditFilters";

type AuditRun = { id: string; status: "running" | "approved" | "blocked" | "failed"; masterCount: number; processedCount: number; parserVersion: string; startedAt: string; completedAt: string | null; validationJson: { passed?: boolean; errors?: string[] } };
type School = { inep: string; sme: string; status: "success" | "failed"; consultedAt: string; programsJson: string[]; exception: string | null };
type Finding = { id: number; severity: "info" | "warning" | "critical"; code: string; message: string; inep: string | null; previousValue: string | null; currentValue: string | null };
type Observation = { id: number; fieldPath: string; logicalKey: string; source: string; sourceUrl: string; consultedAt: string; rawValue: string | null; normalizedValueJson: { value?: string | number | null } | null; parserVersion: string; extractionRule: string; selector: string; evidenceSnippet: string | null; state: string | null; sourceHashSha256: string | null; rawHtmlKey: string | null; normalizedJsonKey: string | null; validationResultsJson: Array<{ code: string; level: string; message: string }> };
type Artifact = { id: number; kind: string; storageKey: string; sha256: string; contentType: string; createdAt?: string };
type RunAuditEvent = { id: string; occurredAt: string; type: string; severity: string; message: string; payloadJson?: { source?: string; exercise?: number; matchedSchools?: number; warnings?: string[] } };
type Dossier = { consultation: School | null; observations: Observation[]; events: Array<{ id: string; occurredAt: string; type: string; severity: string; message: string }>; findings: Finding[]; artifacts: Artifact[] };

function displayDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("pt-BR") : "—";
}

function badgeClass(status: string) {
  if (["approved", "success", "info", "unchanged"].includes(status)) return "audit-badge audit-badge-ok";
  if (["blocked", "warning", "changed"].includes(status)) return "audit-badge audit-badge-warn";
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

function EvidenceActions({ dossier, observation, runId, onOpenArtifact }: { dossier: Dossier; observation: Observation | null; runId: string; onOpenArtifact: (runId: string, artifactId: number) => void }) {
  if (!observation) return <p><b>Campo:</b> inexistente nesta execução.</p>;
  const htmlArtifact = dossier.artifacts.find(item => item.storageKey === observation.rawHtmlKey);
  const jsonArtifact = dossier.artifacts.find(item => item.storageKey === observation.normalizedJsonKey);
  return <>
    <p><b>Valor bruto:</b> {observation.rawValue ?? "—"}</p>
    <p><b>Normalizado:</b> {String(observation.normalizedValueJson?.value ?? "—")}</p>
    <p><b>Fonte:</b> {observation.source} · {displayDate(observation.consultedAt)}</p>
    <p><b>URL:</b> <code>{observation.sourceUrl}</code></p>
    <p><b>Estado:</b> {evidenceStateLabel(observation.state)}</p>
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
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runFilter, setRunFilter] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [runArtifacts, setRunArtifacts] = useState<Artifact[]>([]);
  const [runEvents, setRunEvents] = useState<RunAuditEvent[]>([]);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [selectedInep, setSelectedInep] = useState<string | null>(null);
  const [programFilter, setProgramFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [comparisonRunId, setComparisonRunId] = useState<string | null>(null);
  const [comparisonDossier, setComparisonDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = async () => {
    if (!isAuthenticated) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/pdde/audit/runs");
      if (!response.ok) throw new Error("Não foi possível carregar o histórico de execuções.");
      const payload = await response.json() as { runs: AuditRun[] };
      setRuns(payload.runs);
      setSelectedRunId(current => current ?? payload.runs[0]?.id ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao carregar auditoria."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadRuns(); }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedRunId || !isAuthenticated) { setSchools([]); setFindings([]); setRunArtifacts([]); setRunEvents([]); setDossier(null); return; }
    const loadRunDetails = async () => {
      setLoading(true); setError(null); setSelectedInep(null); setDossier(null); setComparisonDossier(null);
      try {
        const [schoolResponse, findingResponse, overviewResponse] = await Promise.all([
          fetch(`/api/pdde/audit/run/${selectedRunId}/schools`),
          fetch(`/api/pdde/audit/run/${selectedRunId}/findings`),
          fetch(`/api/pdde/audit/run/${selectedRunId}`),
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

  const comparisonCandidates = useMemo(() => {
    const selectedIndex = runs.findIndex(run => run.id === selectedRunId);
    return selectedIndex < 0 ? [] : runs.slice(selectedIndex + 1).filter(run => run.completedAt && run.status !== "running");
  }, [runs, selectedRunId]);

  useEffect(() => {
    setComparisonRunId(comparisonCandidates[0]?.id ?? null);
    setComparisonDossier(null);
  }, [selectedRunId, comparisonCandidates]);

  const openDossier = async (inep: string) => {
    if (!selectedRunId) return;
    setSelectedInep(inep); setLoading(true); setError(null); setComparisonDossier(null);
    try {
      const response = await fetch(`/api/pdde/audit/run/${selectedRunId}/school/${inep}`);
      if (!response.ok) throw new Error("Não foi possível abrir o dossiê da unidade.");
      setDossier(await response.json() as Dossier);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao abrir dossiê."); }
    finally { setLoading(false); }
  };

  const openArtifact = async (runId: string, artifactId: number) => {
    setError(null);
    try {
      const response = await fetch(`/api/pdde/audit/run/${runId}/artifact/${artifactId}`);
      if (!response.ok) throw new Error("Não foi possível abrir a evidência solicitada.");
      const payload = await response.json() as { artifact: { url: string } };
      window.open(payload.artifact.url, "_blank", "noopener,noreferrer");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao abrir evidência."); }
  };

  const loadHistoricalComparison = async () => {
    if (!comparisonRunId || !selectedInep) return;
    setComparisonLoading(true); setError(null);
    try {
      const response = await fetch(`/api/pdde/audit/run/${comparisonRunId}/school/${selectedInep}`);
      if (!response.ok) throw new Error("Não foi possível carregar a execução de referência.");
      setComparisonDossier(await response.json() as Dossier);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao carregar comparação histórica."); }
    finally { setComparisonLoading(false); }
  };

  const selectedRun = runs.find(run => run.id === selectedRunId) ?? null;
  const comparisonRun = runs.find(run => run.id === comparisonRunId) ?? null;
  const filteredRuns = useMemo(() => filterAuditRuns(runs, runFilter), [runs, runFilter]);
  const filteredSchools = useMemo(() => filterAuditSchools(schools, programFilter, schoolFilter), [schools, programFilter, schoolFilter]);
  const filteredObservations = useMemo(() => dossier ? filterAuditObservations(dossier.observations, fieldFilter) : [], [dossier, fieldFilter]);
  const observationComparisons = useMemo(() => dossier && comparisonDossier ? buildObservationComparisons(dossier.observations, comparisonDossier.observations) : [], [dossier, comparisonDossier]);
  const changedComparisonCount = observationComparisons.filter(item => item.status !== "unchanged").length;
  const openDataArtifacts = runArtifacts.filter(artifact => artifact.kind === "open_data_file");
  const openDataEvents = runEvents.filter(event => event.payloadJson?.source === "DADOS_ABERTOS");

  return (
    <div className="audit-page">
      <header className="audit-topbar">
        <div><span className="audit-kicker">4ª CRE · GAD · USO INTERNO</span><h1>Trilha de auditoria</h1><p>Consulta histórica, evidências preservadas e achados sem substituição silenciosa entre fontes.</p></div>
        <div className="audit-actions"><button onClick={() => void loadRuns()} disabled={loading || authLoading} className="audit-button"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Atualizar</button><Link href="/" className="audit-back"><ArrowLeft size={16} /> Execução</Link></div>
      </header>

      {error && <div className="audit-error"><AlertTriangle size={17} /> {error}</div>}

      <section className="audit-summary-grid">
        <div className="audit-summary"><span>EXECUÇÕES</span><strong>{runs.length}</strong><small>histórico disponível</small></div>
        <div className="audit-summary"><span>UNIDADES</span><strong>{selectedRun?.processedCount ?? "—"}</strong><small>na execução selecionada</small></div>
        <div className="audit-summary"><span>ACHADOS</span><strong>{findings.length}</strong><small>registros de exceção e regressão</small></div>
        <div className="audit-summary"><span>ESTADO</span><strong>{selectedRun?.status?.toUpperCase() ?? "—"}</strong><small>nunca infere crédito bancário</small></div>
      </section>

      <section className="audit-panel audit-open-data"><div className="audit-panel-heading"><ShieldCheck size={17} /><h2>Controle secundário · Dados Abertos FNDE</h2><span>{openDataArtifacts.length ? `${openDataArtifacts.length} arquivo(s)` : "não registrado"}</span></div>{openDataArtifacts.length ? <div className="audit-finding-list">{openDataArtifacts.map(artifact => <article key={artifact.id} className="audit-finding"><span className={badgeClass("info")}>secundário</span><strong>{artifact.storageKey.split("/").at(-1)}</strong><p>Arquivo versionado; não substitui PDDEInfo, SIGEF ou extrato bancário.</p><small>Hash: <code>{artifact.sha256.slice(0, 18)}</code> · {artifact.contentType}</small><button className="audit-evidence-button" onClick={() => void openArtifact(selectedRunId!, artifact.id)}>Abrir arquivo registrado</button></article>)}</div> : <p className="audit-empty">Nenhum arquivo secundário foi registrado nesta execução.</p>}{openDataEvents.map(event => <p key={event.id} className="audit-comparison-caption">{displayDate(event.occurredAt)} · {event.message}{event.payloadJson?.warnings?.length ? ` Advertências: ${event.payloadJson.warnings.join(" ")}` : ""}</p>)}</section>

      <section className="audit-workspace">
        <aside className="audit-panel audit-runs"><div className="audit-panel-heading"><History size={17} /><h2>Execuções</h2><span>{runs.length ? `${filteredRuns.length}/${runs.length}` : ""}</span></div>{runs.length ? <><input className="audit-filter" value={runFilter} onChange={event => setRunFilter(event.target.value)} placeholder="Buscar ID, data ou estado" aria-label="Buscar execução por identificador, data ou estado" /><div className="audit-run-list">{filteredRuns.map(run => <button key={run.id} onClick={() => setSelectedRunId(run.id)} className={`audit-run ${run.id === selectedRunId ? "audit-run-active" : ""}`}><span className={badgeClass(run.status)}>{run.status}</span><strong>{displayDate(run.completedAt ?? run.startedAt)}</strong><small>{run.processedCount}/{run.masterCount} · parser {run.parserVersion}</small><code>{run.id.slice(0, 12)}</code></button>)}</div></> : <p className="audit-empty">Nenhuma execução persistida ainda.</p>}</aside>

        <main className="audit-panel audit-schools"><div className="audit-panel-heading"><FileSearch size={17} /><h2>Unidades da execução</h2><span>{selectedRunId ? `${filteredSchools.length}/${schools.length} registros` : "selecione uma execução"}</span></div>{schools.length ? <><div className="audit-filter-grid"><input className="audit-filter" value={schoolFilter} onChange={event => setSchoolFilter(event.target.value)} placeholder="Buscar INEP ou SME" aria-label="Buscar escola por INEP ou SME" /><input className="audit-filter" value={programFilter} onChange={event => setProgramFilter(event.target.value)} placeholder="Filtrar por programa" aria-label="Filtrar escolas por programa" /></div><div className="audit-table-scroll"><table className="audit-data-table"><thead><tr><th>INEP</th><th>SME</th><th>Consulta</th><th>Status</th><th>Programas</th></tr></thead><tbody>{filteredSchools.map(school => <tr key={`${school.inep}-${school.sme}`} className={selectedInep === school.inep ? "audit-row-selected" : ""} onClick={() => void openDossier(school.inep)}><td><button className="audit-link-button">{school.inep}</button></td><td>{school.sme}</td><td>{displayDate(school.consultedAt)}</td><td><span className={badgeClass(school.status)}>{school.status}</span></td><td>{school.programsJson?.join(" · ") || "—"}</td></tr>)}</tbody></table></div></> : <p className="audit-empty">Selecione uma execução com consultas persistidas.</p>}</main>

        <aside className="audit-panel audit-findings"><div className="audit-panel-heading"><ShieldCheck size={17} /><h2>Exceções</h2></div>{findings.length ? <div className="audit-finding-list">{findings.map(finding => <article key={finding.id} className="audit-finding"><span className={badgeClass(finding.severity)}>{finding.severity}</span><strong>{finding.code}</strong><p>{finding.message}</p>{(finding.previousValue !== null || finding.currentValue !== null) && <small>Anterior: {finding.previousValue ?? "—"} · Atual: {finding.currentValue ?? "—"}</small>}<small>{finding.inep ?? "execução geral"}</small></article>)}</div> : <p className="audit-empty">Nenhum achado persistido para esta execução.</p>}</aside>
      </section>

      <section className="audit-panel audit-dossier"><div className="audit-panel-heading"><FileSearch size={17} /><h2>Dossiê por campo</h2><span>{selectedInep ? `INEP ${selectedInep}` : "selecione uma unidade"}</span></div>{dossier && selectedRunId ? <div className="audit-dossier-grid"><div><h3>Consulta e eventos</h3><p><strong>Status:</strong> {dossier.consultation?.status ?? "—"}</p><p><strong>Fonte:</strong> PDDEInfo; pagamento registrado não equivale a crédito confirmado.</p><div className="audit-timeline">{dossier.events.map(event => <div key={event.id}><time>{displayDate(event.occurredAt)}</time><span className={badgeClass(event.severity)}>{event.type}</span><p>{event.message}</p></div>)}</div></div><div><h3>Proveniência dos campos</h3><input className="audit-filter" value={fieldFilter} onChange={event => setFieldFilter(event.target.value)} placeholder="Filtrar por campo, chave ou evidência" aria-label="Filtrar observações por campo" /><div className="audit-observation-list">{filteredObservations.map(observation => <article key={observation.id}><header><strong>{observation.fieldPath}</strong><span className={badgeClass(observation.state ?? "info")}>{observation.state ?? "SEM ESTADO"}</span></header><EvidenceActions dossier={dossier} observation={observation} runId={selectedRunId} onOpenArtifact={(runId, artifactId) => void openArtifact(runId, artifactId)} /><p><b>Regra:</b> {observation.extractionRule} · {observation.parserVersion}</p><p><b>Hash:</b> <code>{observation.sourceHashSha256?.slice(0, 18) ?? "—"}</code></p>{observation.validationResultsJson?.map(result => <small key={`${observation.id}-${result.code}`} className={`audit-validation audit-validation-${result.level}`}>{result.code}: {result.message}</small>)}</article>)}</div></div></div> : <p className="audit-empty">O cartão de proveniência exibirá valor bruto, valor normalizado, regra, hash, evidência e validações do campo selecionado.</p>}</section>

      {dossier && selectedInep && selectedRunId && <section className="audit-panel audit-comparison"><div className="audit-panel-heading"><History size={17} /><h2>Comparador histórico por campo</h2><span>{comparisonDossier ? `${changedComparisonCount} diferença(s)` : "selecione a referência"}</span></div>{comparisonCandidates.length ? <><div className="audit-comparison-controls"><label>Execução de referência<select value={comparisonRunId ?? ""} onChange={event => { setComparisonRunId(event.target.value || null); setComparisonDossier(null); }} aria-label="Selecionar execução de referência">{comparisonCandidates.map(run => <option key={run.id} value={run.id}>{displayDate(run.completedAt ?? run.startedAt)} · {run.id.slice(0, 12)}</option>)}</select></label><button className="audit-button" disabled={!comparisonRunId || comparisonLoading} onClick={() => void loadHistoricalComparison()}>{comparisonLoading ? "Carregando..." : "Comparar campos"}</button></div>{comparisonDossier && comparisonRun && <><p className="audit-comparison-caption"><strong>Atual:</strong> {displayDate(selectedRun?.completedAt ?? selectedRun?.startedAt)} · <strong>Referência:</strong> {displayDate(comparisonRun.completedAt ?? comparisonRun.startedAt)}. Valores e evidências permanecem separados por execução.</p><div className="audit-comparison-list">{observationComparisons.map(item => <article key={item.logicalKey} className="audit-comparison-item"><header><strong>{item.fieldPath}</strong><span className={badgeClass(item.status)}>{item.status}</span></header><div className="audit-comparison-columns"><section><h4>Execução atual</h4><EvidenceActions dossier={dossier} observation={item.current} runId={selectedRunId} onOpenArtifact={(runId, artifactId) => void openArtifact(runId, artifactId)} /></section><section><h4>Execução de referência</h4><EvidenceActions dossier={comparisonDossier} observation={item.previous} runId={comparisonRun.id} onOpenArtifact={(runId, artifactId) => void openArtifact(runId, artifactId)} /></section></div></article>)}</div></>}</> : <p className="audit-empty">Não há execução anterior concluída disponível para esta comparação.</p>}</section>}
    </div>
  );
}
