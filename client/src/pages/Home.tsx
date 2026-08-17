import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { HighContrastToggle } from "@/components/HighContrastToggle";
import {
  Activity, CheckCircle2, CircleAlert, CloudDownload,
  FileSpreadsheet, Gauge, LockKeyhole, Play, RefreshCw,
  ShieldCheck, Timer, UsersRound, XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { accountStatusLabel, filterHomeSchools, type HomeSchool, type HomeSchoolFilter } from "./homeSchools";
import { isHomeJsonResponse } from "./homeData";

type Validation = {
  passed: boolean;
  uniqueIneps: number;
  firstInstallmentPaid: number;
  secondInstallmentExpected: number;
  missingBasicAccounts: number;
  errors: string[];
};

type Audit = {
  inep: string;
  sme: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  attempts: number;
  programsFound: string[];
  exception: string | null;
};

type TimelineItem = {
  timestamp: string;
  message: string;
  kind: "info" | "success" | "error";
};

const initialEvents: TimelineItem[] = [
  { timestamp: "PRONTO", message: "Lista-mestre embutida e validação preventiva disponível.", kind: "info" },
  { timestamp: "PRONTO", message: "Após a consulta, a lista de escolas fica disponível nesta página.", kind: "info" },
];

const ACTIVE_RUN_STORAGE_KEY = "pddeinfo-4cre:last-run-id";
type RestoredRun = {
  id: string;
  status: string;
  validation?: Validation | null;
  downloadUrl?: string | null;
  records: number;
  persisted?: boolean;
};

type FinanceSnapshot = {
  runId: string;
  completedAt: string | null;
  schoolCount: number;
  totalExpected: number;
  totalPaid: number;
  accountedSchools: number;
  missingBasicAccounts: number;
  firstInstallmentPaid: number;
  secondInstallmentExpected: number;
};

type HomeFinanceSummary = {
  reference: FinanceSnapshot | null;
  history: FinanceSnapshot[];
  note: string;
};

const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const formatShortDate = (value: string | null) => value ? new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "") : "—";

function FinanceTrend({ snapshots }: { snapshots: FinanceSnapshot[] }) {
  if (snapshots.length < 2) return <div className="trend-empty"><span>EVOLUÇÃO TEMPORAL</span><strong>A trajetória aparecerá após duas execuções aprovadas.</strong><small>Não transformamos uma fotografia isolada em uma tendência artificial.</small></div>;
  const max = Math.max(...snapshots.map(snapshot => snapshot.totalPaid), 1);
  const points = snapshots.map((snapshot, index) => {
    const x = snapshots.length === 1 ? 320 : 28 + (index * 584) / (snapshots.length - 1);
    const y = 142 - (snapshot.totalPaid / max) * 104;
    return { snapshot, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  return <div className="trend-visual"><div className="trend-legend"><span><i className="trend-dot trend-dot-paid" />Pago informado</span><small>{snapshots.length} execuções aprovadas · {formatShortDate(snapshots[0]?.completedAt)} — {formatShortDate(snapshots.at(-1)?.completedAt ?? null)}</small></div><svg viewBox="0 0 640 180" role="img" aria-label="Evolução do total pago informado nas execuções aprovadas"><path className="trend-grid-line" d="M28 142 H612 M28 90 H612 M28 38 H612" /><path className="trend-line" d={path} />{points.map(point => <g key={point.snapshot.runId} className="trend-point"><circle cx={point.x} cy={point.y} r="5" /><title>{`${formatShortDate(point.snapshot.completedAt)} · ${formatCurrency(point.snapshot.totalPaid)}`}</title><text x={point.x} y="168" textAnchor="middle">{formatShortDate(point.snapshot.completedAt)}</text></g>)}</svg><small className="trend-note">{snapshots.length > 0 ? "A série compara execuções aprovadas do PDDEInfo; não representa saldo bancário mensal." : ""}</small></div>;
}

function ActionRow({ label, value, hint, tone, onClick }: { label: string; value: number; hint: string; tone: "attention" | "positive" | "neutral"; onClick?: () => void }) {
  const content = <><span className={`action-row-marker action-row-marker-${tone}`} /><div><strong>{label}</strong><small>{hint}</small></div><b>{value}</b><span className="action-row-arrow">›</span></>;
  return onClick ? <button type="button" className="action-row action-row-clickable" onClick={onClick}>{content}</button> : <div className="action-row">{content}</div>;
}

function MetricCard({ label, value, hint, accent, onClick, action }: { label: string; value: string | number; hint: string; accent: "teal" | "gold" | "plum" | "blue"; onClick?: () => void; action?: string }) {
  const content = <>
    <span className="metric-label">{label}</span>
    <strong className="metric-value">{value}</strong>
    <span className="metric-hint">{hint}</span>
    {action && <span className="metric-action">{action}</span>}
  </>;
  return onClick ? <button type="button" className={`metric-card metric-card-${accent} metric-card-actionable`} onClick={onClick}>{content}</button> : <div className={`metric-card metric-card-${accent}`}>{content}</div>;
}

function ValidationItem({ label, value, expected, ready, onClick }: { label: string; value: string | number; expected: string; ready: boolean; onClick?: () => void }) {
  const pass = ready && String(value) === expected;
  const content = <>
    <div className={`validation-icon ${ready ? (pass ? "validation-pass" : "validation-fail") : "validation-wait"}`}>
      {ready ? (pass ? <CheckCircle2 size={16} /> : <XCircle size={16} />) : <Timer size={16} />}
    </div>
    <div className="validation-copy">
      <span>{label}</span>
      <small>referência: {expected}</small>
    </div>
    <strong>{value}</strong>
    {onClick && <span className="validation-action">Ver unidades</span>}
  </>;
  return onClick ? <button type="button" className="validation-item validation-item-actionable" onClick={onClick}>{content}</button> : <div className="validation-item">{content}</div>;
}

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  const { isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [master, setMaster] = useState({ count: 163, unique: 163, valid: false });
  const [completed, setCompleted] = useState(0);
  const [running, setRunning] = useState(false);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [events, setEvents] = useState<TimelineItem[]>(initialEvents);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [financeSummary, setFinanceSummary] = useState<HomeFinanceSummary | null>(null);
  const [homeSchools, setHomeSchools] = useState<HomeSchool[]>([]);
  const [homeSchoolsState, setHomeSchoolsState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState<HomeSchoolFilter>("all");

  const reloadHomeResults = useCallback(async () => {
    if (!isAuthenticated) return;
    setHomeSchoolsState("loading");
    const parseJson = async <T,>(response: Response): Promise<T | null> => {
      if (!isHomeJsonResponse(response.ok, response.headers.get("content-type"))) return null;
      try {
        return await response.json() as T;
      } catch {
        return null;
      }
    };
    const [summaryResponse, schoolsResponse] = await Promise.all([
      fetch("/api/pdde/home/finance-summary"),
      fetch("/api/pdde/home/schools"),
    ]);
    const [summary, schools] = await Promise.all([
      parseJson<HomeFinanceSummary>(summaryResponse),
      parseJson<{ schools?: HomeSchool[] }>(schoolsResponse),
    ]);
    setFinanceSummary(summary);
    if (schools) {
      const payload = schools;
      setHomeSchools(payload.schools ?? []);
      setHomeSchoolsState("ready");
    } else {
      setHomeSchools([]);
      setHomeSchoolsState("unavailable");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/pdde/master-list")
      .then(response => response.json())
      .then(payload => setMaster(payload))
      .catch(() => setFatalError("Não foi possível validar a lista-mestre no servidor."));
  }, [isAuthenticated]);

  useEffect(() => {
    void reloadHomeResults();
  }, [reloadHomeResults]);

  const progress = Math.round((completed / 163) * 100);
  const ready = Boolean(validation);
  const referenceSnapshot = financeSummary?.reference ?? null;
  const referenceRunId = referenceSnapshot?.runId ?? activeRunId;
  const visibleHomeSchools = useMemo(
    () => filterHomeSchools(homeSchools, schoolSearch, schoolFilter),
    [homeSchools, schoolSearch, schoolFilter],
  );
  const schoolFilterCount = (filter: HomeSchoolFilter) => filterHomeSchools(homeSchools, "", filter).length;
  const chooseSchoolFilter = (filter: HomeSchoolFilter) => {
    setSchoolFilter(filter);
    window.setTimeout(() => document.getElementById("escolas-consultadas")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const openSchool = (inep: string) => {
    if (!referenceRunId) return;
    window.location.assign(`/unidade/${encodeURIComponent(referenceRunId)}/${encodeURIComponent(inep)}`);
  };

  const appendEvent = (item: TimelineItem) => setEvents(current => [item, ...current].slice(0, 9));

  const restoreRun = useCallback(async (runId: string, quiet = false) => {
    const response = await fetch(`/api/pdde/run/${runId}`);
    if (!response.ok) {
      if (response.status === 404) window.localStorage.removeItem(ACTIVE_RUN_STORAGE_KEY);
      throw new Error("Não foi possível recuperar o estado persistido da execução.");
    }
    const payload = await response.json() as RestoredRun;
    const isRunning = payload.status.toLowerCase() === "running";
    setActiveRunId(payload.id);
    setCompleted(payload.records);
    setRunning(isRunning);
    setValidation(payload.validation ?? null);
    setDownloadUrl(payload.downloadUrl ?? null);
    setFatalError(null);
    if (!quiet) {
      appendEvent({
        timestamp: payload.persisted ? "RETOMADO" : "RECONECTADO",
        message: isRunning
          ? `${payload.records}/163 consultas persistidas. O acompanhamento foi restaurado sem reiniciar a coleta.`
          : payload.validation?.passed
            ? "Execução aprovada recuperada do histórico; o Excel V2 permanece disponível."
            : "Execução recuperada do histórico; consulte as validações e a auditoria para o resultado.",
        kind: isRunning ? "info" : payload.validation?.passed ? "success" : "error",
      });
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const runId = window.localStorage.getItem(ACTIVE_RUN_STORAGE_KEY);
    if (!runId) return;
    void restoreRun(runId).catch(cause => setFatalError(cause instanceof Error ? cause.message : "Não foi possível restaurar a execução anterior."));
  }, [isAuthenticated, restoreRun]);

  useEffect(() => {
    if (!isAuthenticated || window.localStorage.getItem(ACTIVE_RUN_STORAGE_KEY)) return;
    const restoreLatestApproved = async () => {
      const response = await fetch("/api/pdde/latest-approved");
      if (response.status === 404) return;
      if (!response.ok) throw new Error("Não foi possível recuperar a última execução aprovada.");
      const payload = await response.json() as RestoredRun;
      setActiveRunId(payload.id);
      setCompleted(payload.records);
      setRunning(false);
      setValidation(payload.validation ?? null);
      setDownloadUrl(payload.downloadUrl ?? null);
      window.localStorage.setItem(ACTIVE_RUN_STORAGE_KEY, payload.id);
      appendEvent({ timestamp: "RESULTADO", message: "Última execução aprovada recuperada. O Excel V2 está disponível para download.", kind: "success" });
    };
    void restoreLatestApproved().catch(cause => setFatalError(cause instanceof Error ? cause.message : "Não foi possível recuperar a última execução aprovada."));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!running || !activeRunId) return;
    const interval = window.setInterval(() => {
      void restoreRun(activeRunId, true).catch(() => undefined);
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [activeRunId, restoreRun, running]);

  const startExtraction = () => {
    if (running || authLoading || !isAuthenticated) return;
    setCompleted(0);
    setAudits([]);
    setValidation(null);
    setDownloadUrl(null);
    setFatalError(null);
    setRunning(true);
    setActiveRunId(null);
    setEvents([{ timestamp: "INÍCIO", message: "Verificação prévia concluída. Abrindo consulta individual ao PDDEInfo.", kind: "info" }, ...initialEvents]);

    const source = new EventSource("/api/pdde/run");
    source.onmessage = event => {
      const payload = JSON.parse(event.data);
      if (payload.type === "ready") {
        setActiveRunId(payload.runId);
        window.localStorage.setItem(ACTIVE_RUN_STORAGE_KEY, payload.runId);
        appendEvent({ timestamp: "LISTA", message: `${payload.total} INEPs únicos confirmados. Iniciando lotes resilientes.`, kind: "success" });
      }
      if (payload.type === "progress") {
        setCompleted(payload.completed);
        setAudits(current => [...current, payload.audit]);
        if (payload.completed === 1 || payload.completed % 10 === 0 || payload.audit.status === "FAILED") {
          appendEvent({
            timestamp: `LOTE ${String(payload.batch).padStart(2, "0")}`,
            message: payload.message,
            kind: payload.audit.status === "FAILED" ? "error" : "success",
          });
        }
      }
      if (payload.type === "complete") {
        setValidation(payload.validation);
        setDownloadUrl(payload.downloadUrl);
        setRunning(false);
        void reloadHomeResults();
        appendEvent({
          timestamp: payload.validation.passed ? "APROVADO" : "BLOQUEADO",
          message: payload.validation.passed ? "Todas as validações bloquearam corretamente e o Excel V2 foi liberado." : "A validação não foi aprovada. O download permanece bloqueado.",
          kind: payload.validation.passed ? "success" : "error",
        });
        source.close();
      }
      if (payload.type === "fatal") {
        setFatalError(payload.message);
        setRunning(false);
        appendEvent({ timestamp: "FALHA", message: payload.message, kind: "error" });
        source.close();
      }
    };
    source.onerror = () => {
      source.close();
      const runId = window.localStorage.getItem(ACTIVE_RUN_STORAGE_KEY);
      if (runId) void restoreRun(runId).catch(() => setFatalError("A conexão de acompanhamento foi interrompida. A execução persistida será recuperada ao atualizar a página."));
    };
  };

  return (
    <div className="app-shell">
      <aside className="side-rail">
        <div className="brand-block">
          <div className="brand-mark"><span>4</span><sup>ª</sup></div>
          <div><p>SECRETARIA MUNICIPAL DE EDUCAÇÃO</p><strong>4ª CRE · GAD</strong><small>Extrator Financeiro PDDE</small></div>
        </div>
        <div className="side-section">
          <span className="side-caption">NAVEGAÇÃO</span>
          <a className="side-nav side-nav-active" href="#inteligencia"><Gauge size={17} /><span>Inteligência financeira</span></a>
          <a className="side-nav" href="#execucao"><ShieldCheck size={17} /><span>Execução</span></a>
          <a className="side-nav" href="/auditoria"><Activity size={17} /><span>Auditoria</span></a>
        </div>
        <div className="side-footer"><span className="pulse-dot" />AMBIENTE OPERACIONAL</div>
      </aside>

      <main className="command-center" id="operacao">
        <header className="topbar">
          <div className="breadcrumb">EXTRATOR FINANCEIRO PDDEINFO <span>/</span> 4ª CRE <span>/</span> EXERCÍCIO 2026</div>
          <div className="topbar-controls"><HighContrastToggle /><div className="top-status"><span className="status-dot" />SERVIÇO DISPONÍVEL <span className="top-divider" /> USO INTERNO</div></div>
        </header>

          <section className="intelligence-home" id="inteligencia">
            <section className="position-panel">
            <div className="editorial-heading"><span>RESULTADO DA ÚLTIMA CONSULTA</span><h2>Escolas e dados encontrados</h2><p>{referenceSnapshot ? `${referenceSnapshot.schoolCount} escolas consultadas. Escolha uma unidade abaixo para ver suas contas, programas e parcelas.` : "Assim que a consulta terminar, as escolas aparecerão aqui."}</p></div>
            <div className="position-metrics">
              <div className="position-metric position-metric-primary"><span>Escolas consultadas</span><strong>{referenceSnapshot ? `${referenceSnapshot.schoolCount}` : "—"}</strong><small>registros disponíveis para abrir</small></div>
              <div className="position-metric position-metric-paid"><span>Conta do PDDE encontrada</span><strong>{referenceSnapshot ? `${referenceSnapshot.accountedSchools}` : "—"}</strong><small>contas rotuladas como PDDE pela fonte</small></div>
              <div className="position-metric"><span>Conta do PDDE não exibida</span><strong>{referenceSnapshot ? `${referenceSnapshot.missingBasicAccounts}` : "—"}</strong><small>não é uma falha da escola</small></div>
            </div>
          </section>
          <section className="school-results-panel" id="escolas-consultadas">
            <div className="school-results-heading"><div><span>ESCOLAS CONSULTADAS</span><h2>Abra uma escola para ver os detalhes</h2><p>A lista é a continuação da consulta. A Auditoria permanece reservada para evidências e conferências técnicas.</p></div><strong>{visibleHomeSchools.length}<small> de {homeSchools.length || referenceSnapshot?.schoolCount || 0} escolas</small></strong></div>
            <div className="school-results-controls"><input value={schoolSearch} onChange={event => setSchoolSearch(event.target.value)} placeholder="Buscar por escola, INEP, SME ou programa" aria-label="Buscar por escola, INEP, SME ou programa" /><div className="school-result-filters"><button type="button" className={schoolFilter === "all" ? "school-filter-active" : ""} onClick={() => chooseSchoolFilter("all")}>Todas <b>{schoolFilterCount("all")}</b></button><button type="button" className={schoolFilter === "account-found" ? "school-filter-active" : ""} onClick={() => chooseSchoolFilter("account-found")}>Conta PDDE encontrada <b>{schoolFilterCount("account-found")}</b></button><button type="button" className={schoolFilter === "account-not-shown" ? "school-filter-active" : ""} onClick={() => chooseSchoolFilter("account-not-shown")}>Conta PDDE não exibida <b>{schoolFilterCount("account-not-shown")}</b></button></div></div>
            <div className="school-result-list">{visibleHomeSchools.map(school => <article className="school-result-row" key={school.inep}><div className="school-result-identity"><strong>{school.schoolName ?? "Unidade escolar"}</strong><span>INEP {school.inep} · SME {school.sme}</span></div><div className="school-result-programs">{school.programsJson?.length ? school.programsJson.map((program: string) => <span key={program}>{program}</span>) : <span>Programa não exibido</span>}</div><div className="school-account-summary"><span className={`school-account-status school-account-${school.basicAccountStatus ?? "unknown"}`}>{accountStatusLabel(school.basicAccountStatus)}</span>{school.basicAccount && <small>Ag. {school.basicAccount.agency ?? "—"} · Conta {school.basicAccount.account ?? "—"}</small>}</div><div className="school-payment-summary">{school.firstInstallmentPaid && <span className="school-payment-paid">1ª parcela registrada</span>}{school.secondInstallmentExpected && <span>2ª parcela prevista</span>}{!school.firstInstallmentPaid && !school.secondInstallmentExpected && <span>Sem parcela exibida</span>}</div><button type="button" onClick={() => openSchool(school.inep)} disabled={!referenceRunId}>Abrir detalhes <span>›</span></button></article>)}{homeSchoolsState === "loading" && <p className="school-result-empty">Carregando as escolas da última consulta aprovada…</p>}{homeSchoolsState === "unavailable" && <p className="school-result-empty">Não foi possível carregar a lista agora. Atualize a página para tentar novamente.</p>}{homeSchoolsState === "ready" && !visibleHomeSchools.length && <p className="school-result-empty">Nenhuma escola corresponde à busca ou ao filtro atual.</p>}</div>
          </section>
        </section>

        <section className="hero-grid" id="rotina-consulta">
          <div>
          <div className="eyebrow">ATUALIZAÇÃO DOS DADOS</div>
          <h1>Consultar as 163 escolas</h1>
          <p className="hero-copy">Use esta ação quando precisar atualizar os resultados. Ao terminar, a lista de escolas acima será renovada.</p>
            <div className="hero-actions">
              <Button className="run-button" onClick={startExtraction} disabled={running || !master.valid || authLoading || !isAuthenticated}>
                {running ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />} {running ? "Extração em curso" : "Iniciar extração"}
              </Button>
              {downloadUrl && validation?.passed ? (
                <div className="download-actions">
                  <a href={downloadUrl} className="download-link download-direct" download><FileSpreadsheet size={17} /> Baixar planilha financeira</a>
                  <a href={downloadUrl} className="download-link" target="_blank" rel="noreferrer"><CloudDownload size={17} /> Consultar cópia para auditoria</a>
                </div>
              ) : <span className="download-locked"><LockKeyhole size={15} /> Download condicionado à validação</span>}
            </div>
          </div>
          <div className="hero-seal">
            <div className="seal-copy"><span>CONSULTA ATUAL</span><strong>Dados das 163 escolas</strong><dl><div><dt>Unidades</dt><dd>163 selecionadas</dd></div><div><dt>Fonte</dt><dd>PDDEInfo / 2026</dd></div><div><dt>Detalhes</dt><dd>Disponíveis por escola</dd></div></dl></div>
          </div>
        </section>

        <section className="extraction-monitor" aria-live="polite" aria-label="Acompanhamento da extração">
          <header className="extraction-monitor-heading">
            <div><span>ACOMPANHAMENTO DA EXTRAÇÃO</span><h2>{running ? "Consulta das escolas em andamento" : validation?.passed ? "Última extração concluída" : "Aguardando nova extração"}</h2><p>{running ? "Acompanhe os lotes, os registros concluídos e os eventos desta consulta em tempo real." : validation?.passed ? "A consulta mais recente permanece disponível para consulta por escola." : "Inicie a extração quando precisar atualizar os dados das escolas."}</p></div>
            <Badge className={running ? "extraction-monitor-badge extraction-monitor-badge-running" : validation?.passed ? "extraction-monitor-badge extraction-monitor-badge-complete" : "extraction-monitor-badge"}>{running ? "EM ANDAMENTO" : validation?.passed ? "CONCLUÍDA" : "PRONTA"}</Badge>
          </header>
          <div className="extraction-progress-line"><div><strong>{completed}/163</strong><span>escolas processadas</span></div><Progress value={progress} /><b>{progress}%</b></div>
          <div className="extraction-batches" aria-label={`${Math.ceil(completed / 10)} de 17 lotes concluídos`}>{Array.from({ length: 17 }, (_, index) => { const done = completed >= Math.min((index + 1) * 10, 163); const current = running && !done && index === Math.floor(completed / 10); return <span key={index} className={done ? "extraction-batch-done" : current ? "extraction-batch-current" : ""}>{String(index + 1).padStart(2, "0")}</span>; })}</div>
          <div className="extraction-monitor-bottom"><div className="extraction-live-stats"><span><UsersRound size={15} />{audits.length} registros acompanhados nesta sessão</span><span><CircleAlert size={15} />{audits.filter(audit => audit.status === "FAILED").length} consultas com falha</span></div><div className="extraction-event-log">{events.slice(0, 4).map((event, index) => <div key={`${event.timestamp}-${event.message}-${index}`} className={`extraction-event extraction-event-${event.kind}`}><time>{event.timestamp}</time><p>{event.message}</p></div>)}</div></div>
        </section>

        <section className="metrics-row" id="execucao">
              <MetricCard label="Unidades selecionadas" value={`${master.count}/163`} hint={master.valid ? "INEPs únicos verificados" : "verificando lista-mestre"} accent="teal" onClick={referenceRunId ? () => chooseSchoolFilter("all") : undefined} action={referenceRunId ? "Ver escolas" : undefined} />
          <MetricCard label="Processamento" value={`${completed}/163`} hint={running ? `lote ${Math.max(1, Math.ceil(completed / 10))} em andamento` : "não iniciado"} accent="gold" />
              <MetricCard label="Contas PDDE" value={validation ? `${163 - validation.missingBasicAccounts}/163` : "—"} hint="encontradas no PDDEInfo" accent="plum" onClick={referenceRunId ? () => chooseSchoolFilter("account-not-shown") : undefined} action={referenceRunId ? "Ver lista" : undefined} />
          <MetricCard label="Arquivo" value={validation ? (validation.passed ? "LIBERADO" : "BLOQUEADO") : "PENDENTE"} hint="dependente das validações" accent="blue" />
        </section>

        <section className="update-status-card" aria-label="Situação da atualização">
          <div><span>ATUALIZAÇÃO</span><strong>{running ? `Consultando ${completed} de 163 escolas` : validation?.passed ? "Consulta concluída" : "Pronto para atualizar"}</strong></div>
          {fatalError && <p className="fatal-notice"><CircleAlert size={17} />{fatalError}</p>}
          {validation && !validation.passed && <p className="fatal-notice"><CircleAlert size={17} />{validation.errors.join(" ")}</p>}
        </section>

        <footer className="footer-line"><span>EXTRATOR FINANCEIRO PDDEINFO · 4ª CRE</span><span>Selecione uma escola para ver informações completas.</span></footer>
      </main>
    </div>
  );
}
