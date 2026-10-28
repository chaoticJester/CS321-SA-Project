import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import PDFDocument from "pdfkit";
import type { RowDataPacket } from "mysql2";
import pool from "../config/db";
import { insertAttachment } from "../models/pr.model";
import { approvePr, rejectPr } from "../services/approval.service";
import { createPr } from "../services/pr.service";
import { reservePrNumber } from "../services/pr-number.service";
import type { PrItemInput } from "../types/pr";
import { FONT, drawLine, lineHeight, type TextStyle } from "../utils/pdfText";

// Rebuild the database with realistic demo PRs for the presentation.
//
//   npm run seed:demo -- --reset
//
// DELETES every PR, item, attachment, approval log and PR number reservation,
// then creates the PRs below through the real services (number reservation ->
// createPr -> approvePr / rejectPr), so numbers, approval chains and signatures
// follow the same rules as the website. Employees and approval levels are kept.
// Prices are market prices in THB excluding VAT; vendors on the quotations are fictional.

const REQUESTER = "E0020";
const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");
const FONT_DIR = path.resolve(__dirname, "../../assets/fonts");
const MIGRATION = path.resolve(__dirname, "../../database/add_pr_number_reservations.sql");

// Approver of each level in seed_data.sql.
const APPROVER = { LV1: "E0018", LV2: "E0017", LV3: "E0015", LV4: "E0010", LV5: "E0005", LV6: "E0002" } as const;
type Level = keyof typeof APPROVER;

interface Vendor {
  name: string;
  address: string;
  taxId: string;
  phone: string;
}

// Fictional vendors for the quotation attachments.
const VENDOR = {
  techmart: {
    name: "บริษัท เทคมาร์ท โซลูชั่นส์ จำกัด",
    address: "88/12 ถนนรามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240",
    taxId: "0105561023457",
    phone: "02-318-4470",
  },
  netlink: {
    name: "บริษัท เน็ตลิงก์ ซิสเต็มส์ จำกัด",
    address: "45 ซอยลาดพร้าว 71 แขวงสะพานสอง เขตวังทองหลาง กรุงเทพฯ 10310",
    taxId: "0105559087132",
    phone: "02-530-2288",
  },
  officeplus: {
    name: "บริษัท ออฟฟิศพลัส ซัพพลาย จำกัด",
    address: "199 ถนนบางนา-ตราด กม.3 แขวงบางนา เขตบางนา กรุงเทพฯ 10260",
    taxId: "0105563041986",
    phone: "02-744-9150",
  },
} satisfies Record<string, Vendor>;

interface Decision {
  level: Level;
  at: string;
  reject?: string;
}

interface DemoPr {
  createdAt: string;
  requireDate: string;
  job: string;
  purpose: string;
  budgetType: "Investment Budget" | "Expense Budget";
  purchaser: string;
  vendor: Vendor;
  items: PrItemInput[];
  // Decisions taken so far, in chain order. Levels after the last one stay pending.
  decisions: Decision[];
}

// Item text follows the form: name · brand · model · detail.
const DEMO: DemoPr[] = [
  {
    createdAt: "2026-08-04 09:12",
    requireDate: "2026-08-25",
    job: "จัดซื้อโน้ตบุ๊กสำหรับพนักงานใหม่ ฝ่ายบัญชี",
    purpose: "รองรับพนักงานบัญชีที่เริ่มงานเดือนกันยายน 3 ตำแหน่ง ตามแผนอัตรากำลังปี 2569",
    budgetType: "Investment Budget",
    purchaser: "PURCHASING 1 (HO)",
    vendor: VENDOR.techmart,
    items: [
      { description: "โน้ตบุ๊ก · Dell · Latitude 5450 · Intel Core Ultra 5 125U / RAM 16GB / SSD 512GB / 14\" FHD / Windows 11 Pro", qty: 3, unit: "เครื่อง", unit_price: 32900 },
      { description: "กระเป๋าโน้ตบุ๊ก · Dell · Pro Backpack 15 (CP5723) · สำหรับจอ 15 นิ้ว", qty: 3, unit: "ใบ", unit_price: 1290 },
    ],
    decisions: [
      { level: "LV1", at: "2026-08-04 14:30" },
      { level: "LV2", at: "2026-08-05 10:05" },
      { level: "LV3", at: "2026-08-06 09:40" },
      { level: "LV4", at: "2026-08-07 16:15" },
      { level: "LV5", at: "2026-08-10 11:20" },
    ],
  },
  {
    createdAt: "2026-08-19 10:45",
    requireDate: "2026-09-01",
    job: "ต่ออายุ Microsoft 365 Business Standard ปี 2569-2570",
    purpose: "ต่ออายุไลเซนส์อีเมลและ Office สำหรับพนักงาน 25 คน ที่จะหมดอายุ 31 ส.ค. 2569",
    budgetType: "Investment Budget",
    purchaser: "INFRASTRUCTURE SYSTEM",
    vendor: VENDOR.techmart,
    items: [
      { description: "ไลเซนส์ · Microsoft · 365 Business Standard · รายปี 12 เดือน", qty: 25, unit: "ไลเซนส์", unit_price: 4470 },
    ],
    decisions: [
      { level: "LV1", at: "2026-08-19 15:10" },
      { level: "LV2", at: "2026-08-20 09:25" },
      { level: "LV3", at: "2026-08-21 13:50", reject: "ขอให้เปรียบเทียบราคากับแพ็กเกจ M365 Enterprise ที่สำนักงานใหญ่ใช้อยู่ และแนบใบเสนอราคาอย่างน้อย 2 ราย" },
    ],
  },
  {
    createdAt: "2026-09-02 08:55",
    requireDate: "2026-09-20",
    job: "เปลี่ยนเครื่องสำรองไฟ (UPS) ห้อง Server",
    purpose: "แบตเตอรี่ UPS เดิมเสื่อมสภาพ สำรองไฟได้ไม่ถึง 3 นาที เสี่ยงต่อระบบ ERP และไฟล์เซิร์ฟเวอร์",
    budgetType: "Investment Budget",
    purchaser: "INFRASTRUCTURE SYSTEM",
    vendor: VENDOR.netlink,
    items: [
      { description: "เครื่องสำรองไฟ · APC · Smart-UPS SMT1500IC · 1500VA/1000W พร้อม SmartConnect", qty: 2, unit: "เครื่อง", unit_price: 23900 },
    ],
    decisions: [
      { level: "LV1", at: "2026-09-02 11:30" },
      { level: "LV2", at: "2026-09-03 14:05" },
      { level: "LV3", at: "2026-09-04 10:40" },
    ],
  },
  {
    createdAt: "2026-09-15 13:20",
    requireDate: "2026-10-01",
    job: "จอภาพเพิ่มเติมสำหรับฝ่ายวางแผนการผลิต",
    purpose: "ติดตั้งจอที่สองให้พนักงานวางแผนการผลิต 6 คน เพื่อเปิดตารางแผนผลิตและ ERP พร้อมกัน",
    budgetType: "Investment Budget",
    purchaser: "PURCHASING 1 (HO)",
    vendor: VENDOR.techmart,
    items: [
      { description: "จอภาพ · Dell · P2425H · 23.8\" IPS FHD 100Hz พร้อมขาปรับระดับ", qty: 6, unit: "จอ", unit_price: 5290 },
    ],
    decisions: [
      { level: "LV1", at: "2026-09-15 16:00" },
      { level: "LV2", at: "2026-09-16 09:15" },
      { level: "LV3", at: "2026-09-17 11:45" },
    ],
  },
  {
    createdAt: "2026-09-24 09:30",
    requireDate: "2026-10-05",
    job: "หมึกพิมพ์เลเซอร์สำหรับไตรมาส 4",
    purpose: "สำรองหมึกเครื่องพิมพ์ HP LaserJet Pro ของฝ่ายธุรการและบัญชี",
    budgetType: "Expense Budget",
    purchaser: "GENERAL ADMINISTRATION 1",
    vendor: VENDOR.officeplus,
    items: [
      { description: "ตลับหมึก · HP · 151A (W1510A) · สีดำ ของแท้", qty: 6, unit: "ตลับ", unit_price: 2650 },
    ],
    decisions: [
      { level: "LV1", at: "2026-09-24 13:40" },
      { level: "LV2", at: "2026-09-25 10:20", reject: "หมึกคงคลังยังเพียงพอถึงสิ้นเดือน พ.ย. กรุณาส่งคำขอใหม่ต้นเดือน ธ.ค." },
    ],
  },
  {
    createdAt: "2026-10-06 10:10",
    requireDate: "2026-11-10",
    job: "ขยายระบบเครือข่าย LAN ชั้น 3 (ห้องฝึกอบรม)",
    purpose: "เดินสาย LAN และเพิ่ม Switch PoE รองรับเครื่องคอมพิวเตอร์ห้องฝึกอบรม 40 จุด",
    budgetType: "Investment Budget",
    purchaser: "INFRASTRUCTURE SYSTEM",
    vendor: VENDOR.netlink,
    items: [
      { description: "สวิตช์ · Cisco · CBS350-24P-4G · 24 พอร์ต Gigabit PoE+ 195W / 4 SFP", qty: 2, unit: "เครื่อง", unit_price: 21500 },
      { description: "สาย LAN · LINK · US-9106 · CAT6 UTP ภายในอาคาร ม้วน 305 ม.", qty: 2, unit: "กล่อง", unit_price: 3450 },
    ],
    decisions: [
      { level: "LV1", at: "2026-10-06 14:25" },
      { level: "LV2", at: "2026-10-08 09:50" },
    ],
  },
  {
    createdAt: "2026-10-14 11:05",
    requireDate: "2026-11-15",
    job: "ต่ออายุโปรแกรมป้องกันไวรัส ESET PROTECT",
    purpose: "ไลเซนส์ Antivirus เดิม 50 เครื่องจะหมดอายุ 30 พ.ย. 2569",
    budgetType: "Investment Budget",
    purchaser: "INFRASTRUCTURE SYSTEM",
    vendor: VENDOR.netlink,
    items: [
      { description: "ไลเซนส์ · ESET · PROTECT Entry · 1 ปี / 1 เครื่อง", qty: 50, unit: "ไลเซนส์", unit_price: 1150 },
    ],
    decisions: [
      { level: "LV1", at: "2026-10-14 15:30" },
      { level: "LV2", at: "2026-10-15 10:10" },
      { level: "LV3", at: "2026-10-16 14:45" },
    ],
  },
  {
    createdAt: "2026-10-21 09:40",
    requireDate: "2026-11-05",
    job: "เมาส์และคีย์บอร์ดทดแทนชุดที่ชำรุด",
    purpose: "ทดแทนอุปกรณ์ที่ชำรุดจากการแจ้งซ่อมเดือน ก.ย.-ต.ค. จำนวน 10 ชุด",
    budgetType: "Expense Budget",
    purchaser: "GENERAL ADMINISTRATION 1",
    vendor: VENDOR.officeplus,
    items: [
      { description: "ชุดคีย์บอร์ดและเมาส์ไร้สาย · Logitech · MK295 Silent · แป้นภาษาไทย/อังกฤษ", qty: 10, unit: "ชุด", unit_price: 790 },
    ],
    decisions: [{ level: "LV1", at: "2026-10-21 13:15" }],
  },
  {
    createdAt: "2026-10-26 14:20",
    requireDate: "2026-11-20",
    job: "Access Point Wi-Fi ห้องประชุมใหญ่",
    purpose: "สัญญาณ Wi-Fi ไม่เพียงพอเมื่อมีผู้เข้าประชุมเกิน 30 คน",
    budgetType: "Investment Budget",
    purchaser: "INFRASTRUCTURE SYSTEM",
    vendor: VENDOR.netlink,
    items: [
      { description: "Access Point · Ubiquiti · UniFi U7 Pro · Wi-Fi 7 รองรับ 6GHz", qty: 3, unit: "ตัว", unit_price: 7590 },
    ],
    decisions: [],
  },
  {
    createdAt: "2026-10-27 10:35",
    requireDate: "2026-11-30",
    job: "โน้ตบุ๊กทดแทนเครื่องเก่า ฝ่ายขาย",
    purpose: "ทดแทนเครื่องอายุการใช้งานเกิน 6 ปี จำนวน 2 เครื่อง (แบตเตอรี่เสื่อม ซ่อมไม่คุ้มค่า)",
    budgetType: "Investment Budget",
    purchaser: "PURCHASING 1 (HO)",
    vendor: VENDOR.techmart,
    items: [
      { description: "โน้ตบุ๊ก · Lenovo · ThinkPad E14 Gen 6 · Intel Core i5-1335U / RAM 16GB / SSD 512GB / Windows 11 Pro", qty: 2, unit: "เครื่อง", unit_price: 27900 },
    ],
    decisions: [],
  },
];

function at(value: string): Date {
  return new Date(`${value.replace(" ", "T")}:00+07:00`);
}

async function ensureReservationTables(): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>("SHOW TABLES LIKE 'pr_number_counter'");
  if (rows.length) return;
  console.log("Applying database/add_pr_number_reservations.sql ...");
  const statements = fs.readFileSync(MIGRATION, "utf8")
    .split(";")
    .map((statement) => statement.replace(/^\s*--.*$/gm, "").trim())
    .filter((statement) => statement && !/^USE\s/i.test(statement));
  for (const statement of statements) await pool.query(statement);
}

async function resetPrData(): Promise<void> {
  const [files] = await pool.query<RowDataPacket[]>("SELECT file_path FROM attachment");
  for (const { file_path } of files) {
    const file = path.join(UPLOAD_DIR, path.basename(file_path));
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  await pool.query("DELETE FROM approval_log");
  await pool.query("DELETE FROM attachment");
  await pool.query("DELETE FROM pr_item");
  await pool.query("DELETE FROM pr_number_reservation");
  await pool.query("DELETE FROM pr");
  await pool.query("UPDATE pr_number_counter SET last_sequence = 0 WHERE counter_name = 'pr'");
}

const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function quotationPdf(pr: DemoPr, prNo: string, quotationNo: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: `Quotation ${quotationNo}` } });
    doc.registerFont(FONT.thai, path.join(FONT_DIR, "BaiJamjuree-Regular.ttf"));
    doc.registerFont(FONT.thaiBold, path.join(FONT_DIR, "BaiJamjuree-SemiBold.ttf"));
    doc.registerFont(FONT.latin, path.join(FONT_DIR, "Inter-Regular.ttf"));
    doc.registerFont(FONT.latinBold, path.join(FONT_DIR, "Inter-SemiBold.ttf"));
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = 50;
    const width = doc.page.width - 100;
    const body: TextStyle = { size: 10 };
    const small: TextStyle = { size: 9, color: "#555" };
    const bold: TextStyle = { size: 10, bold: true };
    let y = 50;
    const line = (text: string, style: TextStyle, opts: { width?: number; align?: "left" | "right" | "center" } = {}, x = left) => drawLine(doc, text, x, y, style, opts);

    line(pr.vendor.name, { size: 15, bold: true, color: "#1f3b70" });
    line("ใบเสนอราคา / QUOTATION", { size: 15, bold: true, color: "#1f3b70" }, { width, align: "right" });
    y += 24;
    line(pr.vendor.address, small);
    y += 14;
    line(`เลขประจำตัวผู้เสียภาษี ${pr.vendor.taxId} · โทร ${pr.vendor.phone}`, small);
    y += 26;
    doc.moveTo(left, y).lineTo(left + width, y).strokeColor("#1f3b70").lineWidth(1).stroke();
    y += 12;

    const issued = at(pr.createdAt);
    issued.setDate(issued.getDate() - 3);
    const date = issued.toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok" });
    line(`เรียน: ${process.env.COMPANY_NAME || "บริษัทตัวอย่าง จำกัด"} (ฝ่าย IT)`, body);
    line(`เลขที่: ${quotationNo}`, body, { width, align: "right" });
    y += 16;
    line(`เรื่อง: ${pr.job}`, body);
    line(`วันที่: ${date}`, body, { width, align: "right" });
    y += 16;
    line(`อ้างอิง: ${prNo}`, body);
    line("ยืนราคา: 30 วัน", body, { width, align: "right" });
    y += 26;

    const cols = [
      { title: "ลำดับ", width: 36, align: "center" as const },
      { title: "รายการ", width: width - 36 - 50 - 80 - 90, align: "left" as const },
      { title: "จำนวน", width: 50, align: "right" as const },
      { title: "ราคา/หน่วย", width: 80, align: "right" as const },
      { title: "จำนวนเงิน", width: 90, align: "right" as const },
    ];
    const cell = (values: string[], style: TextStyle, height: number) => {
      let x = left;
      values.forEach((value, i) => {
        drawLine(doc, value, x + 5, y + (height - lineHeight(doc, style)) / 2, style, { width: cols[i]!.width - 10, align: cols[i]!.align });
        x += cols[i]!.width;
      });
    };
    doc.rect(left, y, width, 22).fill("#e8eef8");
    cell(cols.map((c) => c.title), bold, 22);
    y += 22;
    let subtotal = 0;
    pr.items.forEach((item, i) => {
      const amount = item.qty * item.unit_price;
      subtotal += amount;
      const parts = item.description.split(" · ");
      const name = `${parts[1]} ${parts[2]}`;
      cell([String(i + 1), name, `${item.qty} ${item.unit}`, money.format(item.unit_price), money.format(amount)], body, 20);
      y += 18;
      drawLine(doc, parts.slice(3).join(" · ") || parts[0]!, left + cols[0]!.width + 5, y, small);
      y += 18;
      doc.moveTo(left, y).lineTo(left + width, y).strokeColor("#d5dbe5").lineWidth(0.5).stroke();
    });
    y += 10;
    const vat = Math.round(subtotal * 7) / 100;
    for (const [label, value, style] of [
      ["รวมเป็นเงิน", subtotal, body],
      ["ภาษีมูลค่าเพิ่ม 7%", vat, body],
      ["ยอดรวมทั้งสิ้น", subtotal + vat, bold],
    ] as const) {
      line(label, style, { width: width - 110, align: "right" });
      line(`${money.format(value)} บาท`, style, { width, align: "right" });
      y += 18;
    }
    y += 20;
    line("เงื่อนไข: ชำระเงินภายใน 30 วันหลังส่งมอบ · ส่งมอบภายใน 7-14 วันหลังได้รับใบสั่งซื้อ · รับประกันตามเงื่อนไขผู้ผลิต", small);
    y += 60;
    line("ผู้เสนอราคา ______________________", body, { width, align: "right" });
    y += 16;
    line("ฝ่ายขายองค์กร", small, { width: width - 40, align: "right" });

    doc.end();
  });
}

async function seedPr(pr: DemoPr, index: number): Promise<string> {
  const reservation = await reservePrNumber(REQUESTER);
  const prId = await createPr(
    {
      requester_id: REQUESTER,
      require_date: `${pr.requireDate} 00:00:00`,
      job_name: pr.job,
      purpose: pr.purpose,
      asset_type: pr.budgetType,
      vendor_name: pr.purchaser,
      items: pr.items,
    },
    reservation.reservation_id,
  );

  // Quotation from the vendor, attached the same way as an upload from the website.
  const fileName = `${randomBytes(16).toString("hex")}.pdf`;
  const quotationNo = `QT-${pr.createdAt.slice(2, 4)}${pr.createdAt.slice(5, 7)}-${String(index + 101).padStart(4, "0")}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, fileName), await quotationPdf(pr, reservation.pr_no, quotationNo));
  await insertAttachment(prId, "application/pdf", fileName);

  for (const decision of pr.decisions) {
    const approver = APPROVER[decision.level];
    if (decision.reject) await rejectPr(prId, approver, decision.reject);
    else await approvePr(prId, approver);
    await pool.query("UPDATE approval_log SET approved_at = ? WHERE pr_id = ? AND approver_id = ?", [at(decision.at), prId, approver]);
  }

  // The services stamp everything with NOW(); move it to the story's dates.
  const created = at(pr.createdAt);
  await pool.query("UPDATE pr SET created_at = ? WHERE pr_id = ?", [created, prId]);
  await pool.query("UPDATE approval_log SET created_at = ? WHERE pr_id = ?", [created, prId]);
  await pool.query("UPDATE attachment SET uploaded_at = ? WHERE pr_id = ?", [created, prId]);
  await pool.query("UPDATE pr_number_reservation SET created_at = ?, used_at = ? WHERE reservation_id = ?", [created, created, reservation.reservation_id]);

  const [[status]] = await pool.query<RowDataPacket[]>("SELECT status FROM pr WHERE pr_id = ?", [prId]);
  const total = pr.items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  console.log(`${reservation.pr_no}  ${String(status!.status).padEnd(8)}  ${money.format(total).padStart(11)}  ${pr.job}`);
  return prId;
}

async function main(): Promise<void> {
  if (!process.argv.includes("--reset")) {
    console.error("This deletes every PR and rebuilds the demo data. Run: npm run seed:demo -- --reset");
    process.exitCode = 1;
    return;
  }
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to reset PR data with NODE_ENV=production.");
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  await ensureReservationTables();
  await resetPrData();
  for (const [index, pr] of DEMO.entries()) await seedPr(pr, index);
  console.log(`\nSeeded ${DEMO.length} PRs for ${REQUESTER}. The next PR created on the website will be IT-${String(DEMO.length + 1).padStart(3, "0")}-PR.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
