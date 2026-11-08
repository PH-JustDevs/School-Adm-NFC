import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";
import type { Person } from "@prisma/client";
import { TYPE_LABEL, type PersonType } from "@/lib/person";

/** Colunas exportadas, na ordem em que aparecem em CSV, XLSX e PDF. */
const COLUMNS: { header: string; value: (p: Person) => string }[] = [
  { header: "Tipo", value: (p) => TYPE_LABEL[p.type as PersonType] },
  { header: "Nome", value: (p) => p.name },
  { header: "Matrícula/Registro", value: (p) => p.code ?? "" },
  { header: "Turma/Setor", value: (p) => p.classGroup ?? "" },
  { header: "Responsável", value: (p) => p.guardian ?? "" },
  { header: "Telefone", value: (p) => p.phone ?? "" },
  { header: "E-mail", value: (p) => p.email ?? "" },
  { header: "Observações", value: (p) => p.notes ?? "" },
  { header: "Ativo", value: (p) => (p.active ? "Sim" : "Não") },
];

function cell(value: string): string {
  // Aspas em tudo; fórmulas são neutralizadas contra injeção no Excel/Sheets.
  // "+" e "-" seguidos de dígito (ex.: telefone +5511…) ficam como estão.
  const safe = /^[=@\t\r]|^[+-](?!\d)/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** CSV com separador ";" e BOM UTF-8: o Excel em português abre sem ajustes. */
export function toCsv(people: Person[]): Buffer {
  const header = COLUMNS.map((c) => cell(c.header)).join(";");
  const lines = people.map((p) => COLUMNS.map((c) => cell(c.value(p))).join(";"));
  return Buffer.from("﻿" + [header, ...lines].join("\r\n"), "utf-8");
}

export function toXlsx(people: Person[]): Buffer {
  const data = people.map((p) => Object.fromEntries(COLUMNS.map((c) => [c.header, c.value(p)])));
  const sheet = XLSX.utils.json_to_sheet(data, { header: COLUMNS.map((c) => c.header) });
  sheet["!cols"] = COLUMNS.map((c) => ({ wch: Math.max(c.header.length, 16) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Cadastro");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

function pdfToBuffer(
  build: (doc: PDFKit.PDFDocument) => void,
  layout: "portrait" | "landscape" = "portrait",
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout, margin: 40, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    build(doc);
    doc.end();
  });
}

/** Lista em PDF (paisagem), com cabeçalho repetido em cada página. */
export function listToPdf(people: Person[], title: string): Promise<Buffer> {
  return pdfToBuffer((doc) => {
    const widths = [60, 150, 90, 90, 130, 90, 0]; // última coluna ocupa o restante
    const headers = ["Tipo", "Nome", "Matrícula", "Turma/Setor", "Responsável", "Telefone", "Observações"];
    const values = (p: Person) => [
      TYPE_LABEL[p.type as PersonType],
      p.name,
      p.code ?? "",
      p.classGroup ?? "",
      p.guardian ?? "",
      p.phone ?? "",
      p.notes ?? "",
    ];
    const pageWidth = doc.page.width - 80;
    const fixed = widths.slice(0, -1).reduce((a, b) => a + b, 0);
    if (fixed > pageWidth) throw new Error("Colunas do PDF maiores que a página.");
    widths[widths.length - 1] = pageWidth - fixed;

    const drawRow = (cells: string[], bold: boolean) => {
      const rowHeight = 16;
      if (doc.y + rowHeight > doc.page.height - 50) {
        doc.addPage();
        drawRow(headers, true);
      }
      const y = doc.y;
      let x = 40;
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8);
      cells.forEach((text, i) => {
        doc.text(text, x + 2, y + 4, { width: widths[i] - 4, height: rowHeight - 4, ellipsis: true, lineBreak: false });
        x += widths[i];
      });
      doc.moveTo(40, y + rowHeight).lineTo(40 + pageWidth, y + rowHeight).lineWidth(0.3).stroke("#999");
      doc.y = y + rowHeight;
    };

    doc.font("Helvetica-Bold").fontSize(14).text(title);
    doc.font("Helvetica").fontSize(9).text(`Gerado em ${new Date().toLocaleString("pt-BR")} · ${people.length} registro(s)`);
    doc.moveDown(0.8);
    drawRow(headers, true);
    people.forEach((p) => drawRow(values(p), false));
  }, "landscape");
}

/** Ficha individual em PDF, para impressão ou arquivo. */
export function fichaToPdf(p: Person): Promise<Buffer> {
  return pdfToBuffer((doc) => {
    doc.font("Helvetica-Bold").fontSize(16).text("Ficha cadastral");
    doc.font("Helvetica").fontSize(9).text(`Gerada em ${new Date().toLocaleString("pt-BR")}`);
    doc.moveDown(1);
    const fields: [string, string][] = [
      ["Tipo", TYPE_LABEL[p.type as PersonType]],
      ["Nome", p.name],
      ["Matrícula/Registro", p.code ?? "—"],
      ["Turma/Setor", p.classGroup ?? "—"],
      ["Responsável", p.guardian ?? "—"],
      ["Telefone", p.phone ?? "—"],
      ["E-mail", p.email ?? "—"],
      ["Situação", p.active ? "Ativo" : "Inativo"],
      ["Observações", p.notes ?? "—"],
    ];
    for (const [label, value] of fields) {
      doc.font("Helvetica-Bold").fontSize(10).text(label, { continued: false });
      doc.font("Helvetica").fontSize(11).text(value, { indent: 12 });
      doc.moveDown(0.5);
    }
  });
}
