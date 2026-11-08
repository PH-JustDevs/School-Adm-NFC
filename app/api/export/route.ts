import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listToPdf, toCsv, toXlsx } from "@/lib/export";
import { PERSON_TYPES, type PersonType } from "@/lib/person";

export const runtime = "nodejs";

const FORMATS = ["csv", "xlsx", "pdf"] as const;
const TITLES: Record<string, string> = {
  todos: "Cadastro geral",
  ALUNO: "Alunos",
  FUNCIONARIO: "Funcionários",
};

// GET /api/export?format=csv|xlsx|pdf&type=todos|ALUNO|FUNCIONARIO
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const format = req.nextUrl.searchParams.get("format") ?? "";
  const type = req.nextUrl.searchParams.get("type") ?? "todos";
  if (!(FORMATS as readonly string[]).includes(format)) {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }
  if (type !== "todos" && !(PERSON_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  }

  const people = await prisma.person.findMany({
    where: type === "todos" ? {} : { type: type as PersonType },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const base = `cadastro-${type.toLowerCase()}-${stamp}`;

  if (format === "csv") {
    return file(toCsv(people), "text/csv; charset=utf-8", `${base}.csv`);
  }
  if (format === "xlsx") {
    return file(
      toXlsx(people),
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      `${base}.xlsx`,
    );
  }
  return file(await listToPdf(people, TITLES[type]), "application/pdf", `${base}.pdf`);
}

function file(body: Buffer, contentType: string, filename: string) {
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
