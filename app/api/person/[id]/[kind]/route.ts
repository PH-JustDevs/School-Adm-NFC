import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fichaToPdf } from "@/lib/export";
import { personUrl } from "@/lib/url";

export const runtime = "nodejs";

// GET /api/person/<id>/qr      -> PNG do QR Code que aponta para o cadastro
// GET /api/person/<id>/ficha   -> PDF da ficha individual
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; kind: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id, kind } = await ctx.params;
  if (kind !== "qr" && kind !== "ficha") {
    return NextResponse.json({ error: "Recurso inválido." }, { status: 404 });
  }

  const person = await prisma.person.findUnique({ where: { id } });
  if (!person) return NextResponse.json({ error: "Cadastro não encontrado." }, { status: 404 });

  if (kind === "qr") {
    const png = await QRCode.toBuffer(personUrl(id, req.nextUrl.origin), { type: "png", width: 512, margin: 2 });
    return new NextResponse(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  }

  const pdf = await fichaToPdf(person);
  const safeName = person.name.normalize("NFD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ficha-${safeName || id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
