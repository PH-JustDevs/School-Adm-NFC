import { notFound } from "next/navigation";
import { updatePersonAction } from "@/app/actions/people";
import { DeleteButton } from "@/components/DeleteButton";
import { PersonForm } from "@/components/PersonForm";
import { prisma } from "@/lib/db";
import { TYPE_LABEL, type PersonType } from "@/lib/person";

export const dynamic = "force-dynamic";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await prisma.person.findUnique({ where: { id } });
  if (!person) notFound();

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>{person.name}</h1>
        <span className="badge">{TYPE_LABEL[person.type as PersonType]}</span>
      </div>

      <div className="grid" style={{ alignItems: "start" }}>
        <div>
          <PersonForm
            action={updatePersonAction.bind(null, id)}
            submitLabel="Salvar alterações"
            values={{
              type: person.type,
              name: person.name,
              code: person.code,
              classGroup: person.classGroup,
              guardian: person.guardian,
              phone: person.phone,
              email: person.email,
              notes: person.notes,
              active: person.active,
            }}
          />
          <div className="card row" style={{ justifyContent: "space-between" }}>
            <a className="btn secondary" href={`/api/person/${id}/ficha`}>Baixar ficha (PDF)</a>
            <DeleteButton id={id} name={person.name} />
          </div>
        </div>

        <div className="card" style={{ textAlign: "center" }}>
          <h2>QR Code do cadastro</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/person/${id}/qr`} alt={`QR Code de ${person.name}`} width={240} height={240} />
          <p className="muted">
            Ao escanear, o administrador precisa estar logado e cai direto neste cadastro.
          </p>
          <a className="btn secondary" href={`/api/person/${id}/qr`} download={`qr-${person.code ?? id}.png`}>
            Baixar QR (PNG)
          </a>
        </div>
      </div>
    </>
  );
}
