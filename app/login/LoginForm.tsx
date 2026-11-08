"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/auth";

const initial: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="card">
      <input type="hidden" name="next" value={next} />
      <div className="field" style={{ marginBottom: "0.9rem" }}>
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="field" style={{ marginBottom: "0.9rem" }}>
        <label htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error && <p className="error">{state.error}</p>}
      <button type="submit" disabled={pending} style={{ width: "100%" }}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
