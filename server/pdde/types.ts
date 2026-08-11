export type ProgramLabel = "PDDE" | "PDDE QUALIDADE" | "PDDE EQUIDADE" | "PDDE-EDUCAÇÃO INTEGRAL";

export type BankAccount = {
  program: string;
  bank: string;
  agency: string;
  account: string;
  balance: string;
};

export type PaymentLine = {
  destination: string;
  expected: number;
  paid: number;
  paymentDate: string | null;
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
};

export type AuditStatus = "PENDING" | "SUCCESS" | "FAILED";

export type AuditRecord = {
  inep: string;
  sme: string;
  sourceUrl: string;
  consultedAt: string | null;
  status: AuditStatus;
  attempts: number;
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
