"use client";

import { deletePersonAction } from "@/app/actions/people";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const action = deletePersonAction.bind(null, id);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Excluir o cadastro de ${name}? Esta ação não pode ser desfeita.`)) e.preventDefault();
      }}
    >
      <button type="submit" className="danger">Excluir cadastro</button>
    </form>
  );
}
