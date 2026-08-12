/** Estados que descrevem a evidência disponível, sem equiparar ordem bancária a crédito efetivado. */
export type EvidenceSource =
  | "PDDEINFO"
  | "SIGEF_LIBERACAO"
  | "SIGEF_CONTA_CORRENTE"
  | "SIGEF_EXTRATO"
  | "DADOS_ABERTOS"
  | "EXTRATO_BB";

/** Resultado operacional da tentativa de automação de uma fonte. */
export type SourceAccessState =
  | "AUTONOMOUS_AVAILABLE"
  | "AUTONOMOUS_COMPLETED"
  | "PILOT_PENDING"
  | "CAPTCHA_REQUIRED"
  | "AUTHORIZATION_REQUIRED"
  | "SOURCE_UNAVAILABLE"
  | "SCHEMA_CHANGED";

export type FieldState =
  | "PAGAMENTO_INFORMADO_PDDEINFO"
  | "OB_CORROBORADA_CREDITO_NAO_LOCALIZADO"
  | "CREDITO_LOCALIZADO_SIGEF"
  | "CREDITO_CONFIRMADO_EXTRATO_BB"
  | "CREDITO_ESTORNADO_OU_DEVOLVIDO"
  | "SEM_PAGAMENTO_REGISTRADO_ATE_CONSULTA"
  | "DIVERGENCIA_ENTRE_FONTES"
  | "CONSULTA_INCONCLUSIVA"
  | "REVISAO_NECESSARIA";

export type FieldValidationResult = {
  code: string;
  level: "passed" | "warning" | "failed";
  message: string;
};

/** Cadeia de custódia de um campo, do trecho bruto à representação normalizada. */
export type FieldProvenance = {
  fieldId: string;
  fieldPath: string;
  logicalKey: string;
  source: EvidenceSource;
  sourceUrl: string;
  consultedAt: string;
  sourceHashSha256: string | null;
  artifact: {
    rawHtmlKey: string;
    rawHtmlUrl: string;
    normalizedJsonKey: string;
    normalizedJsonUrl: string;
  } | null;
  rawValue: string | null;
  normalizedValue: string | number | null;
  parserVersion: string;
  extractionRule: string;
  selector: string;
  validationResults: FieldValidationResult[];
  state: FieldState | null;
};

export type AuditEventType =
  | "RUN_STARTED"
  | "SOURCE_FETCHED"
  | "SOURCE_AUTOMATION_BLOCKED"
  | "SOURCE_SCHEMA_CHANGED"
  | "FIELD_PARSED"
  | "FIELD_VALIDATED"
  | "FIELD_RECONCILED"
  | "FINDING_OPENED"
  | "HUMAN_DECISION"
  | "WORKBOOK_RELEASED";

/** Evento somente de inclusão; uma correção posterior deve registrar novo evento. */
export type AuditEvent = {
  eventId: string;
  runId: string;
  occurredAt: string;
  type: AuditEventType;
  severity: "info" | "warning" | "critical";
  inep: string | null;
  fieldId: string | null;
  message: string;
  payload: Record<string, unknown>;
};

export type SourceCollectionAttempt = {
  source: EvidenceSource;
  accessState: SourceAccessState;
  sourceUrl: string;
  consultedAt: string;
  parameters: Record<string, string>;
  message: string;
  artifactKey: string | null;
  sourceHashSha256: string | null;
};

export type BankAccount = {
  program: string;
  programSemanticKey: string | null;
  programSemanticStatus: "known" | "unknown";
  bank: string;
  agency: string;
  account: string;
  balance: string;
  provenance: {
    program: FieldProvenance;
    bank: FieldProvenance;
    agency: FieldProvenance;
    account: FieldProvenance;
    balance: FieldProvenance;
  };
};

export type PaymentLine = {
  destination: string;
  semanticKey: string | null;
  semanticStatus: "known" | "unknown" | "ambiguous";
  expected: number;
  paid: number;
  paidCusteio: number | null;
  paidCapital: number | null;
  paymentDate: string | null;
  provenance: {
    destination: FieldProvenance;
    expected: FieldProvenance;
    paid: FieldProvenance;
    paidCusteio: FieldProvenance | null;
    paidCapital: FieldProvenance | null;
    paymentDate: FieldProvenance;
  };
};

export type SchoolExtraction = {
  inep: string;
  sme: string;
  sourceUrl: string;
  consultedAt: string;
  schoolName: string;
  uex: string;
  cnpj: string;
  bankAccounts: BankAccount[];
  payments: PaymentLine[];
  semanticIssues: string[];
  schemaIssues: string[];
  rawPrograms: string[];
  fieldProvenance: FieldProvenance[];
};

export type AuditStatus = "PENDING" | "SUCCESS" | "FAILED";

export type AuditRecord = {
  inep: string;
  sme: string;
  sourceUrl: string;
  consultedAt: string | null;
  status: AuditStatus;
  attempts: number;
  httpStatus: number | null;
  sourceHashSha256: string | null;
  normalizedHashSha256: string | null;
  rawHtmlKey: string | null;
  normalizedJsonKey: string | null;
  responseBytes: number | null;
  programsFound: string[];
  exception: string | null;
};

export type ValidationSummary = {
  passed: boolean;
  uniqueIneps: number;
  firstInstallmentPaid: number;
  secondInstallmentExpected: number;
  missingBasicAccounts: number;
  semanticIssues?: string[];
  fieldValidationErrors?: string[];
  schemaIssues?: string[];
  historicalFindings?: Array<{ severity: "info" | "warning" | "critical"; code: string; inep: string; logicalKey: string; previousValue: number | null; currentValue: number | null; message: string }>;
  errors: string[];
};
