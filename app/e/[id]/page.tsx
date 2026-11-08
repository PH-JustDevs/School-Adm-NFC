import { redirect } from "next/navigation";

// Destino do QR Code. O middleware já exige login de administrador antes de chegar aqui.
export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/${encodeURIComponent(id)}`);
}
