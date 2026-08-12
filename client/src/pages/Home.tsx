import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Activity, CheckCircle2, CircleAlert, CloudDownload,
  FileSpreadsheet, Gauge, LockKeyhole, Play, RefreshCw,
  ShieldCheck, Timer, UsersRound, XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  accessState: "AUTONOMOUS_AVAILABLE" | "AUTONOMOUS_COMPLETED" | "PILOT_PENDING" | "CAPTCHA_REQUIRED" | "AUTHORIZATION_REQUIRED" | "SOURCE_UNAVAILABLE" | "SCHEMA_CHANGED";
  autonomous: boolean;
  collectionMethod: string;
  detail: string;
  baseUrl: string;
};

const initialEvents: TimelineItem[] = [
  { timestamp: "PRONTO", message: "Lista-mestre embutida e validação preventiva disponível.", kind: "info" },
  { timestamp: "REGRA", message: "Conta do PDDE Básico só é aceita quando o rótulo bancário é exatamente PDDE.", kind: "info" },
];

function MetricCard({ label, value, hint, accent }: { label: string; value: string | number; hint: string; accent: "teal" | "gold" | "plum" | "blue" }) {
  return (
    <div className={`metric-card metric-card-${accent}`}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      <span className="metric-hint">{hint}</span>
    </div>
  );
}

function ValidationItem({ label, value, expected, ready }: { label: string; value: string | number; expected: string; ready: boolean }) {
  const pass = ready && String(value) === expected;
  return (
    <div className="validation-item">
      <div className={`validation-icon ${ready ? (pass ? "validation-pass" : "validation-fail") : "validation-wait"}`}>
        {ready ? (pass ? <CheckCircle2 size={16} /> : <XCircle size={16} />) : <Timer size={16} />}
      </div>
      <div className="validation-copy">
        <span>{label}</span>
        <small>referência: {expected}</small>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  const [master, setMaster] = useState({ count: 163, unique: 163, valid: false });
  const [completed, setCompleted] = useState(0);
  const [running, setRunning] = useState(false);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [events, setEvents] = useState<TimelineItem[]>(initialEvents);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceAutomation[]>([]);

  useEffect(() => {
    fetch("/api/pdde/master-list")
      .then(response => response.json())
      .then(payload => setMaster(payload))
      .catch(() => setFatalError("Não foi possível validar a lista-mestre no servidor."));
  }, []);

  useEffect(() => {
    fetch("/api/pdde/sources")
      .then(response => response.json())
      .then(payload => setSources(payload.sources ?? []))
      .catch(() => setSources([]));
  }, []);

  const progress = Math.round((completed / 163) * 100);
  const recentAudits = useMemo(() => audits.slice(-7).reverse(), [audits]);
  const ready = Boolean(validation);

  const appendEvent = (item: TimelineItem) => setEvents(current => [item, ...current].slice(0, 9));

  const startExtraction = () => {
    if (running) return;
    setCompleted(0);
    setAudits([]);
    setValidation(null);
    setDownloadUrl(null);
    setFatalError(null);
    setRunning(true);
    setEvents([{ timestamp: "INÍCIO", message: "Verificação prévia concluída. Abrindo consulta individual ao PDDEInfo.", kind: "info" }, ...initialEvents]);

    const source = new EventSource("/api/pdde/run");
    source.onmessage = event => {
      const payload = JSON.parse(event.data);
      if (payload.type === "ready") {
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
      if (running) setFatalError("A conexão de acompanhamento foi interrompida. Verifique o log e inicie uma nova execução se necessário.");
      source.close();
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
          <a className="side-nav side-nav-active" href="#operacao"><Gauge size={17} /><span>Execução</span></a>
          <a className="side-nav" href="#validacoes"><ShieldCheck size={17} /><span>Validações</span></a>
          <a className="side-nav" href="#auditoria"><Activity size={17} /><span>Registros</span></a>
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
          <div className="top-status"><span className="status-dot" />SERVIÇO DISPONÍVEL <span className="top-divider" /> USO INTERNO</div>
        </header>

        <section className="hero-grid">
          <div>
            <div className="eyebrow">ROTINA DE CONSULTA</div>
            <h1>Execução de extração</h1>
            <p className="hero-copy">Inicie a consulta das unidades selecionadas, acompanhe o processamento por lote e libere o arquivo somente após os controles obrigatórios.</p>
            <div className="hero-actions">
              <Button className="run-button" onClick={startExtraction} disabled={running || !master.valid}>
                {running ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />} {running ? "Extração em curso" : "Iniciar extração"}
              </Button>
              {downloadUrl && validation?.passed ? (
                <div className="download-actions">
                  <a href={downloadUrl} className="download-link download-direct" download><FileSpreadsheet size={17} /> Baixar Excel V2</a>
                  <a href={downloadUrl} className="download-link" target="_blank" rel="noreferrer"><CloudDownload size={17} /> Abrir cópia persistente</a>
                </div>
              ) : <span className="download-locked"><LockKeyhole size={15} /> Download condicionado à validação</span>}
            </div>
          </div>
          <div className="hero-seal">
            <div className="seal-copy"><span>REFERÊNCIA DA EXECUÇÃO</span><strong>Financeiro 4ª CRE V2</strong><dl><div><dt>Unidades</dt><dd>163 selecionadas</dd></div><div><dt>Fonte</dt><dd>PDDEInfo / 2026</dd></div><div><dt>Saída</dt><dd>Excel condicionado</dd></div></dl></div>
          </div>
        </section>

        <section className="metrics-row">
          <MetricCard label="Unidades selecionadas" value={`${master.count}/163`} hint={master.valid ? "INEPs únicos verificados" : "verificando lista-mestre"} accent="teal" />
          <MetricCard label="Processamento" value={`${completed}/163`} hint={running ? `lote ${Math.max(1, Math.ceil(completed / 10))} em andamento` : "não iniciado"} accent="gold" />
          <MetricCard label="Contas PDDE" value={validation ? `${163 - validation.missingBasicAccounts}/163` : "—"} hint="informadas no PDDEInfo" accent="plum" />
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
            <ValidationItem label="INEPs únicos" value={validation?.uniqueIneps ?? "—"} expected="163" ready={ready} />
            <ValidationItem label="1ª parcela com pagamento registrado" value={validation?.firstInstallmentPaid ?? "—"} expected="111" ready={ready} />
            <ValidationItem label="2ª parcela prevista" value={validation?.secondInstallmentExpected ?? "—"} expected="163" ready={ready} />
            <ValidationItem label="Conta PDDE não informada" value={validation?.missingBasicAccounts ?? "—"} expected="47" ready={ready} />
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
            const stateLabel = source.accessState === "AUTONOMOUS_AVAILABLE" ? "AUTÔNOMA" : source.accessState === "CAPTCHA_REQUIRED" ? "CAPTCHA EXTERNO" : source.accessState === "AUTHORIZATION_REQUIRED" ? "AUTORIZAÇÃO EXIGIDA" : "PILOTO PENDENTE";
            const stateClass = source.accessState === "AUTONOMOUS_AVAILABLE" ? "source-ready" : source.accessState === "CAPTCHA_REQUIRED" || source.accessState === "AUTHORIZATION_REQUIRED" ? "source-blocked" : "source-pilot";
            return <tr key={source.source}><td><strong>{source.label}</strong></td><td className="source-method">{source.collectionMethod}</td><td><span className={`source-status ${stateClass}`}>{stateLabel}</span></td><td>{source.detail}</td></tr>;
          })}{!sources.length && <tr><td colSpan={4} className="empty-audit">Nenhuma fonte disponível no momento.</td></tr>}</tbody></table></div>
        </section>

        <footer className="footer-line"><span>EXTRATOR FINANCEIRO PDDEINFO · 4ª CRE</span><span>ARQUIVO V2 · CONTAS COMO TEXTO · DATAS EM CALENDÁRIO</span></footer>
      </main>
    </div>
  );
}
