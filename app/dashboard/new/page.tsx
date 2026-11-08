import { createPersonAction } from "@/app/actions/people";
import { PersonForm } from "@/components/PersonForm";

export default function NewPersonPage() {
  return (
    <>
      <h1>Novo cadastro</h1>
      <PersonForm action={createPersonAction} submitLabel="Criar cadastro" />
    </>
  );
}
