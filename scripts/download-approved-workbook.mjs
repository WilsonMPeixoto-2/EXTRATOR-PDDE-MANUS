import { writeFile } from "node:fs/promises";
import { storageGetSignedUrl } from "../server/storage.ts";

const [key, destination] = process.argv.slice(2);
if (!key || !destination) throw new Error("Uso: pnpm exec tsx scripts/download-approved-workbook.mjs <storage-key> <destino.xlsx>");

const url = await storageGetSignedUrl(key);
const response = await fetch(url);
if (!response.ok) throw new Error(`Download do workbook falhou: HTTP ${response.status}`);
await writeFile(destination, Buffer.from(await response.arrayBuffer()));
console.log(JSON.stringify({ key, destination, bytes: (await import("node:fs/promises")).stat(destination).then(result => result.size) }));
