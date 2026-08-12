import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { parseSigefMovementText, fndeOrderEvidenceFromMovement, registerSigefMovementPilot } from "../server/pdde/sigefMovement.ts";

const [inputPath, outputPath, pdfPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error("Uso: pnpm exec tsx scripts/pilot-sigef-movement.mjs <entrada.txt> <saida.json> [pdf-autorizado]");

const input = await readFile(inputPath, "utf8");
const parsed = parseSigefMovementText(input);
const evidence = fndeOrderEvidenceFromMovement(parsed, "piloto/sigef-movimentacao-autorizada", "arquivo-autorizado-pelo-operador");
const maskCnpj = value => {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length === 14 ? `${digits.slice(0, 2)}.***.***/****-${digits.slice(-2)}` : undefined;
};
const totalsByExercise = evidence.reduce((accumulator, item) => {
  const exercise = String(item.key.exercise);
  accumulator[exercise] = (accumulator[exercise] ?? 0) + (item.amount ?? 0);
  return accumulator;
}, {});

const report = {
  inputSha256: createHash("sha256").update(input).digest("hex"),
  accountHolderCnpjMasked: maskCnpj(parsed.accountHolderCnpj),
  consultedAt: parsed.consultedAt,
  transactionCount: parsed.transactions.length,
  ignoredLines: parsed.ignoredLines,
  fndeOrderCount: evidence.length,
  totalFndeOrders: evidence.reduce((sum, item) => sum + (item.amount ?? 0), 0),
  totalsByExercise,
  reconciliationReadiness: "INCONCLUSIVA_SEM_PROGRAMA_PARCELA_E_CONTA_DESTINATARIA",
};

if (pdfPath) {
  const pdfBytes = await readFile(pdfPath);
  report.persistedPilot = await registerSigefMovementPilot({
    pdfBytes,
    fileName: "movimentacao-pdde-autorizada.pdf",
    sourceUrl: "arquivo-autorizado-pelo-operador",
    extractedText: input,
  });
}

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report));
