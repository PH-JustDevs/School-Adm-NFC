/**
 * URL gravada no QR Code. Usa APP_URL quando definido (produção), senão a origem da requisição.
 * O QR só abre o cadastro depois de login de administrador (ver middleware.ts).
 */
export function personUrl(id: string, fallbackOrigin: string): string {
  const base = (process.env.APP_URL || fallbackOrigin).replace(/\/+$/, "");
  return `${base}/e/${encodeURIComponent(id)}`;
}
