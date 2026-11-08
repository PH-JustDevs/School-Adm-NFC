import { beforeAll, describe, expect, it } from "vitest";
import type { Person } from "@prisma/client";
import { createSessionToken, verifySessionToken } from "@/lib/session";
import { fichaToPdf, listToPdf } from "@/lib/export";
import { personUrl } from "@/lib/url";

const person: Person = {
  id: "11111111-2222-3333-4444-555555555555", type: "ALUNO", name: "Ana Souza", code: "2024001",
  classGroup: "5A", guardian: "Maria", phone: null, email: null, notes: null, active: true,
  createdAt: new Date(), updatedAt: new Date(),
};

beforeAll(() => {
  process.env.SESSION_SECRET = "teste-com-pelo-menos-32-caracteres-aleatorios";
});

describe("sessão", () => {
  it("aceita token recém-emitido e rejeita token adulterado ou ausente", async () => {
    const token = await createSessionToken("admin@escola.exemplo");
    expect(await verifySessionToken(token)).toBe(true);
    expect(await verifySessionToken(token.slice(0, -2) + "xx")).toBe(false);
    expect(await verifySessionToken(undefined)).toBe(false);
  });

  it("rejeita token assinado com outro segredo", async () => {
    const token = await createSessionToken("admin@escola.exemplo");
    process.env.SESSION_SECRET = "outro-segredo-diferente-com-32-chars-ok";
    expect(await verifySessionToken(token)).toBe(false);
    process.env.SESSION_SECRET = "teste-com-pelo-menos-32-caracteres-aleatorios";
  });
});

describe("PDF", () => {
  it("gera PDF válido para ficha e lista", async () => {
    const ficha = await fichaToPdf(person);
    expect(ficha.subarray(0, 5).toString()).toBe("%PDF-");
    const lista = await listToPdf([person, { ...person, id: "x", name: "B" }], "Alunos");
    expect(lista.subarray(0, 5).toString()).toBe("%PDF-");
    // Lista em paisagem (A4 deitado: largura 842pt, altura 595pt).
    expect(lista.toString("latin1")).toMatch(/MediaBox\s*\[\s*0 0 841\.89 595\.28\s*\]/);
  });
});

describe("personUrl", () => {
  it("usa APP_URL sem barra final, ou a origem da requisição como reserva", () => {
    process.env.APP_URL = "https://nfc.exemplo.org/";
    expect(personUrl("abc", "http://localhost:3000")).toBe("https://nfc.exemplo.org/e/abc");
    delete process.env.APP_URL;
    expect(personUrl("abc", "http://localhost:3000")).toBe("http://localhost:3000/e/abc");
  });
});
