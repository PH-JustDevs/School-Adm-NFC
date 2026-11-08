// Teste de integração contra um PostgreSQL real. Só roda com DATABASE_URL definida:
//   DATABASE_URL=postgresql://... npm test
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";

const hasDb = Boolean(process.env.DATABASE_URL);
const SECRET = "integracao-com-pelo-menos-32-caracteres-ok";
const COOKIE = { value: "" };

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "nfc_session" && COOKIE.value ? { value: COOKIE.value } : undefined) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  },
}));

describe.skipIf(!hasDb)("ações de cadastro contra o banco", () => {
  let prisma: typeof import("@/lib/db").prisma;
  let actions: typeof import("@/app/actions/people");
  let createSessionToken: typeof import("@/lib/session").createSessionToken;

  beforeAll(async () => {
    process.env.SESSION_SECRET = SECRET;
    ({ prisma } = await import("@/lib/db"));
    actions = await import("@/app/actions/people");
    ({ createSessionToken } = await import("@/lib/session"));
    await prisma.person.deleteMany();
    COOKIE.value = await createSessionToken("admin@escola.exemplo");
  });

  afterAll(async () => {
    await prisma.person.deleteMany();
    await prisma.$disconnect();
  });

  const personForm = (fields: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) f.set(k, v);
    return f;
  };

  it("exige sessão para qualquer ação", async () => {
    COOKIE.value = "";
    await expect(actions.createPersonAction({}, personForm({ type: "ALUNO", name: "Ninguém" }))).rejects.toThrow(
      "Não autenticado",
    );
    COOKIE.value = await createSessionToken("admin@escola.exemplo");
  });

  it("cria cadastro e redireciona para a ficha", async () => {
    const err = await actions
      .createPersonAction({}, personForm({ type: "ALUNO", name: "Ana Souza", code: "2024001", active: "on" }))
      .catch((e) => e);
    expect(err.message).toBe("NEXT_REDIRECT");
    expect(err.url).toMatch(/^\/dashboard\//);
    const saved = await prisma.person.findUnique({ where: { code: "2024001" } });
    expect(saved).toMatchObject({ name: "Ana Souza", type: "ALUNO", active: true });
  });

  it("recusa matrícula duplicada com mensagem amigável", async () => {
    const result = await actions.createPersonAction(
      {},
      personForm({ type: "ALUNO", name: "Outra Ana", code: "2024001" }),
    );
    expect(result.error).toContain("matrícula");
  });

  it("valida prévia sem gravar e importa de verdade com tudo-ou-nada", async () => {
    const csv = [
      "Nome;Tipo;Matrícula;Turma",
      "Ana Souza;Aluno;2024001;5B", // já existe -> atualiza
      "Bruno Dias;Aluno;2024002;5A", // novo
      "Carla Nunes;Funcionário;RF-9;Secretaria", // novo
      "X;Aluno;;", // nome curto -> erro
    ].join("\n");
    const file = new File([csv], "lote.csv", { type: "text/csv" });

    const preview = await actions.importPeopleAction({}, personForm({ file: file as unknown as string, dryRun: "on" }));
    expect(preview.preview).toMatchObject({ total: 4, valid: 3 });
    expect(preview.preview?.errors[0].line).toBe(5);
    expect(await prisma.person.count()).toBe(1); // prévia não grava

    const real = await actions.importPeopleAction({}, personForm({ file: file as unknown as string }));
    expect(real.result).toMatchObject({ created: 2, updated: 1 });
    expect(await prisma.person.count()).toBe(3);
    const ana = await prisma.person.findUnique({ where: { code: "2024001" } });
    expect(ana?.classGroup).toBe("5B");
  });

  it("rejeita arquivo com extensão não suportada", async () => {
    const file = new File(["abc"], "lista.txt", { type: "text/plain" });
    const res = await actions.importPeopleAction({}, personForm({ file: file as unknown as string }));
    expect(res.error).toContain("Formato não suportado");
  });

  it("reimportação sem coluna Ativo não reativa cadastro inativo; com coluna, aplica o valor", async () => {
    await prisma.person.update({ where: { code: "2024002" }, data: { active: false } });

    const semAtivo = new File(["Nome;Tipo;Matrícula\nBruno Dias;Aluno;2024002"], "a.csv");
    await actions.importPeopleAction({}, personForm({ file: semAtivo as unknown as string }));
    expect((await prisma.person.findUnique({ where: { code: "2024002" } }))?.active).toBe(false);

    const comAtivo = new File(["Nome;Tipo;Matrícula;Ativo\nBruno Dias;Aluno;2024002;Sim"], "b.csv");
    await actions.importPeopleAction({}, personForm({ file: comAtivo as unknown as string }));
    expect((await prisma.person.findUnique({ where: { code: "2024002" } }))?.active).toBe(true);
  });

  it("atualiza e exclui cadastro", async () => {
    const ana = await prisma.person.findUniqueOrThrow({ where: { code: "2024001" } });
    const upd = await actions.updatePersonAction(
      ana.id,
      {},
      personForm({ type: "ALUNO", name: "Ana Souza Lima", code: "2024001", classGroup: "6A", active: "on" }),
    );
    expect(upd.error).toBeUndefined();
    expect(await prisma.person.findUnique({ where: { id: ana.id } })).toMatchObject({ name: "Ana Souza Lima", classGroup: "6A" });

    const err = await actions.deletePersonAction(ana.id).catch((e) => e);
    expect(err.message).toBe("NEXT_REDIRECT");
    expect(await prisma.person.findUnique({ where: { id: ana.id } })).toBeNull();
  });
});
