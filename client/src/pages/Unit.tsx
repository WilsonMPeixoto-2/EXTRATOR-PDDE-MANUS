import "./unit.css";
import { ArrowLeft, ChevronDown, CircleHelp, ExternalLink, FileSearch, Info, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { HighContrastToggle } from "@/components/HighContrastToggle";
import { useAuth } from "@/_core/hooks/useAuth";
import { buildFinancialSchoolDossier, buildSigefMovementDossier, evidenceStateExplanation, type FinancialSchoolDossier, type SigefMovementDossierLine } from "./auditFilters";

type Observation = {
  id: number;
  fieldPath: string;
  logicalKey: string;
  source: string;
  sourceUrl: string;
  consultedAt: string;
  rawValue: string | null;
  normalizedValueJson: { value?: string | number | null } | null;
  parserVersion: string;
  extractionRule: string;
  selector: string;
  evidenceSnippet: string | null;
  state: string | null;
  sourceHashSha256: string | null;
  rawHtmlKey: string | null;
  normalizedJsonKey: string | null;
  validationResultsJson: Array<{ code: string; level: string; message: string }>;
};

type Dossier = {
  consultation: { inep: string; sme: string; schoolName: string | null; status: string; consultedAt: string; exception: string | null } | null;
  observations: Observation[];
  events: Array<{ id: string; occurredAt: string; type: string; severity: string; message: string }>;
  findings: Array<{ id: number; severity: string; code: string; message: string; inep: string | null; previousValue: string | null; currentValue: string | null }>;
  artifacts: Array<{ id: number; kind: string; storageKey: string; sha256: string; contentType: string; createdAt?: string }>;
};

const stateLabels: Record<string, string> = {
  PAGAMENTO_INFORMADO_PDDEINFO: "PAGO INFORMADO",
  OB_CORROBORADA_CREDITO_NAO_LOCALIZADO: "ORDEM CORROBORADA",
  CREDITO_LOCALIZADO_SIGEF: "CRÉDITO LOCALIZADO",
  CREDITO_CONFIRMADO_EXTRATO_BB: "CRÉDITO CONFIRMADO",
  CREDITO_ESTORNADO_OU_DEVOLVIDO: "ESTORNADO OU DEVOLVIDO",
  SEM_PAGAMENTO_REGISTRADO_ATE_CONSULTA: "SEM PAGAMENTO INFORMADO",
  DIVERGENCIA_ENTRE_FONTES: "DIVERGÊNCIA",
  CONSULTA_INCONCLUSIVA: "INCONCLUSIVO",
  REVISAO_NECESSARIA: "REVISAR",
};

function displayDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "—";
}

function displayDateTime(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("pt-BR") : "—";
}

function parseMoney(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === "") return null;
  const text = value.replace(/[^0-9,.-]/g, "");
  if (!text) return null;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: number | null) {
  return value === null ? "—" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function sumMoney(values: Array<string | null | undefined>) {
  const parsed = values.map(parseMoney).filter((value): value is number => value !== null);
  return parsed.length ? parsed.reduce((sum, value) => sum + value, 0) : null;
}

function dateSortValue(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : value;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

type TimelineEvent = {
  date: string;
  label: string;
  detail: string;
  tone: "positive" | "neutral" | "attention";
};

function StatePill({ state }: { state: string | null | undefined }) {
  const label = state ? stateLabels[state] ?? state : "SEM ESTADO INFORMADO";
  const tone = state === "PAGAMENTO_INFORMADO_PDDEINFO" || state === "CREDITO_CONFIRMADO_EXTRATO_BB" || state === "CREDITO_LOCALIZADO_SIGEF" ? "positive" : state === "DIVERGENCIA_ENTRE_FONTES" || state === "REVISAO_NECESSARIA" ? "attention" : "neutral";
  return <span className={`unit-state unit-state-${tone}`}>{label}</span>;
}

function ContextNote({ children }: { children: React.ReactNode }) {
  return <details className="unit-context"><summary><CircleHelp size={14} /> <span>Sobre este dado</span><ChevronDown size={14} /></summary><div>{children}</div></details>;
}

function PrimaryPosition({ dossier, financial }: { dossier: Dossier; financial: FinancialSchoolDossier }) {
  const expected = sumMoney(financial.payments.map(payment => payment.expected));
  const paid = sumMoney(financial.payments.map(payment => payment.paid));
  const accountCount = financial.accounts.filter(account => account.account || account.agency).length;
  const balance = sumMoney(financial.accounts.map(account => account.balance));
  return <section className="unit-position">
    <div className="unit-section-heading"><span>POSIÇÃO FINANCEIRA 2026</span><p>Leitura principal da referência PDDEInfo corrente.</p></div>
    <div className="unit-position-grid">
      <div className="unit-position-item unit-position-main"><span>Previsto</span><strong>{formatMoney(expected)}</strong><small>destinações identificadas na consulta</small></div>
      <div className="unit-position-item unit-position-paid"><span>Pago informado</span><strong>{formatMoney(paid)}</strong><small>registro no PDDEInfo · não confirma crédito bancário</small></div>
      <div className="unit-position-item"><span>Saldo informado</span><strong>{formatMoney(balance)}</strong><small>{accountCount ? `${accountCount} conta(s) com posição exibida` : "nenhum saldo informado"}</small></div>
    </div>
    <div className="unit-position-footnote"><span>Consulta em {displayDateTime(dossier.consultation?.consultedAt)}</span><ContextNote>Os valores e estados desta área são transcrições normalizadas da consulta PDDEInfo. A data de pagamento informado não é apresentada como confirmação de crédito bancário.</ContextNote></div>
  </section>;
}

function ProgramsSection({ financial }: { financial: FinancialSchoolDossier }) {
  return <section className="unit-section unit-programs">
    <div className="unit-section-heading"><span>PROGRAMAS E PARCELAS</span><h2>Repasses organizados para conferência</h2><p>Valor e estado aparecem juntos; detalhes técnicos permanecem em outra camada.</p></div>
    {financial.payments.length ? <div className="unit-payment-list">{financial.payments.map(payment => {
      const paidValue = parseMoney(payment.paid);
      const expectedValue = parseMoney(payment.expected);
      const isPaid = paidValue !== null && paidValue > 0;
      const displayValue = isPaid ? paidValue : expectedValue;
      return <article className="unit-payment-row" key={payment.index}>
        <div className="unit-payment-label"><strong>{payment.destination ?? "Destinação não informada"}</strong><small>{payment.paymentDate ? `Pagamento informado em ${payment.paymentDate}` : "Data de pagamento não informada"}</small></div>
        <div className="unit-payment-value"><strong>{formatMoney(displayValue)}</strong><small>{isPaid ? "pago informado" : "previsto"}</small></div>
        <StatePill state={payment.state} />
      </article>;
    })}</div> : <div className="unit-empty"><Info size={17} /><div><strong>Nenhum repasse foi exibido na referência corrente.</strong><span>A unidade pode não ter registros compatíveis na consulta PDDEInfo de 2026.</span></div></div>}
  </section>;
}

function TimelineSection({ financial, movements }: { financial: FinancialSchoolDossier; movements: SigefMovementDossierLine[] }) {
  const events: TimelineEvent[] = [
    ...financial.payments.filter(payment => payment.paymentDate).map(payment => ({
      date: payment.paymentDate as string,
      label: "Pagamento informado",
      detail: `${payment.destination ?? "Destinação não informada"} · ${formatMoney(parseMoney(payment.paid) ?? parseMoney(payment.expected))}`,
      tone: "positive" as const,
    })),
    ...movements.map(movement => ({
      date: movement.date,
      label: movement.credit > 0 ? "Crédito observado no SIGEF" : "Movimentação complementar",
      detail: `${movement.historic} · ${formatMoney(movement.credit > 0 ? movement.credit : movement.debit)}`,
      tone: movement.credit > 0 ? "positive" as const : "neutral" as const,
    })),
  ].toSorted((left, right) => dateSortValue(left.date) - dateSortValue(right.date));
  return <section className="unit-section unit-timeline-section">
    <div className="unit-section-heading"><span>TRAJETÓRIA OBSERVADA</span><h2>Momentos financeiros da referência</h2><p>Eventos identificados nas fontes preservadas. A linha não preenche períodos que não foram observados.</p></div>
    {events.length ? <div className="unit-timeline" aria-label="Linha temporal de eventos financeiros observados">{events.map((event, index) => <article className="unit-timeline-event" key={`${event.date}-${event.label}-${index}`}><div className={`unit-timeline-dot unit-timeline-dot-${event.tone}`} /><time>{event.date}</time><div><strong>{event.label}</strong><span>{event.detail}</span></div></article>)}</div> : <div className="unit-empty"><Info size={17} /><div><strong>A trajetória aparecerá quando houver eventos datados preservados.</strong><span>A ausência de eventos não permite desenhar uma evolução contínua.</span></div></div>}
  </section>;
}

function AccountsSection({ financial }: { financial: FinancialSchoolDossier }) {
  const basicAccount = financial.accounts.find(account => account.program?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() === "PDDE");
  return <section className="unit-section unit-accounts">
    <div className="unit-section-heading"><span>CONTAS VINCULADAS</span><h2>Onde os recursos estão associados</h2><p>O programa PDDE Básico só é associado quando o rótulo bancário é exatamente PDDE.</p></div>
    {financial.accounts.length ? <div className="unit-account-list">{financial.accounts.map(account => <article className={`unit-account-row ${account.program === "PDDE" ? "unit-account-basic" : ""}`} key={account.index}>
      <div><strong>{account.program || "Programa não informado"}</strong><small>Banco {account.bank || "—"} · Agência {account.agency || "—"}</small></div>
      <div className="unit-account-number"><span>Conta</span><strong>{account.account || "não informada"}</strong></div>
      <div className="unit-account-balance"><span>Saldo informado</span><strong>{account.balance || "—"}</strong></div>
    </article>)}</div> : <div className="unit-empty unit-empty-attention"><ShieldAlert size={17} /><div><strong>Conta não informada na fonte corrente</strong><span>Contas históricas não são usadas como substituição do dado vigente.</span></div><ContextNote>O PDDEInfo não apresentou uma conta corrente para esta unidade e programa na consulta atual. Isso não prova inexistência de conta bancária.</ContextNote></div>}
    {!basicAccount && financial.accounts.length > 0 && <div className="unit-inline-attention"><ShieldAlert size={15} /><span>Não há uma conta com rótulo bancário exatamente “PDDE” para o vínculo do PDDE Básico.</span></div>}
  </section>;
}

function MovementsSection({ movements }: { movements: SigefMovementDossierLine[] }) {
  return <section className="unit-section unit-movements">
    <div className="unit-section-heading"><span>MOVIMENTAÇÕES COMPLEMENTARES</span><h2>Eventos bancários preservados</h2><p>Esta área só aparece quando há evidência SIGEF preservada para a unidade. Movimento não é automaticamente saldo, despesa ou repasse confirmado.</p></div>
    {movements.length ? <div className="unit-movement-list">{movements.map(movement => <article className="unit-movement-row" key={`${movement.date}-${movement.document}`}><time>{movement.date}</time><div><strong>{movement.historic}</strong><small>{movement.beneficiaryName || "Beneficiário não informado"}{movement.document ? ` · documento ${movement.document}` : ""}</small></div><b className={movement.credit > 0 ? "unit-credit" : "unit-debit"}>{movement.credit > 0 ? "+" : "−"}{formatMoney(movement.credit > 0 ? movement.credit : movement.debit)}</b></article>)}</div> : <div className="unit-empty"><FileSearch size={17} /><div><strong>Nenhuma movimentação complementar exibida.</strong><span>A ausência de evidência SIGEF não representa ausência de crédito bancário.</span></div></div>}
  </section>;
}

function TechnicalDetails({ dossier, runId, onOpenArtifact }: { dossier: Dossier; runId: string; onOpenArtifact: (runId: string, artifactId: number) => void }) {
  const [query, setQuery] = useState("");
  const observations = useMemo(() => dossier.observations.filter(observation => [observation.fieldPath, observation.logicalKey, observation.rawValue ?? "", observation.evidenceSnippet ?? ""].some(value => value.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))), [dossier.observations, query]);
  return <details className="unit-technical-details"><summary><FileSearch size={17} /><span><strong>Rastreabilidade e evidências</strong><small>Abra somente quando precisar consultar origem, regra ou arquivo preservado.</small></span><span className="unit-open-label">Abrir detalhes</span></summary><div className="unit-technical-content">
    <div className="unit-technical-events"><h3>Eventos da consulta</h3>{dossier.events.length ? dossier.events.map(event => <article key={event.id}><time>{displayDateTime(event.occurredAt)}</time><strong>{event.type}</strong><p>{event.message}</p></article>) : <p>Sem eventos registrados.</p>}</div>
    <div className="unit-technical-observations"><h3>Campos preservados</h3><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar campo ou evidência" aria-label="Buscar campo ou evidência" />{observations.map(observation => <article key={observation.id}><header><strong>{observation.fieldPath}</strong><StatePill state={observation.state} /></header><p><b>Valor:</b> {observation.rawValue ?? String(observation.normalizedValueJson?.value ?? "—")}</p><p><b>Fonte:</b> {observation.source} · {displayDateTime(observation.consultedAt)}</p><p><b>Trecho:</b> {observation.evidenceSnippet ?? "não disponível"}</p><p><b>Explicação:</b> {evidenceStateExplanation(observation.state)}</p><div className="unit-artifact-actions">{dossier.artifacts.filter(artifact => artifact.storageKey === observation.rawHtmlKey || artifact.storageKey === observation.normalizedJsonKey).map(artifact => <button key={artifact.id} type="button" onClick={() => onOpenArtifact(runId, artifact.id)}><ExternalLink size={13} /> Abrir evidência {artifact.contentType}</button>)}</div></article>)}</div>
  </div></details>;
}

export default function Unit() {
  const { isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, params] = useRoute("/unidade/:runId/:inep");
  const [, navigate] = useLocation();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const runId = params?.runId ?? "";
  const inep = params?.inep ?? "";

  useEffect(() => {
    if (!isAuthenticated || !runId || !inep) return;
    setLoading(true); setError(null);
    fetch(`/api/pdde/audit/run/${encodeURIComponent(runId)}/school/${encodeURIComponent(inep)}`)
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Não foi possível carregar o dossiê da unidade.")))
      .then(payload => setDossier(payload as Dossier))
      .catch(cause => setError(cause instanceof Error ? cause.message : "Falha ao carregar a unidade."))
      .finally(() => setLoading(false));
  }, [inep, isAuthenticated, runId]);

  const financial = useMemo(() => dossier ? buildFinancialSchoolDossier(dossier.observations) : null, [dossier]);
  const movements = useMemo(() => dossier ? buildSigefMovementDossier(dossier.observations) : [], [dossier]);
  const findings = dossier?.findings ?? [];
  const schoolName = financial?.schoolName ?? dossier?.consultation?.schoolName ?? "Unidade escolar";
  const openArtifact = async (artifactRunId: string, artifactId: number) => {
    const response = await fetch(`/api/pdde/audit/run/${encodeURIComponent(artifactRunId)}/artifact/${artifactId}`);
    if (!response.ok) return;
    const payload = await response.json() as { artifact: { url: string } };
    window.open(payload.artifact.url, "_blank", "noopener,noreferrer");
  };

  if (authLoading || loading) return <div className="unit-loading"><RefreshCw className="animate-spin" size={20} /> Carregando dossiê financeiro da unidade…</div>;
  if (error || !dossier || !financial) return <div className="unit-loading unit-loading-error"><ShieldAlert size={20} /><div><strong>{error ?? "Dossiê não encontrado."}</strong><button type="button" onClick={() => navigate(`/auditoria?run=${encodeURIComponent(runId)}`)}>Voltar para auditoria</button></div></div>;

  return <div className="unit-page">
    <header className="unit-topbar"><Link href={`/auditoria?run=${encodeURIComponent(runId)}`} className="unit-back"><ArrowLeft size={16} /> Auditoria das escolas</Link><div className="unit-topbar-meta"><HighContrastToggle /><span>PDDEINFO · EXERCÍCIO 2026</span></div></header>
    <main className="unit-main">
      <header className="unit-identity"><span className="unit-kicker">UNIDADE ESCOLAR · DOSSIÊ FINANCEIRO</span><h1>{schoolName}</h1><p>SME {dossier.consultation?.sme ?? "—"} · INEP {inep}{financial.uex ? ` · ${financial.uex}` : ""}</p><small>Referência consultada em {displayDateTime(dossier.consultation?.consultedAt)} · fonte principal PDDEInfo</small></header>
      <PrimaryPosition dossier={dossier} financial={financial} />
      {findings.length > 0 && <section className="unit-attention"><div><span>ACOMPANHAMENTO</span><h2>Há {findings.length} ponto(s) que merecem leitura</h2><p>O sistema apresenta a condição observada sem transformar automaticamente a evidência em acusação ou conclusão.</p></div><div className="unit-attention-list">{findings.slice(0, 4).map(finding => <article key={finding.id}><ShieldAlert size={15} /><span>{finding.message}</span></article>)}</div></section>}
      <ProgramsSection financial={financial} />
      <TimelineSection financial={financial} movements={movements} />
      <AccountsSection financial={financial} />
      <MovementsSection movements={movements} />
      <TechnicalDetails dossier={dossier} runId={runId} onOpenArtifact={(artifactRunId, artifactId) => void openArtifact(artifactRunId, artifactId)} />
    </main>
  </div>;
}
