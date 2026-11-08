"use client";

import { useActionState } from "react";
import type { PersonState } from "@/app/actions/people";

type Values = {
  type?: string;
  name?: string;
  code?: string | null;
  classGroup?: string | null;
  guardian?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  active?: boolean;
};

type Props = {
  action: (prev: PersonState, form: FormData) => Promise<PersonState>;
  values?: Values;
  submitLabel: string;
};

const initial: PersonState = {};

export function PersonForm({ action, values = {}, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="card">
      <div className="grid">
        <div className="field">
          <label htmlFor="type">Tipo *</label>
          <select id="type" name="type" defaultValue={values.type ?? "ALUNO"} required>
            <option value="ALUNO">Aluno</option>
            <option value="FUNCIONARIO">Funcionário</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="name">Nome *</label>
          <input id="name" name="name" required maxLength={150} defaultValue={values.name ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="code">Matrícula / Registro</label>
          <input id="code" name="code" maxLength={50} defaultValue={values.code ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="classGroup">Turma / Setor</label>
          <input id="classGroup" name="classGroup" maxLength={100} defaultValue={values.classGroup ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="guardian">Responsável (alunos)</label>
          <input id="guardian" name="guardian" maxLength={150} defaultValue={values.guardian ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="phone">Telefone</label>
          <input id="phone" name="phone" maxLength={30} defaultValue={values.phone ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" defaultValue={values.email ?? ""} />
        </div>
        <div className="field full">
          <label htmlFor="notes">Observações</label>
          <textarea id="notes" name="notes" maxLength={1000} defaultValue={values.notes ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="active" className="row" style={{ gap: "0.5rem", color: "inherit" }}>
            <input id="active" name="active" type="checkbox" defaultChecked={values.active ?? true} /> Ativo
          </label>
        </div>
      </div>

      {state.error && <p className="error">{state.error}</p>}

      <div className="row" style={{ marginTop: "1rem" }}>
        <button type="submit" disabled={pending}>{pending ? "Salvando…" : submitLabel}</button>
      </div>
    </form>
  );
}
