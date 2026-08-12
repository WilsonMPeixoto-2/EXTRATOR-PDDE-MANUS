import { appendFile } from "node:fs/promises";
import { runExtraction } from "../server/pdde/run.ts";

const logPath = "/home/ubuntu/extrator-pdde-4cre/.pddeinfo-run.log";
const write = async message => {
  const line = `${new Date().toISOString()} ${message}`;
  console.log(line);
  await appendFile(logPath, `${line}\n`, "utf8");
};

await write("Início da coleta PDDEInfo das 163 escolas da 4ª CRE.");

try {
  const run = await runExtraction(async event => {
    if (event.type === "ready") await write(`Execução ${event.runId} preparada para ${event.total} unidades.`);
    if (event.type === "progress") await write(`${event.completed}/${event.total} | lote ${event.batch} | ${event.message}`);
    if (event.type === "complete") await write(`Execução concluída: ${event.completed} registros; ${event.errors} falhas; Excel: ${event.downloadUrl ?? "bloqueado pelas validações"}.`);
    if (event.type === "fatal") await write(`Falha fatal: ${event.message}`);
  });
  await write(`Resumo persistido: runId=${run.id}; status=${run.status}; registros=${run.records.length}; consultas=${run.audits.length}.`);
  if (run.status !== "COMPLETE") process.exitCode = 2;
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  await write(`Erro não tratado: ${message}`);
  process.exitCode = 1;
}
