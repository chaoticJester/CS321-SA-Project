import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { findPrById } from "../models/pr.model";
import { findEmployeeById } from "../models/employee.model";
import { findApprovalStepsWithSignature } from "../models/prApprovalLog.model";
import { previewApprovalSteps } from "./approval.service";
import type { ApprovalStepWithSignature } from "../types/approval";
import type { PrPdfData } from "../types/pdf";
import type { CreatePrInput, PrStatus, PrWithItems } from "../types/pr";
import { englishBahtText, thaiBahtText } from "../utils/amountInWords";
import {
  FONT,
  type Align,
  type TextStyle,
  drawLabelValue,
  drawLine,
  drawParagraph,
  lineHeight,
  measureText,
  wrapText,
} from "../utils/pdfText";

// Layout follows the team's design (PR-Overleaf/main.tex):
// page 1 = request data + item table, page 2 = approval cards (three per row).

type Doc = PDFKit.PDFDocument;

// ---------- design tokens (from main.tex) ----------

const FONT_DIR = path.resolve(__dirname, "../../assets/fonts");
const SIGNATURE_DIR = path.resolve(__dirname, "../../assets/signatures");
const MM = 72 / 25.4;
const MARGIN = 16 * MM;

const COLOR = {
  text: "#111111",
  brand: "#30446F",
  soft: "#EDF1F8",
  border: "#CBD3DF",
  muted: "#667085",
  approved: "#27724A",
  rejected: "#B42318",
};

const BODY: TextStyle = { size: 11, color: COLOR.text };
const TABLE: TextStyle = { size: 9.5, color: COLOR.text };
const CELL_PAD_X = 3;
const CELL_PAD_TOP = 3.5;
const CELL_PAD_BOTTOM = 2.5;

const CURRENCY = "THB";
const EXCHANGE_RATE = "1.00";

const STATUS_LABEL: Record<PrStatus, string> = {
  pending: "รอการอนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
};

// ---------- formatting ----------

const moneyFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const qtyFormat = new Intl.NumberFormat("en-US");
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Bangkok",
});

// "21 ก.ย. 2569 10:24" (Thai month, Buddhist year), like the design's approval cards.
const thaiDateTimeFormat = new Intl.DateTimeFormat("th-TH-u-nu-latn", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Bangkok",
});

function formatThaiDateTime(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    thaiDateTimeFormat.formatToParts(date).find((p) => p.type === type)?.value ?? "";
  return `${part("day")} ${part("month")} ${part("year")} ${part("hour")}:${part("minute")}`;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormat.format(date);
}

// Empty / missing values are printed as "-".
function show(value: string | null | undefined): string {
  return value && value.trim() ? value.trim() : "-";
}

// ---------- page helpers ----------

function contentWidth(doc: Doc): number {
  return doc.page.width - MARGIN * 2;
}

function pageBottom(doc: Doc): number {
  return doc.page.height - MARGIN;
}

// Start a new page if `height` does not fit below y. Returns the y to draw at.
function ensureSpace(doc: Doc, y: number, height: number, onNewPage?: (top: number) => number): number {
  if (y + height <= pageBottom(doc)) return y;
  doc.addPage();
  return onNewPage ? onNewPage(MARGIN) : MARGIN;
}

// "Label: value" right-aligned to the content edge (header rows).
function drawLabelValueRight(doc: Doc, label: string, value: string, y: number, style: TextStyle): void {
  const labelText = `${label}: `;
  const labelStyle = { ...style, bold: true };
  const right = MARGIN + contentWidth(doc);
  const valueWidth = measureText(doc, value, style);
  const labelWidth = measureText(doc, labelText, labelStyle);
  drawLine(doc, labelText, right - valueWidth - labelWidth, y, labelStyle);
  drawLine(doc, value, right - valueWidth, y, style);
}

// Light blue bar with a bold title, like \BlockTitle in the template.
function drawBlockTitle(doc: Doc, title: string, y: number): number {
  const style: TextStyle = { size: 11, bold: true, color: COLOR.brand };
  const barHeight = lineHeight(doc, style) + 6;
  y = ensureSpace(doc, y + 6, barHeight + lineHeight(doc, BODY) * 2);
  doc.rect(MARGIN, y, contentWidth(doc), barHeight).fill(COLOR.soft);
  drawLine(doc, title, MARGIN + 4, y + 3, style);
  return y + barHeight + 5;
}

// Two "label: value" columns side by side. Returns the y below the taller one.
function drawTwoColumns(doc: Doc, left: [string, string], right: [string, string], y: number): number {
  const half = contentWidth(doc) / 2;
  const leftBottom = drawLabelValue(doc, left[0], left[1], MARGIN, y, half - 8, BODY);
  const rightBottom = drawLabelValue(doc, right[0], right[1], MARGIN + half, y, half, BODY);
  return Math.max(leftBottom, rightBottom) + 2;
}

function drawFullRow(doc: Doc, label: string, value: string, y: number): number {
  return drawLabelValue(doc, label, value, MARGIN, y, contentWidth(doc), BODY) + 2;
}

// ---------- table ----------

interface Cell {
  text: string;
  width: number;
  align?: Align;
  bold?: boolean;
}

function cellLines(doc: Doc, cell: Cell): string[] {
  return wrapText(doc, cell.text, cell.width - CELL_PAD_X * 2, { ...TABLE, bold: cell.bold });
}

function rowHeight(doc: Doc, cells: Cell[]): number {
  const lines = Math.max(...cells.map((cell) => cellLines(doc, cell).length));
  return lines * lineHeight(doc, TABLE) + CELL_PAD_TOP + CELL_PAD_BOTTOM;
}

function drawRow(doc: Doc, cells: Cell[], y: number, height: number, fill?: string): void {
  const lh = lineHeight(doc, TABLE);
  let x = MARGIN;
  for (const cell of cells) {
    if (fill) doc.rect(x, y, cell.width, height).fill(fill);
    doc.lineWidth(0.5).rect(x, y, cell.width, height).stroke(COLOR.border);
    cellLines(doc, cell).forEach((line, i) => {
      drawLine(doc, line, x + CELL_PAD_X, y + CELL_PAD_TOP + i * lh, { ...TABLE, bold: cell.bold }, {
        width: cell.width - CELL_PAD_X * 2,
        align: cell.align,
      });
    });
    x += cell.width;
  }
}

// ---------- page 1 sections ----------

function drawDocumentHeader(doc: Doc, data: PrPdfData): number {
  const { pr } = data;
  const width = contentWidth(doc);
  let y = MARGIN;

  const companyStyle: TextStyle = { size: 17, bold: true, color: COLOR.text };
  drawLine(doc, data.company_name, MARGIN, y, companyStyle, { width, align: "center" });
  y += lineHeight(doc, companyStyle) + 6;

  const titleStyle: TextStyle = { size: 16, bold: true, color: COLOR.brand };
  drawLine(doc, "ใบขอซื้อ", MARGIN, y, titleStyle, { width, align: "center" });
  y += lineHeight(doc, titleStyle);

  const subStyle: TextStyle = { size: 10, color: COLOR.text };
  drawLine(doc, "Purchase Requisition", MARGIN, y, subStyle, { width, align: "center" });
  y += lineHeight(doc, subStyle) + 12;

  const lh = lineHeight(doc, BODY);
  drawLabelValue(doc, "เลขที่ PR", pr.pr_no, MARGIN, y, width / 2, BODY);
  drawLabelValueRight(doc, "สถานะ", STATUS_LABEL[pr.status] ?? pr.status, y, BODY);
  y += lh + 2;
  drawLabelValue(doc, "วันที่จัดทำ", formatDate(pr.created_at), MARGIN, y, width / 2, BODY);
  drawLabelValueRight(doc, "วันที่ต้องการใช้", formatDate(pr.require_date), y, BODY);
  y += lh + 3;

  doc.lineWidth(0.8).moveTo(MARGIN, y).lineTo(MARGIN + width, y).stroke(COLOR.brand);
  return y + 4;
}

function drawRequesterBlock(doc: Doc, data: PrPdfData, y: number): number {
  const { requester } = data;
  y = drawBlockTitle(doc, "ข้อมูลผู้ขอซื้อ", y);
  y = drawTwoColumns(doc, ["ชื่อ–นามสกุล", requester.full_name], ["ตำแหน่ง", show(requester.position)], y);
  y = drawTwoColumns(doc, ["แผนก", show(requester.department)], ["สาขา", show(requester.site)], y);
  y = drawFullRow(doc, "หน่วยงาน", show(requester.line), y);
  return y;
}

function drawRequestBlock(doc: Doc, data: PrPdfData, y: number): number {
  const { pr, extra } = data;
  y = drawBlockTitle(doc, "รายละเอียดคำขอ", y);
  y = drawFullRow(doc, "ชื่องาน", show(pr.job_name), y);
  y = drawFullRow(doc, "วัตถุประสงค์", show(pr.purpose), y);
  y = drawTwoColumns(doc, ["ประเภทสินทรัพย์", show(pr.asset_type)], ["ผู้ขาย", show(pr.vendor_name)], y + 4);
  y = drawTwoColumns(doc, ["กลุ่มสินค้าหลัก", show(extra.main_group)], ["ชนิดงบประมาณ", show(extra.budget_type)], y);
  y = drawTwoColumns(doc, ["รหัสงบประมาณ", show(extra.budget_code)], ["สกุลเงิน", CURRENCY], y);
  y = drawFullRow(doc, "รายละเอียดงบประมาณ", show(extra.budget_description), y);
  y = drawFullRow(doc, "อัตราแลกเปลี่ยน", `1 ${CURRENCY} = ${EXCHANGE_RATE} THB`, y + 4);
  return y;
}

function drawItemsBlock(doc: Doc, data: PrPdfData, y: number): number {
  const { pr } = data;
  const width = contentWidth(doc);
  const col = { no: 34, qty: 42, unit: 44, price: 68, total: 72 };
  const descWidth = width - col.no - col.qty - col.unit - col.price - col.total;

  const header: Cell[] = [
    { text: "ลำดับ", width: col.no, align: "center", bold: true },
    { text: "รายละเอียดสินค้า", width: descWidth, bold: true },
    { text: "จำนวน", width: col.qty, align: "right", bold: true },
    { text: "หน่วย", width: col.unit, align: "center", bold: true },
    { text: "ราคา/หน่วย", width: col.price, align: "right", bold: true },
    { text: "รวม", width: col.total, align: "right", bold: true },
  ];
  const drawHeader = (top: number): number => {
    const h = rowHeight(doc, header);
    drawRow(doc, header, top, h, COLOR.soft);
    return top + h;
  };

  y = drawBlockTitle(doc, "รายการสินค้า", y);
  y = ensureSpace(doc, y, rowHeight(doc, header) * 2);
  y = drawHeader(y);

  if (pr.items.length === 0) {
    const empty: Cell[] = [{ text: "ไม่มีรายการ", width, align: "center" }];
    const h = rowHeight(doc, empty);
    drawRow(doc, empty, y, h);
    y += h;
  }

  pr.items.forEach((item, index) => {
    const unitPrice = Number(item.unit_price);
    const cells: Cell[] = [
      { text: String(index + 1), width: col.no, align: "center" },
      { text: item.description, width: descWidth },
      { text: qtyFormat.format(item.qty), width: col.qty, align: "right" },
      { text: show(item.unit), width: col.unit, align: "center" },
      { text: moneyFormat.format(unitPrice), width: col.price, align: "right" },
      { text: moneyFormat.format(item.qty * unitPrice), width: col.total, align: "right" },
    ];
    const h = rowHeight(doc, cells);
    // Continue on a new page with the column header repeated.
    y = ensureSpace(doc, y, h, drawHeader);
    drawRow(doc, cells, y, h);
    y += h;
  });

  return y + 8;
}

function drawTotalsBlock(doc: Doc, data: PrPdfData, y: number): number {
  const total = data.pr.total_amount;
  const width = contentWidth(doc);
  const lh = lineHeight(doc, BODY);

  // Keep the whole totals block together.
  y = ensureSpace(doc, y, lh * 5 + 24);

  const totalStyle: TextStyle = { ...BODY, bold: true, color: COLOR.brand };
  drawLine(doc, `ยอดรวมสุทธิ: ${moneyFormat.format(total)} ${CURRENCY}`, MARGIN, y, totalStyle, {
    width,
    align: "right",
  });
  y += lh + 10;

  y = drawFullRow(doc, "จำนวนเงินภาษาไทย", thaiBahtText(total), y);
  y = drawFullRow(doc, "จำนวนเงินภาษาอังกฤษ", englishBahtText(total), y);
  y = drawFullRow(doc, "หมายเหตุ", show(data.extra.remark), y);
  y = drawFullRow(doc, "ส่วนงานจัดซื้อ", show(data.extra.purchaser_section), y + 4);
  return y;
}

// "SA-PR / IT-001-PR" on the left, "หน้า n" on the right of every page.
function drawFooters(doc: Doc, data: PrPdfData): void {
  const range = doc.bufferedPageRange();
  const style: TextStyle = { size: 8, color: COLOR.muted };
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Drawing inside the bottom margin would otherwise make pdfkit add a page.
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const y = doc.page.height - MARGIN + 14;
    drawLine(doc, `SA-PR / ${data.pr.pr_no}`, MARGIN, y, style);
    drawLine(doc, `หน้า ${i - range.start + 1}`, MARGIN, y, { ...style, color: COLOR.text }, {
      width: contentWidth(doc),
      align: "right",
    });

    doc.page.margins.bottom = bottomMargin;
  }
}

// ---------- page 2: approval cards ----------

interface CardStatus {
  text: string;
  color: string;
}

// Same wording as the website's approval chain.
function cardStatus(step: ApprovalStepWithSignature, steps: ApprovalStepWithSignature[]): CardStatus {
  switch (step.status) {
    case "approved":
      return { text: "อนุมัติแล้ว", color: COLOR.approved };
    case "rejected":
      return { text: "ไม่อนุมัติ", color: COLOR.rejected };
    case "cancelled":
      return { text: "ยกเลิก", color: COLOR.muted };
    default: {
      const current = steps.find((s) => s.status === "pending");
      return current === step
        ? { text: "รอการอนุมัติ", color: COLOR.text }
        : { text: "รอถึงลำดับ", color: COLOR.text };
    }
  }
}

// signature_image is stored like "/signatures/e0018.png". Only the file name is
// used, so a bad value can never point outside assets/signatures.
function signatureFile(step: ApprovalStepWithSignature): string | null {
  if (step.status !== "approved" || !step.signature_applied || !step.signature_image) return null;
  const file = path.join(SIGNATURE_DIR, path.basename(step.signature_image));
  return fs.existsSync(file) ? file : null;
}

const CARD_HEIGHT = 57 * MM + 6;
const CARD_GAP = 4 * MM;
const CARD_PAD = 3 + 1 * MM;

function drawApprovalCard(
  doc: Doc,
  step: ApprovalStepWithSignature,
  steps: ApprovalStepWithSignature[],
  x: number,
  y: number,
  width: number,
): void {
  doc.lineWidth(0.5).rect(x, y, width, CARD_HEIGHT).stroke(COLOR.border);

  const innerX = x + CARD_PAD;
  const innerW = width - CARD_PAD * 2;

  // Top: "1. Senior Chief", then the status (and the reason, if any).
  const titleStyle: TextStyle = { size: 9.5, bold: true, color: COLOR.brand };
  let ty = drawParagraph(doc, `${step.sequence_order}. ${step.level_name}`, innerX, y + CARD_PAD, innerW, titleStyle);
  ty += 2 * MM;

  const status = cardStatus(step, steps);
  ty = drawParagraph(doc, status.text, innerX, ty, innerW, { size: 10, color: status.color });

  if (step.comment && step.comment.trim()) {
    const label = step.status === "rejected" ? "เหตุผล" : "หมายเหตุ";
    const noteStyle: TextStyle = { size: 8.5, color: COLOR.muted };
    const lines = wrapText(doc, `${label}: ${step.comment.trim()}`, innerW, noteStyle);
    const shown = lines.slice(0, 3);
    if (lines.length > 3) shown[2] = `${shown[2]}…`;
    const lh = lineHeight(doc, noteStyle);
    shown.forEach((line, i) => drawLine(doc, line, innerX, ty + 2 + i * lh, noteStyle));
  }

  // Bottom, from the card edge upwards: date, name, rule, signature box.
  const dateStyle: TextStyle = { size: 8.5, color: COLOR.text };
  const nameStyle: TextStyle = { size: 9, color: COLOR.text };
  const dateY = y + CARD_HEIGHT - CARD_PAD - lineHeight(doc, dateStyle);
  const nameY = dateY - 2 * MM - lineHeight(doc, nameStyle);
  const ruleY = nameY - 1 * MM;
  const sigBottom = ruleY - 1 * MM;
  const sigTop = sigBottom - 13 * MM;

  const signedAt = step.status === "approved" || step.status === "rejected" ? step.approved_at : null;
  drawLine(doc, formatThaiDateTime(signedAt), innerX, dateY, dateStyle, { width: innerW, align: "center" });
  drawLine(doc, step.approver_name, innerX, nameY, nameStyle, { width: innerW, align: "center" });

  const ruleW = innerW * 0.9;
  doc.lineWidth(0.4).moveTo(x + (width - ruleW) / 2, ruleY).lineTo(x + (width + ruleW) / 2, ruleY).stroke(COLOR.border);

  if (step.status === "approved") {
    const file = signatureFile(step);
    if (file) {
      doc.image(file, innerX + innerW * 0.075, sigTop + 0.5 * MM, {
        fit: [innerW * 0.85, 12 * MM],
        align: "center",
        valign: "center",
      });
    } else {
      // Approved but no signature file: same text placeholder as the design.
      const placeholder: TextStyle = { size: 8, color: COLOR.muted };
      const py = sigTop + (13 * MM - lineHeight(doc, placeholder)) / 2;
      drawLine(doc, "(ลายเซ็นอิเล็กทรอนิก)", innerX, py, placeholder, { width: innerW, align: "center" });
    }
  }
}

function drawApprovalPage(doc: Doc, data: PrPdfData): void {
  const { pr, approvals } = data;
  const width = contentWidth(doc);

  doc.addPage();
  let y = MARGIN;

  const titleStyle: TextStyle = { size: 16, bold: true, color: COLOR.brand };
  drawLine(doc, "การลงนามอนุมัติใบขอซื้อ", MARGIN, y, titleStyle);
  y += lineHeight(doc, titleStyle) + 2;

  drawLabelValue(doc, "เลขที่ PR", pr.pr_no, MARGIN, y, width / 2, BODY);
  drawLabelValueRight(doc, "ยอดรวม", `${moneyFormat.format(pr.total_amount)} ${CURRENCY}`, y, BODY);
  y += lineHeight(doc, BODY);

  y = drawBlockTitle(doc, "ผู้บริหารผู้มีอำนาจอนุมัติตามลำดับ", y);
  y += 2;

  if (approvals.length === 0) {
    y = drawFullRow(doc, "สถานะ", "ยังไม่มีข้อมูลผู้อนุมัติ", y);
  }

  const cardWidth = (width - CARD_GAP * 2) / 3;
  for (let i = 0; i < approvals.length; i += 3) {
    y = ensureSpace(doc, y, CARD_HEIGHT);
    approvals.slice(i, i + 3).forEach((step, col) => {
      drawApprovalCard(doc, step, approvals, MARGIN + col * (cardWidth + CARD_GAP), y, cardWidth);
    });
    y += CARD_HEIGHT + 8;
  }

  const noteStyle: TextStyle = { size: 8, color: COLOR.muted };
  y = ensureSpace(doc, y, lineHeight(doc, noteStyle) * 2);
  drawParagraph(
    doc,
    `เอกสารนี้สร้างจากข้อมูลการอนุมัติในระบบ ณ ${formatThaiDateTime(data.generated_at)} ` +
      "และไม่ใช่เอกสารที่ลงนามด้วยลายมือชื่อดิจิทัล (digital signature)",
    MARGIN,
    y,
    width,
    noteStyle,
  );
}

// ---------- public API ----------

// Render the PR document to a PDF buffer. Pure: no DB access.
export function renderPrPdf(data: PrPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      bufferPages: true,
      info: { Title: `Purchase Requisition ${data.pr.pr_no}`, Author: "PR Approval System" },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      doc.registerFont(FONT.thai, path.join(FONT_DIR, "BaiJamjuree-Regular.ttf"));
      doc.registerFont(FONT.thaiBold, path.join(FONT_DIR, "BaiJamjuree-SemiBold.ttf"));
      doc.registerFont(FONT.latin, path.join(FONT_DIR, "Inter-Regular.ttf"));
      doc.registerFont(FONT.latinBold, path.join(FONT_DIR, "Inter-SemiBold.ttf"));

      let y = drawDocumentHeader(doc, data);
      y = drawRequesterBlock(doc, data, y);
      y = drawRequestBlock(doc, data, y);
      y = drawItemsBlock(doc, data, y);
      drawTotalsBlock(doc, data, y);
      drawApprovalPage(doc, data);
      drawFooters(doc, data);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Load everything else the PDF needs for an already-loaded PR.
// (Callers usually have the PR already, e.g. to check it exists first.)
export async function buildPrPdfData(pr: PrWithItems): Promise<PrPdfData> {
  // Same rows and order as GET /api/pr/:id/status, so PDF and website match.
  return buildPdfData(pr, await findApprovalStepsWithSignature(pr.pr_id));
}

// A PR that has not been submitted yet (POST /api/pr/pdf-preview).
// Nothing is saved; the approval cards show the chain this total would get.
export async function buildDraftPdfData(input: CreatePrInput): Promise<PrPdfData> {
  const items = input.items.map((item, i) => ({
    item_id: `ITEM${i + 1}`,
    pr_id: "DRAFT",
    description: item.description,
    qty: item.qty,
    unit: item.unit ?? null,
    unit_price: item.unit_price.toFixed(2),
  }));
  const total = input.items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);

  const pr: PrWithItems = {
    pr_id: "DRAFT",
    pr_no: "ฉบับร่าง",
    requester_id: input.requester_id,
    // parsePrInput stores require_date as a UTC "YYYY-MM-DD HH:MM:SS" string.
    require_date: new Date(`${input.require_date.replace(" ", "T")}Z`),
    job_name: input.job_name ?? null,
    purpose: input.purpose ?? null,
    asset_type: input.asset_type ?? null,
    budget_code: input.budget_code ?? null,
    vendor_name: input.vendor_name ?? null,
    status: "pending",
    created_at: new Date(),
    items,
    attachments: [],
    total_amount: total,
  };

  return buildPdfData(pr, await previewApprovalSteps(total));
}

async function buildPdfData(pr: PrWithItems, approvals: ApprovalStepWithSignature[]): Promise<PrPdfData> {
  const employee = await findEmployeeById(pr.requester_id);

  return {
    company_name: process.env.COMPANY_NAME || "บริษัทตัวอย่าง จำกัด",
    generated_at: new Date(),
    pr,
    approvals,
    requester: {
      employee_id: pr.requester_id,
      full_name: employee?.full_name ?? pr.requester_id,
      position: employee?.position ?? null,
      department: employee?.department ?? null,
      site: null, // not in the DB yet
      line: null, // not in the DB yet
    },
    // Fields not in the DB yet are null and printed as "-".
    extra: {
      main_group: null,
      budget_type: null,
      budget_code: pr.budget_code,
      budget_description: null,
      remark: null,
      purchaser_section: null,
    },
  };
}

// Convenience for scripts: load the PR and render it. Returns null when the PR does not exist.
export async function generatePrPdf(prId: string): Promise<Buffer | null> {
  const pr = await findPrById(prId);
  return pr ? renderPrPdf(await buildPrPdfData(pr)) : null;
}
