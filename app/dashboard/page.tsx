import Link from "next/link";
import { prisma } from "@/lib/db";
import { TYPE_LABEL, type PersonType } from "@/lib/person";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; type?: string }> };

export default async function DashboardPage({ searchParams }: Props) {
  const { q = "", type = "todos" } = await searchParams;
  const term = q.trim().slice(0, 100);
  const typeFilter = type === "ALUNO" || type === "FUNCIONARIO" ? (type as PersonType) : undefined;

  const people = await prisma.person.findMany({
    where: {
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { code: { contains: term, mode: "insensitive" } },
              { classGroup: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ name: "asc" }],
    take: 500,
  });

  const exportQuery = `type=${typeFilter ?? "todos"}`;

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Cadastros ({people.length}{people.length === 500 ? "+" : ""})</h1>
        <div className="row">
          <a className="btn secondary" href={`/api/export?format=xlsx&${exportQuery}`}>XLSX</a>
          <a className="btn secondary" href={`/api/export?format=csv&${exportQuery}`}>CSV</a>
          <a className="btn secondary" href={`/api/export?format=pdf&${exportQuery}`}>PDF</a>
        </div>
      </div>

      <form className="row card" method="get" style={{ marginBottom: "1rem" }}>
        <input name="q" defaultValue={term} placeholder="Buscar por nome, matrícula ou turma" style={{ flex: "2 1 260px" }} />
        <select name="type" defaultValue={typeFilter ?? "todos"} style={{ flex: "1 1 160px" }}>
          <option value="todos">Alunos e funcionários</option>
          <option value="ALUNO">Somente alunos</option>
          <option value="FUNCIONARIO">Somente funcionários</option>
        </select>
        <button type="submit" className="secondary">Filtrar</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Matrícula/Registro</th>
              <th>Turma/Setor</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {people.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">Nenhum cadastro encontrado. Crie um novo ou importe um CSV/XLSX.</td>
              </tr>
            )}
            {people.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/dashboard/${p.id}`}>{p.name}</Link></td>
                <td>{TYPE_LABEL[p.type]}</td>
                <td>{p.code ?? "—"}</td>
                <td>{p.classGroup ?? "—"}</td>
                <td>{p.active ? <span className="badge">Ativo</span> : <span className="badge off">Inativo</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
