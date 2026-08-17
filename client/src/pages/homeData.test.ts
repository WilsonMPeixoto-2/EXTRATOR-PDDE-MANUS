import { describe, expect, it } from "vitest";
import { isHomeJsonResponse } from "./homeData";

describe("respostas da Home", () => {
  it("aceita somente respostas HTTP bem-sucedidas em JSON", () => {
    expect(isHomeJsonResponse(true, "application/json; charset=utf-8")).toBe(true);
    expect(isHomeJsonResponse(true, "text/html; charset=utf-8")).toBe(false);
    expect(isHomeJsonResponse(false, "application/json")).toBe(false);
    expect(isHomeJsonResponse(true, null)).toBe(false);
  });
});
