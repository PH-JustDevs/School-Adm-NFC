import { z } from "zod";

export const PERSON_TYPES = ["ALUNO", "FUNCIONARIO"] as const;
export type PersonType = (typeof PERSON_TYPES)[number];

export const TYPE_LABEL: Record<PersonType, string> = {
  ALUNO: "Aluno",
  FUNCIONARIO: "Funcionário",
};

/** Converte texto livre (ex.: "Aluno", "funcionário") para o tipo do banco, ou null se não reconhecer. */
export function parsePersonType(raw: string): PersonType | null {
  const key = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
  if (["aluno", "alunos", "a", "student"].includes(key)) return "ALUNO";
  if (["funcionario", "funcionarios", "f", "servidor", "staff"].includes(key)) return "FUNCIONARIO";
  return null;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : null));

export const personInputSchema = z.object({
  type: z.enum(PERSON_TYPES, { errorMap: () => ({ message: "Tipo inválido." }) }),
  name: z.string().trim().min(2, "Nome muito curto.").max(150, "Nome muito longo."),
  code: optionalText(50),
  classGroup: optionalText(100),
  guardian: optionalText(150),
  phone: optionalText(30),
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  notes: optionalText(1000),
  active: z.boolean().default(true),
});

export type PersonInput = z.infer<typeof personInputSchema>;

/** Lê um formulário HTML (FormData) e valida como PersonInput. */
export function personFromFormData(form: FormData) {
  return personInputSchema.safeParse({
    type: form.get("type"),
    name: form.get("name") ?? "",
    code: form.get("code") ?? undefined,
    classGroup: form.get("classGroup") ?? undefined,
    guardian: form.get("guardian") ?? undefined,
    phone: form.get("phone") ?? undefined,
    email: form.get("email") ?? undefined,
    notes: form.get("notes") ?? undefined,
    active: form.get("active") === "on",
  });
}
