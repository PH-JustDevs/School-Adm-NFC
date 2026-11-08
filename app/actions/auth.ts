"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkCredentials, sessionCookieOptions } from "@/lib/auth";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";

export type LoginState = { error?: string };

/** Só aceita caminhos internos (ex.: "/dashboard"), nunca URLs externas. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const next = safeNext(form.get("next"));

  if (!email || !password) return { error: "Informe e-mail e senha." };

  let ok = false;
  try {
    ok = await checkCredentials(email, password);
  } catch (err) {
    console.error(err);
    return { error: "Configuração de administrador ausente no servidor." };
  }
  if (!ok) return { error: "E-mail ou senha incorretos." };

  const token = await createSessionToken(email.trim().toLowerCase());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
  redirect(next);
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
