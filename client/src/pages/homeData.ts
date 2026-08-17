export function isHomeJsonResponse(ok: boolean, contentType: string | null): boolean {
  return ok && Boolean(contentType?.includes("application/json"));
}
