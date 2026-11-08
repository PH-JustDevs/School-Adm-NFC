"use client";

import { useActionState } from "react";
import { importPeopleAction, type ImportState } from "@/app/actions/people";
import { TYPE_LABEL, type PersonType } from "@/lib/person";

const initial: ImportState = {};

export function ImportForm() {
  const [state, formAction, pending] = useActionState(importPeopleAction, initial);

  return (
    <>
      <form action={formAction} className="card">
        <p className="muted" style={{ marginTop: 0 }}>
          Colunas: <strong>nome</strong> e <strong>tipo</strong> (obrigatórias); opcionais: <strong>matrícula</strong>,
          <strong> turma</strong>, <strong>responsável</strong>, <strong>telefone</strong>, <strong>e-mail</strong>,
          <strong> observações</strong>. Tipo: “Aluno” ou “Funcionário”. Se a matrícula já existir, o cadastro é atualizado.
        </p>
        <div className="field" style={{ marginBottom: "0.9rem" }}>
          <label htmlFor="file">Arquivo (.csv ou .xlsx, até 5 MB)</label>
          <input id="file" name="file" type="file" accept=".csv,.xlsx" required />
        </div>
        <label className="row" style={{ gap: "0.5rem", color: "inherit", fontWeight: 400, marginBottom: "1rem" }}>
          <input type="checkbox" name="dryRun" defaultChecked /> Apenas validar (não grava nada)
        </label>
        {state.error && <p className="error">{state.error}</p>}
        <button type="submit" disabled={pending}>{pending ? "Processando…" : "Enviar"}</button>
      </form>

      {state.preview && (
        <div className="card">
          <h2>Prévia</h2>
          <p>
            {state.preview.valid} de {state.preview.total} linha(s) válidas.
            {state.preview.errors.length > 0 && " Corrija as linhas abaixo e envie novamente."}
          </p>
          {state.preview.errors.length > 0 && (
            <ErrorList errors={state.preview.errors} />
          )}
          {state.preview.sample.length > 0 && (
            <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
              <table>
                <thead>
                  <tr><th>Tipo</th><th>Nome</th><th>Matrícula</th><th>Turma/Setor</th></tr>
                </thead>
                <tbody>
                  {state.preview.sample.map((r, i) => (
                    <tr key={i}>
                      <td>{TYPE_LABEL[r.type as PersonType]}</td>
                      <td>{r.name}</td>
                      <td>{r.code ?? "—"}</td>
                      <td>{r.classGroup ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {state.preview.valid > 20 && <p className="muted">Mostrando as primeiras 20 linhas.</p>}
          <p className="muted">Para gravar, desmarque “Apenas validar” e envie o mesmo arquivo.</p>
        </div>
      )}

      {state.result && (
        <div className="card">
          <h2>Importação concluída</h2>
          <p className="ok">
            {state.result.created} criado(s), {state.result.updated} atualizado(s).
          </p>
          {state.result.errors.length > 0 && (
            <>
              <p className="error">{state.result.errors.length} linha(s) ignorada(s):</p>
              <ErrorList errors={state.result.errors} />
            </>
          )}
        </div>
      )}
    </>
  );
}

function ErrorList({ errors }: { errors: { line: number; message: string }[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
      {errors.slice(0, 100).map((e, i) => (
        <li key={i}>Linha {e.line}: {e.message}</li>
      ))}
      {errors.length > 100 && <li>… e mais {errors.length - 100} erro(s).</li>}
    </ul>
  );
}
