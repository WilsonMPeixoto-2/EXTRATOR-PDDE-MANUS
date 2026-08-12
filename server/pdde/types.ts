export type EvidenceSource = "PDDEINFO" | "SIGEF_LIBERACAO" | "SIGEF_EXTRATO" | "EXTRATO_BB" | "DADOS_ABERTOS";

/** Estados que descrevem a evidência disponível, sem equiparar ordem bancária a crédito efetivado. */
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

export type BankAccount = {
  program: string;
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
  expected: number;
  paid: number;
  paymentDate: string | null;
  provenance: {
    destination: FieldProvenance;
    expected: FieldProvenance;
    paid: FieldProvenance;
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
  programsFound: string[];
  exception: string | null;
};

export type ValidationSummary = {
  passed: boolean;
  uniqueIneps: number;
  firstInstallmentPaid: number;
  secondInstallmentExpected: number;
  missingBasicAccounts: number;
  errors: string[];
};
