import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, verifySessionToken } from "@/lib/session";

/** Verifica credenciais do administrador único definido em variáveis de ambiente. */
export async function checkCredentials(email: string, password: string): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminEmail || !adminHash) {
    throw new Error("ADMIN_EMAIL e ADMIN_PASSWORD_HASH precisam estar configurados.");
  }
  const emailOk = email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
  // Compara o hash sempre, para não revelar pelo tempo de resposta se o e-mail existe.
  const passOk = await bcrypt.compare(password, adminHash);
  return emailOk && passOk;
}

/** Use em Server Components, Server Actions e Route Handlers. Lança erro se não autenticado. */
export async function requireAdmin(): Promise<void> {
  const store = await cookies();
  if (!(await verifySessionToken(store.get(SESSION_COOKIE)?.value))) {
    throw new Error("Não autenticado.");
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
