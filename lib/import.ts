import * as XLSX from "xlsx";
import { parsePersonType, personInputSchema, type PersonInput } from "@/lib/person";

export type ImportError = { line: number; message: string };

export type ImportResult = {
  rows: PersonInput[];
  errors: ImportError[];
  // Se falso, a planilha não traz a coluna "Ativo": a reimportação não deve mexer nessa situação.
  hasActiveColumn: boolean;
  fatal?: string;
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 5000;

// Campo canônico -> nomes aceitos no cabeçalho (já normalizados: sem acento, minúsculos, só letras/números).
const HEADER_ALIASES: Record<string, string[]> = {
  name: ["nome", "name", "aluno", "funcionario", "nomecompleto"],
  type: ["tipo", "type", "categoria", "papel"],
  code: ["matricula", "matricularegistro", "codigo", "registro", "code", "registrofuncional", "rf"],
  classGroup: ["turma", "turmasetor", "setor", "classe", "departamento"],
  guardian: ["responsavel", "guardian", "responsavelnome"],
  phone: ["telefone", "celular", "phone", "contato", "fone"],
  email: ["email", "eletronico", "mail"],
  notes: ["observacoes", "observacao", "obs", "notes", "notas"],
  active: ["ativo", "active", "situacao", "status"],
};

const INACTIVE_WORDS = ["nao", "0", "false", "inativo", "inactive"];
const REQUIRED_FIELDS = ["name", "type"] as const;

export function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function mapHeaders(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {}; // campo canônico -> cabeçalho original
  for (const original of headers) {
    const norm = normalizeHeader(original);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (!map[field] && aliases.includes(norm)) map[field] = original;
    }
  }
  return map;
}

/** Em CSV, escolhe o separador mais frequente na primeira linha (Excel pt-BR usa ";"). */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const counts = [";", ",", "\t"].map((d) => [d, firstLine.split(d).length - 1] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

function readWorkbook(bytes: Uint8Array, filename: string): XLSX.WorkBook {
  if (filename.toLowerCase().endsWith(".csv")) {
    let text = new TextDecoder("utf-8").decode(bytes);
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM
    return XLSX.read(text, { type: "string", FS: detectDelimiter(text) });
  }
  return XLSX.read(bytes, { type: "array" });
}

/**
 * Lê um CSV ou XLSX e devolve as linhas já validadas, sem gravar nada no banco.
 * Linhas com erro são listadas com o número da linha no arquivo, para correção.
 */
export function parseImportFile(bytes: Uint8Array, filename: string): ImportResult {
  if (bytes.byteLength === 0) return { rows: [], errors: [], hasActiveColumn: false, fatal: "Arquivo vazio." };
  if (bytes.byteLength > MAX_BYTES) return { rows: [], errors: [], hasActiveColumn: false, fatal: "Arquivo maior que 5 MB." };

  let sheetRows: Record<string, unknown>[];
  let headers: string[];
  try {
    const wb = readWorkbook(bytes, filename);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return { rows: [], errors: [], hasActiveColumn: false, fatal: "Nenhuma planilha encontrada no arquivo." };
    sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
    headers = sheetRows.length > 0 ? Object.keys(sheetRows[0]) : [];
  } catch {
    return { rows: [], errors: [], hasActiveColumn: false, fatal: "Não foi possível ler o arquivo. Verifique se é CSV ou XLSX válido." };
  }

  if (sheetRows.length === 0) return { rows: [], errors: [], hasActiveColumn: false, fatal: "O arquivo não tem linhas de dados." };
  if (sheetRows.length > MAX_ROWS) return { rows: [], errors: [], hasActiveColumn: false, fatal: `Máximo de ${MAX_ROWS} linhas por importação.` };

  const colMap = mapHeaders(headers);
  const missing = REQUIRED_FIELDS.filter((f) => !colMap[f]);
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [],
      hasActiveColumn: false,
      fatal: `Colunas obrigatórias não encontradas: ${missing.map((f) => (f === "name" ? "nome" : "tipo")).join(", ")}.`,
    };
  }

  const rows: PersonInput[] = [];
  const errors: ImportError[] = [];
  const seenCodes = new Map<string, number>();

  sheetRows.forEach((raw, index) => {
    const line = index + 2; // cabeçalho é a linha 1
    const get = (field: string) => String(raw[colMap[field] ?? ""] ?? "").trim();

    // Ignora linhas totalmente vazias (comum no fim de planilhas).
    if (Object.values(raw).every((v) => String(v ?? "").trim() === "")) return;

    const type = parsePersonType(get("type"));
    if (!type) {
      errors.push({ line, message: `Tipo "${get("type")}" inválido (use Aluno ou Funcionário).` });
      return;
    }

    // Coluna "Ativo" é opcional: vazia ou qualquer valor que não seja "não/inativo" conta como ativo.
    const activeRaw = normalizeHeader(get("active"));
    const active = colMap.active ? !INACTIVE_WORDS.includes(activeRaw) : true;

    const parsed = personInputSchema.safeParse({
      type,
      name: get("name"),
      code: get("code"),
      classGroup: get("classGroup"),
      guardian: get("guardian"),
      phone: get("phone"),
      email: get("email"),
      notes: get("notes"),
      active,
    });
    if (!parsed.success) {
      errors.push({ line, message: parsed.error.issues.map((i) => i.message).join(" ") });
      return;
    }

    const code = parsed.data.code;
    if (code) {
      const firstLine = seenCodes.get(code);
      if (firstLine !== undefined) {
        errors.push({ line, message: `Código ${code} repetido no arquivo (também na linha ${firstLine}).` });
        return;
      }
      seenCodes.set(code, line);
    }

    rows.push(parsed.data);
  });

  return { rows, errors, hasActiveColumn: Boolean(colMap.active) };
}
