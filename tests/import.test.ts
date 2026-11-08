import { describe, expect, it } from "vitest";
import type { Person } from "@prisma/client";
import { parseImportFile } from "@/lib/import";
import { toCsv, toXlsx } from "@/lib/export";
import { parsePersonType } from "@/lib/person";

const enc = (s: string) => new TextEncoder().encode(s);

describe("parsePersonType", () => {
  it("aceita variações com e sem acento", () => {
    expect(parsePersonType("Aluno")).toBe("ALUNO");
    expect(parsePersonType("  alunos ")).toBe("ALUNO");
    expect(parsePersonType("Funcionário")).toBe("FUNCIONARIO");
    expect(parsePersonType("funcionario")).toBe("FUNCIONARIO");
    expect(parsePersonType("professor")).toBeNull();
  });
});

describe("parseImportFile (CSV)", () => {
  it("usa ';' como separador, reconhece cabeçalhos com acento e reporta erros por linha", () => {
    const csv = [
      "Nome;Tipo;Matrícula;Turma;Responsável;Telefone",
      "Ana Souza;Aluno;2024001;5A;Maria Souza;11999990000",
      "Carlos Lima;Funcionário;RF-77;;;",
      ";Aluno;2024003;5A;;",
      "Bia Costa;Professor;;;;",
      "Duda Reis;Aluno;2024001;6B;;",
      ";;;;;",
    ].join("\r\n");

    const result = parseImportFile(enc("﻿" + csv), "alunos.csv");

    expect(result.fatal).toBeUndefined();
    expect(result.rows.map((r) => r.name)).toEqual(["Ana Souza", "Carlos Lima"]);
    expect(result.rows[0]).toMatchObject({ type: "ALUNO", code: "2024001", classGroup: "5A", guardian: "Maria Souza" });
    expect(result.rows[1]).toMatchObject({ type: "FUNCIONARIO", code: "RF-77", guardian: null });

    expect(result.errors).toEqual([
      { line: 4, message: expect.stringContaining("Nome muito curto") },
      { line: 5, message: expect.stringContaining("Tipo \"Professor\" inválido") },
      { line: 6, message: expect.stringContaining("Código 2024001 repetido") },
    ]);
  });

  it("recusa arquivo sem as colunas obrigatórias", () => {
    const result = parseImportFile(enc("Turma;Telefone\n5A;111"), "x.csv");
    expect(result.fatal).toContain("nome");
  });

  it("recusa arquivo vazio", () => {
    expect(parseImportFile(new Uint8Array(0), "x.csv").fatal).toBe("Arquivo vazio.");
  });
});

describe("round-trip exportação -> importação", () => {
  const people: Person[] = [
    {
      id: "1", type: "ALUNO", name: "Ana Souza", code: "2024001", classGroup: "5A",
      guardian: "Maria, mãe \"Souza\"", phone: "11999990000", email: null,
      notes: "Alergia a amendoim", active: true, createdAt: new Date(), updatedAt: new Date(),
    },
    {
      id: "2", type: "FUNCIONARIO", name: "Carlos Lima", code: null, classGroup: "Secretaria",
      guardian: null, phone: null, email: "carlos@escola.exemplo", notes: null,
      active: false, createdAt: new Date(), updatedAt: new Date(),
    },
  ];

  it("CSV exportado volta com os mesmos dados", () => {
    const back = parseImportFile(new Uint8Array(toCsv(people)), "export.csv");
    expect(back.errors).toEqual([]);
    expect(back.rows).toHaveLength(2);
    expect(back.rows[0]).toMatchObject({
      type: "ALUNO", name: "Ana Souza", code: "2024001", guardian: 'Maria, mãe "Souza"', notes: "Alergia a amendoim",
    });
    expect(back.rows[1]).toMatchObject({
      type: "FUNCIONARIO", name: "Carlos Lima", code: null, email: "carlos@escola.exemplo", active: false,
    });
  });

  it("XLSX exportado volta com os mesmos dados", () => {
    const back = parseImportFile(new Uint8Array(toXlsx(people)), "export.xlsx");
    expect(back.errors).toEqual([]);
    expect(back.rows.map((r) => r.name)).toEqual(["Ana Souza", "Carlos Lima"]);
    expect(back.rows[0].code).toBe("2024001");
  });
});
