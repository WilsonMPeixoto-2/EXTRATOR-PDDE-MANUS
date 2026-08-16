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

type SourceAutomation = {
  source: string;
  label: string;
  accessState: "AUTONOMOUS_AVAILABLE" | "AUTONOMOUS_COMPLETED" | "PILOT_PENDING" | "PILOT_COMPLETED_WITH_LIMITATIONS" | "CAPTCHA_REQUIRED" | "AUTHORIZATION_REQUIRED" | "SOURCE_UNAVAILABLE" | "SCHEMA_CHANGED";
  autonomous: boolean;
  collectionMethod: string;
  detail: string;
  baseUrl: string;
};

const initialEvents: TimelineItem[] = [
  { timestamp: "PRONTO", message: "Lista-mestre embutida e validação preventiva disponível.", kind: "info" },
  { timestamp: "REGRA", message: "Conta do PDDE Básico só é aceita quando o rótulo bancário é exatamente PDDE.", kind: "info" },
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
  const [sources, setSources] = useState<SourceAutomation[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [financeSummary, setFinanceSummary] = useState<HomeFinanceSummary | null>(null);
  const [portfolioSearch, setPortfolioSearch] = useState("");

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/pdde/master-list")
      .then(response => response.json())
      .then(payload => setMaster(payload))
      .catch(() => setFatalError("Não foi possível validar a lista-mestre no servidor."));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/pdde/home/finance-summary")
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Resumo financeiro indisponível")))
      .then(payload => setFinanceSummary(payload as HomeFinanceSummary))
      .catch(() => setFinanceSummary(null));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/pdde/sources")
      .then(response => response.json())
      .then(payload => setSources(payload.sources ?? []))
      .catch(() => setSources([]));
  }, [isAuthenticated]);

  const progress = Math.round((completed / 163) * 100);
  const recentAudits = useMemo(() => audits.slice(-7).reverse(), [audits]);
  const ready = Boolean(validation);
  const referenceSnapshot = financeSummary?.reference ?? null;
  const referenceRunId = referenceSnapshot?.runId ?? activeRunId;

  const sourceMethodLabel = (method: SourceAutomation["collectionMethod"]) => ({
    http: "Consulta direta",
    "file-import": "Arquivo autorizado",
    "browser-script": "Navegação autorizada",
    "institutional-channel": "Canal institucional",
  } as Record<SourceAutomation["collectionMethod"], string>)[method];

  const sourceStateLabel = (state: SourceAutomation["accessState"]) => ({
    AUTONOMOUS_AVAILABLE: "Disponível",
    AUTONOMOUS_COMPLETED: "Concluída",
    PILOT_PENDING: "Em avaliação",
    PILOT_COMPLETED_WITH_LIMITATIONS: "Complementar em teste",
    CAPTCHA_REQUIRED: "Acesso externo pendente",
    AUTHORIZATION_REQUIRED: "Autorização necessária",
    SOURCE_UNAVAILABLE: "Indisponível",
    SCHEMA_CHANGED: "Fonte alterada",
  } as Record<SourceAutomation["accessState"], string>)[state];

  const openAuditSubset = (subset: string) => {
    if (!referenceRunId) return;
    window.location.assign(`/auditoria?run=${encodeURIComponent(referenceRunId)}&subset=${encodeURIComponent(subset)}`);
  };

  const openPortfolioSearch = () => {
    if (!referenceRunId || !portfolioSearch.trim()) return;
    window.location.assign(`/auditoria?run=${encodeURIComponent(referenceRunId)}&school=${encodeURIComponent(portfolioSearch.trim())}`);
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
        <div className="side-rule">
          <LockKeyhole size={16} />
          <p><strong>Controle obrigatório</strong>Conta do PDDE Básico somente é aceita quando o programa bancário é exatamente PDDE.</p>
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
            <div className="editorial-heading"><span>ABERTURA EDITORIAL-FINANCEIRA</span><h2>Posição financeira de 2026</h2><p>{referenceSnapshot ? `Referência aprovada em ${formatShortDate(referenceSnapshot.completedAt)} · ${referenceSnapshot.schoolCount} unidades consultadas` : "Aguardando uma execução aprovada para compor a fotografia financeira."}</p></div>
            <div className="position-metrics">
              <div className="position-metric position-metric-primary"><span>Previsto 2026</span><strong>{referenceSnapshot ? formatCurrency(referenceSnapshot.totalExpected) : "—"}</strong><small>valores previstos nas destinações extraídas</small></div>
              <div className="position-metric position-metric-paid"><span>Pago informado</span><strong>{referenceSnapshot ? formatCurrency(referenceSnapshot.totalPaid) : "—"}</strong><small>registro no PDDEInfo · não confirma crédito bancário</small></div>
              <div className="position-metric"><span>Contas PDDE informadas</span><strong>{referenceSnapshot ? `${referenceSnapshot.accountedSchools}/${referenceSnapshot.schoolCount}` : "—"}</strong><small>rótulo exato PDDE na fonte corrente</small></div>
            </div>
          </section>
          <section className="home-middle-grid">
            <article className="trend-panel"><div className="editorial-heading"><span>EVOLUÇÃO</span><h2>O que mudou entre as referências?</h2><p>{financeSummary?.note ?? "A evolução só aparece quando há mais de uma execução aprovada comparável."}</p></div><FinanceTrend snapshots={financeSummary?.history ?? []} /></article>
            <article className="attention-panel"><div className="editorial-heading"><span>ACOMPANHAMENTO</span><h2>Onde vale olhar agora</h2><p>Todo item abaixo abre o conjunto real de unidades correspondente.</p></div><div className="action-list"><ActionRow label="Conta PDDE Básico a confirmar" value={referenceSnapshot?.missingBasicAccounts ?? 0} hint="unidades sem conta vigente informada" tone="attention" onClick={referenceRunId ? () => openAuditSubset("missing-basic-account") : undefined} /><ActionRow label="1ª parcela com registro" value={referenceSnapshot?.firstInstallmentPaid ?? 0} hint="unidades com pagamento registrado" tone="positive" onClick={referenceRunId ? () => openAuditSubset("first-installment-paid") : undefined} /><ActionRow label="2ª parcela prevista" value={referenceSnapshot?.secondInstallmentExpected ?? 0} hint="unidades que pedem acompanhamento" tone="neutral" onClick={referenceRunId ? () => openAuditSubset("second-installment-expected") : undefined} /></div></article>
          </section>
          <section className="portfolio-panel"><div><span>CARTEIRA</span><h2>As 163 unidades, prontas para investigação</h2><p>Busque por nome, INEP ou SME e entre diretamente no dossiê financeiro da escola.</p></div><div className="portfolio-actions"><form onSubmit={event => { event.preventDefault(); openPortfolioSearch(); }}><input value={portfolioSearch} onChange={event => setPortfolioSearch(event.target.value)} placeholder="Buscar unidade, INEP ou SME" aria-label="Buscar unidade, INEP ou SME" /><button type="submit" disabled={!referenceRunId || !portfolioSearch.trim()}>Buscar</button></form><button type="button" className="portfolio-link" onClick={() => openAuditSubset("all")} disabled={!referenceRunId}>Abrir carteira completa <span>›</span></button></div></section>
        </section>

        <section className="hero-grid" id="rotina-consulta">
          <div>
            <div className="eyebrow">ROTINA DE CONSULTA</div>
            <h1>Extração auditável</h1>
            <p className="hero-copy">Quando a referência precisar ser atualizada, inicie a consulta das unidades e libere o arquivo somente após os controles obrigatórios.</p>
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
            <div className="seal-copy"><span>REFERÊNCIA DA EXECUÇÃO</span><strong>Financeiro 4ª CRE V2</strong><dl><div><dt>Unidades</dt><dd>163 selecionadas</dd></div><div><dt>Fonte</dt><dd>PDDEInfo / 2026</dd></div><div><dt>Saída</dt><dd>Excel condicionado</dd></div></dl></div>
          </div>
        </section>

        <section className="metrics-row" id="execucao">
          <MetricCard label="Unidades selecionadas" value={`${master.count}/163`} hint={master.valid ? "INEPs únicos verificados" : "verificando lista-mestre"} accent="teal" onClick={activeRunId ? () => openAuditSubset("all") : undefined} action={activeRunId ? "Abrir lista" : undefined} />
          <MetricCard label="Processamento" value={`${completed}/163`} hint={running ? `lote ${Math.max(1, Math.ceil(completed / 10))} em andamento` : "não iniciado"} accent="gold" />
          <MetricCard label="Contas PDDE" value={validation ? `${163 - validation.missingBasicAccounts}/163` : "—"} hint="informadas no PDDEInfo" accent="plum" onClick={activeRunId ? () => openAuditSubset("missing-basic-account") : undefined} action={activeRunId ? "Ver não informadas" : undefined} />
          <MetricCard label="Arquivo" value={validation ? (validation.passed ? "LIBERADO" : "BLOQUEADO") : "PENDENTE"} hint="dependente das validações" accent="blue" />
        </section>

        <section className="workspace-grid">
          <article className="process-card">
            <div className="panel-title"><div><span>PROCESSAMENTO</span><h2>Consulta das unidades</h2></div><Badge className={running ? "badge-running" : "badge-idle"}>{running ? "EM EXECUÇÃO" : validation?.passed ? "CONCLUÍDA" : "AGUARDANDO"}</Badge></div>
            <div className="progress-header"><span>{running ? "Consulta ao PDDEInfo em lotes de 10 unidades" : "Aguardando início da execução"}</span><strong>{progress}%</strong></div>
            <Progress value={progress} className="extract-progress" />
            <div className="lot-map">
              {Array.from({ length: 17 }, (_, index) => {
                const start = index * 10;
                const done = completed >= Math.min(start + 10, 163);
                const active = running && completed > start && !done;
                return <span key={index} className={done ? "lot-complete" : active ? "lot-active" : "lot-pending"}>{String(index + 1).padStart(2, "0")}</span>;
              })}
            </div>
            <div className="event-log">
              <div className="log-heading"><span>LOG DE EVENTOS</span><span>DATA DA FONTE: 2026</span></div>
              {events.map((event, index) => <div className="log-item" key={`${event.timestamp}-${index}`}><span className={`log-indicator log-${event.kind}`} /><code>{event.timestamp}</code><p>{event.message}</p></div>)}
            </div>
          </article>

          <article className="policy-card">
            <div className="policy-symbol"><ShieldCheck size={24} /></div>
            <span className="policy-kicker">REGRA DE ASSOCIAÇÃO</span>
            <h2>Vínculo da<br />conta PDDE</h2>
            <p>A conta do PDDE Básico é preenchida somente quando o rótulo bancário é exatamente <strong>PDDE</strong>.</p>
            <div className="policy-rule"><span>RÓTULO ACEITO</span><strong>PDDE</strong></div>
            <div className="policy-denied"><span>REJEITADOS PARA BÁSICO</span><p>PDDE QUALIDADE<br />PDDE EQUIDADE<br />EDUCAÇÃO INTEGRAL</p></div>
          </article>
        </section>

        <section className="validation-card" id="validacoes">
          <div className="validation-heading"><div><span>CONTROLES DE LIBERAÇÃO</span><h2>Validações da execução</h2></div><p>O arquivo permanece bloqueado enquanto houver requisito obrigatório pendente ou reprovado.</p></div>
          <div className="validation-grid">
            <ValidationItem label="INEPs únicos" value={validation?.uniqueIneps ?? "—"} expected="163" ready={ready} onClick={activeRunId ? () => openAuditSubset("all") : undefined} />
            <ValidationItem label="1ª parcela com pagamento registrado" value={validation?.firstInstallmentPaid ?? "—"} expected="111" ready={ready} onClick={activeRunId ? () => openAuditSubset("first-installment-paid") : undefined} />
            <ValidationItem label="2ª parcela prevista" value={validation?.secondInstallmentExpected ?? "—"} expected="163" ready={ready} onClick={activeRunId ? () => openAuditSubset("second-installment-expected") : undefined} />
            <ValidationItem label="Conta PDDE não informada" value={validation?.missingBasicAccounts ?? "—"} expected="47" ready={ready} onClick={activeRunId ? () => openAuditSubset("missing-basic-account") : undefined} />
          </div>
          {fatalError && <div className="fatal-notice"><CircleAlert size={17} />{fatalError}</div>}
          {validation && !validation.passed && <div className="fatal-notice"><CircleAlert size={17} />{validation.errors.join(" ")}</div>}
        </section>

        <section className="audit-card" id="auditoria">
          <div className="panel-title"><div><span>REGISTRO DE CONSULTAS</span><h2>Ocorrências recentes</h2></div><div className="audit-meta"><FileSpreadsheet size={16} /> Pagamento: <strong>registro no PDDEInfo, sem confirmação bancária</strong></div></div>
          <div className="audit-table-wrap"><table className="audit-table"><thead><tr><th>INEP</th><th>SME</th><th>STATUS</th><th>TENTATIVAS</th><th>PROGRAMAS IDENTIFICADOS</th><th>OCORRÊNCIA</th></tr></thead><tbody>{recentAudits.length ? recentAudits.map(audit => <tr key={`${audit.inep}-${audit.sme}`}><td className="mono">{audit.inep}</td><td className="mono">{audit.sme}</td><td><span className={`table-status ${audit.status === "SUCCESS" ? "table-ok" : "table-error"}`}>{audit.status === "SUCCESS" ? "SUCESSO" : "FALHA"}</span></td><td>{audit.attempts}</td><td>{audit.programsFound.join(" · ") || "—"}</td><td>{audit.exception ?? "Consulta registrada"}</td></tr>) : <tr><td colSpan={6} className="empty-audit"><UsersRound size={18} /> A auditoria por unidade aparecerá aqui durante a extração.</td></tr>}</tbody></table></div>
        </section>

        <section className="source-card" aria-labelledby="fontes-title">
          <div className="panel-title"><div><span>FONTES E AUTONOMIA</span><h2 id="fontes-title">Situação de coleta</h2></div><p className="source-intro">Cada fonte informa se já é consultada automaticamente ou se depende de validação de acesso.</p></div>
          <div className="source-table-wrap"><table className="source-table"><thead><tr><th>FONTE</th><th>MÉTODO</th><th>SITUAÇÃO</th><th>OBSERVAÇÃO OPERACIONAL</th></tr></thead><tbody>{sources.map(source => {
            const stateLabel = sourceStateLabel(source.accessState);
            const stateClass = source.accessState === "AUTONOMOUS_AVAILABLE" || source.accessState === "AUTONOMOUS_COMPLETED" ? "source-ready" : source.accessState === "CAPTCHA_REQUIRED" || source.accessState === "AUTHORIZATION_REQUIRED" ? "source-blocked" : "source-pilot";
            return <tr key={source.source}><td><strong>{source.label}</strong></td><td className="source-method">{sourceMethodLabel(source.collectionMethod)}</td><td><span className={`source-status ${stateClass}`}>{stateLabel}</span></td><td>{source.detail}</td></tr>;
          })}{!sources.length && <tr><td colSpan={4} className="empty-audit">Nenhuma fonte disponível no momento.</td></tr>}</tbody></table></div>
        </section>

        <footer className="footer-line"><span>EXTRATOR FINANCEIRO PDDEINFO · 4ª CRE</span><span>ARQUIVO V2 · CONTAS COMO TEXTO · DATAS EM CALENDÁRIO</span></footer>
      </main>
    </div>
  );
}
