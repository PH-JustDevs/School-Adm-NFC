"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseImportFile, type ImportError } from "@/lib/import";
import { personFromFormData, type PersonInput } from "@/lib/person";

export type PersonState = { error?: string };

const DUPLICATE_CODE = "Já existe um cadastro com essa matrícula/registro.";

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function createPersonAction(_prev: PersonState, form: FormData): Promise<PersonState> {
  await requireAdmin();
  const parsed = personFromFormData(form);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let id: string;
  try {
    const person = await prisma.person.create({ data: parsed.data });
    id = person.id;
  } catch (err) {
    if (isUniqueViolation(err)) return { error: DUPLICATE_CODE };
    throw err;
  }
  revalidatePath("/dashboard");
  redirect(`/dashboard/${id}`);
}

export async function updatePersonAction(id: string, _prev: PersonState, form: FormData): Promise<PersonState> {
  await requireAdmin();
  const parsed = personFromFormData(form);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const { count } = await prisma.person.updateMany({ where: { id }, data: parsed.data });
    if (count === 0) return { error: "Cadastro não encontrado. Ele pode ter sido excluído." };
  } catch (err) {
    if (isUniqueViolation(err)) return { error: DUPLICATE_CODE };
    throw err;
  }
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${id}`);
  return {};
}

export async function deletePersonAction(id: string) {
  await requireAdmin();
  await prisma.person.deleteMany({ where: { id } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export type ImportState = {
  error?: string;
  // Só no modo "apenas validar":
  preview?: { total: number; valid: number; errors: ImportError[]; sample: PersonInput[] };
  // Só após gravar:
  result?: { created: number; updated: number; errors: ImportError[] };
};

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function importPeopleAction(_prev: ImportState, form: FormData): Promise<ImportState> {
  await requireAdmin();

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo CSV ou XLSX." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Arquivo maior que 5 MB." };
  if (!/\.(csv|xlsx)$/i.test(file.name)) return { error: "Formato não suportado. Use .csv ou .xlsx." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const parsed = parseImportFile(bytes, file.name);
  if (parsed.fatal) return { error: parsed.fatal };

  if (form.get("dryRun") === "on") {
    return {
      preview: {
        total: parsed.rows.length + parsed.errors.length,
        valid: parsed.rows.length,
        errors: parsed.errors,
        sample: parsed.rows.slice(0, 20),
      },
    };
  }

  if (parsed.rows.length === 0) {
    return { error: "Nenhuma linha válida para importar.", result: { created: 0, updated: 0, errors: parsed.errors } };
  }

  // Tudo ou nada: se uma gravação falhar, nenhuma linha da planilha fica pela metade.
  // Poucas idas ao banco: uma busca dos códigos existentes, um createMany e updates só para os que já existem.
  const codes = parsed.rows.map((r) => r.code).filter((c): c is string => Boolean(c));
  const toUpdate = parsed.rows.filter((r): r is PersonInput & { code: string } => Boolean(r.code));
  let created = 0;
  let updated = 0;

  await prisma.$transaction(
    async (tx) => {
      const existing = codes.length
        ? await tx.person.findMany({ where: { code: { in: codes } }, select: { code: true } })
        : [];
      const existingCodes = new Set(existing.map((e) => e.code));

      const newRows = parsed.rows.filter((r) => !r.code || !existingCodes.has(r.code));
      const updateRows = toUpdate.filter((r) => existingCodes.has(r.code));

      if (newRows.length > 0) {
        const res = await tx.person.createMany({ data: newRows });
        created = res.count;
      }
      for (const row of updateRows) {
        // Sem coluna "Ativo" na planilha, não altera a situação atual do cadastro.
        const { active, ...rest } = row;
        await tx.person.update({ where: { code: row.code }, data: parsed.hasActiveColumn ? row : rest });
      }
      updated = updateRows.length;
    },
    { timeout: 60_000, maxWait: 10_000 },
  );

  revalidatePath("/dashboard");
  return { result: { created, updated, errors: parsed.errors } };
}
