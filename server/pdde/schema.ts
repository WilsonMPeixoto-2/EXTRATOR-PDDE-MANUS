import { z } from "zod";

const fieldStateSchema = z.enum([
  "PAGAMENTO_INFORMADO_PDDEINFO", "OB_CORROBORADA_CREDITO_NAO_LOCALIZADO", "CREDITO_LOCALIZADO_SIGEF",
  "CREDITO_CONFIRMADO_EXTRATO_BB", "CREDITO_ESTORNADO_OU_DEVOLVIDO", "SEM_PAGAMENTO_REGISTRADO_ATE_CONSULTA",
  "DIVERGENCIA_ENTRE_FONTES", "CONSULTA_INCONCLUSIVA", "REVISAO_NECESSARIA",
]);

const fieldProvenanceSchema = z.object({
  fieldId: z.string().min(1), fieldPath: z.string().min(1), logicalKey: z.string().min(1),
  source: z.enum(["PDDEINFO", "SIGEF_LIBERACAO", "SIGEF_CONTA_CORRENTE", "SIGEF_EXTRATO", "DADOS_ABERTOS", "EXTRATO_BB"]),
  sourceUrl: z.string().url(), consultedAt: z.string().datetime({ offset: true }), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/i).nullable(),
  artifact: z.object({ rawHtmlKey: z.string().min(1), rawHtmlUrl: z.string().min(1), normalizedJsonKey: z.string().min(1), normalizedJsonUrl: z.string().min(1) }).nullable(),
  rawValue: z.string().nullable(), normalizedValue: z.union([z.string(), z.number()]).nullable(), parserVersion: z.string().min(1), extractionRule: z.string().min(1), selector: z.string().min(1),
  validationResults: z.array(z.object({ code: z.string().min(1), level: z.enum(["passed", "warning", "failed"]), message: z.string().min(1) })),
  state: fieldStateSchema.nullable(),
});

const bankAccountSchema = z.object({
  program: z.string().min(1), programSemanticKey: z.string().nullable(), programSemanticStatus: z.enum(["known", "unknown"]),
  bank: z.string(), agency: z.string().regex(/^\d{1,8}$/).or(z.literal("")), account: z.string().regex(/^(?:\d{1,24}|\d{1,23}[A-Za-z])$/).or(z.literal("")), balance: z.string(),
  provenance: z.object({ program: fieldProvenanceSchema, bank: fieldProvenanceSchema, agency: fieldProvenanceSchema, account: fieldProvenanceSchema, balance: fieldProvenanceSchema }),
});

const paymentSchema = z.object({
  destination: z.string().min(1), semanticKey: z.string().nullable(), semanticStatus: z.enum(["known", "unknown", "ambiguous"]),
  expected: z.number().finite(), paid: z.number().finite(), paidCusteio: z.number().finite().nullable(), paidCapital: z.number().finite().nullable(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  provenance: z.object({ destination: fieldProvenanceSchema, expected: fieldProvenanceSchema, paid: fieldProvenanceSchema, paidCusteio: fieldProvenanceSchema.nullable(), paidCapital: fieldProvenanceSchema.nullable(), paymentDate: fieldProvenanceSchema }),
});

export const schoolExtractionSchema = z.object({
  inep: z.string().regex(/^\d{8}$/), sme: z.string().min(1), sourceUrl: z.string().url(), consultedAt: z.string().datetime({ offset: true }),
  schoolName: z.string().min(1), uex: z.string().min(1), cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/),
  bankAccounts: z.array(bankAccountSchema), payments: z.array(paymentSchema), semanticIssues: z.array(z.string()), schemaIssues: z.array(z.string()), rawPrograms: z.array(z.string()), fieldProvenance: z.array(fieldProvenanceSchema),
});

export function schoolExtractionSchemaIssues(value: unknown): string[] {
  const result = schoolExtractionSchema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.map(issue => `${issue.path.join(".") || "registro"}: ${issue.message}`);
}
