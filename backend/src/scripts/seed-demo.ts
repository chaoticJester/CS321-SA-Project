import fs from "fs";
import path from "path";
import type { RowDataPacket } from "mysql2";
import pool from "../config/db";
import { approvePr, rejectPr } from "../services/approval.service";
import { createPr } from "../services/pr.service";
import { reservePrNumber } from "../services/pr-number.service";
import type { PrItemInput } from "../types/pr";

// Rebuild the database with realistic demo PRs for the presentation.
//
//   npm run seed:demo -- --reset
//
// DELETES every PR, item, attachment, approval log and PR number reservation,
// then creates the PRs below through the real services (number reservation ->
// createPr -> approvePr / rejectPr), so numbers, approval chains and signatures
// follow the same rules as the website. Employees and approval levels are kept.
// Prices are market prices in THB excluding VAT. No attachments are created.

const REQUESTER = "E0020";
const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");
const MIGRATIONS = [
  { table: "pr_number_counter", file: "add_pr_number_reservations.sql" },
  { table: "attachment", column: "file_name", file: "add_attachment_file_name.sql" },
  { table: "pr", column: "budget_code", file: "add_pr_budget_code.sql" },
];

// Approver of each level in seed_data.sql.
const APPROVER = { LV1: "E0018", LV2: "E0017", LV3: "E0015", LV4: "E0010", LV5: "E0005", LV6: "E0002" } as const;
type Level = keyof typeof APPROVER;

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
  // One of the codes the form offers for this budget type (frontend/src/formOptions.ts).
  budgetCode: string;
  purchaser: string;
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
    budgetCode: "26-23-ADM-072",
    purchaser: "PURCHASING 1 (HO)",
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
    job: "ต่ออายุ Microsoft 365 E3 สำหรับผู้บริหารและฝ่ายวางแผน",
    purpose: "ไลเซนส์ M365 Enterprise ของผู้ใช้ 8 คน จะหมดอายุ 31 ส.ค. 2569",
    budgetType: "Investment Budget",
    budgetCode: "26-23-ADM-074",
    purchaser: "INFRASTRUCTURE SYSTEM",
    items: [
      { description: "ไลเซนส์ · Microsoft · 365 E3 · รายปี 12 เดือน / 1 ผู้ใช้", qty: 8, unit: "ไลเซนส์", unit_price: 15300 },
    ],
    decisions: [
      { level: "LV1", at: "2026-08-19 15:10" },
      { level: "LV2", at: "2026-08-20 09:25" },
      { level: "LV3", at: "2026-08-21 13:50", reject: "ผู้ใช้ 3 คนใช้เพียงอีเมลและ Teams ขอให้ปรับเป็น M365 Business Basic แล้วส่งคำขอใหม่" },
    ],
  },
  {
    createdAt: "2026-09-02 08:55",
    requireDate: "2026-09-20",
    job: "Windows Server Device CAL สำหรับเครื่องลูกข่ายสาขาใหม่",
    purpose: "เครื่องคอมพิวเตอร์ 20 เครื่องของสาขาใหม่ต้องเชื่อมต่อ File Server และ Active Directory",
    budgetType: "Investment Budget",
    budgetCode: "26-23-ADM-073",
    purchaser: "INFRASTRUCTURE SYSTEM",
    items: [
      { description: "ไลเซนส์ · Microsoft · Windows Server 2022 Device CAL · แบบถาวร 1 เครื่อง", qty: 20, unit: "ไลเซนส์", unit_price: 1450 },
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
    job: "หนังสือพิมพ์และหนังสือประกอบการเรียนรู้ ห้องสมุดสำนักงาน",
    purpose: "สมาชิกหนังสือพิมพ์รายปีสำหรับห้องรับรอง และหนังสือสำหรับกิจกรรม Knowledge Sharing",
    budgetType: "Expense Budget",
    budgetCode: "26-99-1000-BOO-2-901-001-00",
    purchaser: "GENERAL ADMINISTRATION 1",
    items: [
      { description: "สมาชิกหนังสือพิมพ์ · Bangkok Post · ฉบับพิมพ์ รายปี 12 เดือน", qty: 1, unit: "ปี", unit_price: 4380 },
      { description: "สมาชิกหนังสือพิมพ์ · กรุงเทพธุรกิจ · ฉบับพิมพ์ รายปี 12 เดือน", qty: 1, unit: "ปี", unit_price: 3000 },
      { description: "หนังสือ · วิถีแห่งโตโยต้า (The Toyota Way) · ฉบับภาษาไทย", qty: 5, unit: "เล่ม", unit_price: 395 },
    ],
    decisions: [
      { level: "LV1", at: "2026-09-15 16:00" },
      { level: "LV2", at: "2026-09-16 09:15" },
    ],
  },
  {
    createdAt: "2026-09-24 09:30",
    requireDate: "2026-11-02",
    job: "เสื้อและป้ายประชาสัมพันธ์งาน Quality Month 2569",
    purpose: "ใช้ในงาน Quality Month เดือนพฤศจิกายน สำหรับคณะทำงาน 60 คน",
    budgetType: "Expense Budget",
    budgetCode: "26-99-1000-ACT-2-901-001-00",
    purchaser: "GENERAL ADMINISTRATION 1",
    items: [
      { description: "เสื้อโปโล · Grand Sport · 012-777 · ปักโลโก้ Quality Month คละไซซ์", qty: 60, unit: "ตัว", unit_price: 320 },
      { description: "ป้ายไวนิล · ขนาด 1.2 x 3 ม. · พิมพ์ 4 สี พร้อมเจาะตาไก่", qty: 3, unit: "ป้าย", unit_price: 900 },
    ],
    decisions: [
      { level: "LV1", at: "2026-09-24 13:40" },
      { level: "LV2", at: "2026-09-25 10:20", reject: "ปีนี้ HR สั่งเสื้อกิจกรรมให้ทั้งบริษัทแล้ว ขอให้ตัดรายการเสื้อออกแล้วส่งคำขอใหม่" },
    ],
  },
  {
    createdAt: "2026-10-06 10:10",
    requireDate: "2026-11-15",
    job: "ต่ออายุโปรแกรมป้องกันไวรัส ESET PROTECT",
    purpose: "ไลเซนส์ Antivirus เดิม 50 เครื่องจะหมดอายุ 30 พ.ย. 2569",
    budgetType: "Investment Budget",
    budgetCode: "26-23-ADM-076",
    purchaser: "INFRASTRUCTURE SYSTEM",
    items: [
      { description: "ไลเซนส์ · ESET · PROTECT Entry · 1 ปี / 1 เครื่อง", qty: 50, unit: "ไลเซนส์", unit_price: 1150 },
    ],
    decisions: [
      { level: "LV1", at: "2026-10-06 14:25" },
      { level: "LV2", at: "2026-10-07 09:50" },
      { level: "LV3", at: "2026-10-08 15:10" },
    ],
  },
  {
    createdAt: "2026-10-14 11:05",
    requireDate: "2026-11-25",
    job: "เช่ารถบัสศึกษาดูงานโรงงานต้นแบบ",
    purpose: "พาพนักงาน 70 คนศึกษาดูงานระบบ Lean ที่นิคมอุตสาหกรรมอมตะซิตี้ ชลบุรี 1 วัน",
    budgetType: "Expense Budget",
    budgetCode: "26-99-1000-BUS-2-901-001-00",
    purchaser: "PERSONNEL ADMINISTRATION",
    items: [
      { description: "รถบัสปรับอากาศ · 40 ที่นั่ง · ไป-กลับ กรุงเทพฯ-ชลบุรี 1 วัน รวมน้ำมันและคนขับ", qty: 2, unit: "คัน", unit_price: 14500 },
    ],
    decisions: [
      { level: "LV1", at: "2026-10-14 15:30" },
      { level: "LV2", at: "2026-10-15 10:10" },
    ],
  },
  {
    createdAt: "2026-10-21 09:40",
    requireDate: "2026-12-01",
    job: "ต่ออายุ Microsoft Teams Enterprise ฝ่ายขายและฝ่ายผลิต",
    purpose: "ใช้ประชุมออนไลน์กับลูกค้าและโรงงานในเครือ ผู้ใช้ 30 คน",
    budgetType: "Investment Budget",
    budgetCode: "26-23-ADM-075",
    purchaser: "INFRASTRUCTURE SYSTEM",
    items: [
      { description: "ไลเซนส์ · Microsoft · Teams Enterprise · รายปี 12 เดือน / 1 ผู้ใช้", qty: 30, unit: "ไลเซนส์", unit_price: 2350 },
    ],
    decisions: [{ level: "LV1", at: "2026-10-21 13:15" }],
  },
  {
    createdAt: "2026-10-26 14:20",
    requireDate: "2026-11-20",
    job: "อุปกรณ์และรางวัลการประกวด QCC ภายใน ครั้งที่ 2/2569",
    purpose: "ใช้ในการนำเสนอและมอบรางวัลทีม QCC 6 ทีม",
    budgetType: "Expense Budget",
    budgetCode: "26-99-1000-ACT-2-901-003-00",
    purchaser: "EDUCATION & TRAINING",
    items: [
      { description: "ถ้วยรางวัล · โลหะชุบทอง สูง 14 นิ้ว · พร้อมป้ายสลักชื่อ", qty: 3, unit: "ใบ", unit_price: 850 },
      { description: "ขาตั้งบอร์ดนำเสนอ · Flip Chart · ขนาด 70 x 100 ซม. ปรับระดับได้", qty: 6, unit: "ชุด", unit_price: 1290 },
      { description: "กระดาษชาร์ตและปากกาเคมี · คละสี · สำหรับ 6 ทีม", qty: 1, unit: "ชุด", unit_price: 1500 },
    ],
    decisions: [],
  },
  {
    createdAt: "2026-10-27 10:35",
    requireDate: "2026-11-30",
    job: "บัตรของขวัญรางวัลโครงการข้อเสนอแนะ ไตรมาส 3",
    purpose: "มอบให้พนักงาน 16 คนที่ข้อเสนอแนะผ่านการคัดเลือกและนำไปใช้จริง",
    budgetType: "Expense Budget",
    budgetCode: "26-99-1000-ACT-2-901-002-00",
    purchaser: "HR PLANNING & DEVELOPMENT",
    items: [
      { description: "บัตรของขวัญ · Central Gift Card · มูลค่า 500 บาท", qty: 16, unit: "ใบ", unit_price: 500 },
    ],
    decisions: [],
  },
];

function at(value: string): Date {
  return new Date(`${value.replace(" ", "T")}:00+07:00`);
}

// Apply the migrations under database/ that this database has not had yet.
async function applyMissingMigrations(): Promise<void> {
  for (const migration of MIGRATIONS) {
    const [rows] = "column" in migration
      ? await pool.query<RowDataPacket[]>(`SHOW COLUMNS FROM ${migration.table} LIKE ?`, [migration.column])
      : await pool.query<RowDataPacket[]>("SHOW TABLES LIKE ?", [migration.table]);
    if (rows.length) continue;
    console.log(`Applying database/${migration.file} ...`);
    const statements = fs.readFileSync(path.resolve(__dirname, "../../database", migration.file), "utf8")
      .split(";")
      .map((statement) => statement.replace(/^\s*--.*$/gm, "").trim())
      .filter((statement) => statement && !/^USE\s/i.test(statement));
    for (const statement of statements) await pool.query(statement);
  }
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

async function seedPr(pr: DemoPr): Promise<string> {
  const reservation = await reservePrNumber(REQUESTER);
  const prId = await createPr(
    {
      requester_id: REQUESTER,
      require_date: `${pr.requireDate} 00:00:00`,
      job_name: pr.job,
      purpose: pr.purpose,
      asset_type: pr.budgetType,
      budget_code: pr.budgetCode,
      vendor_name: pr.purchaser,
      items: pr.items,
    },
    reservation.reservation_id,
  );

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
  await applyMissingMigrations();
  await resetPrData();
  for (const pr of DEMO) await seedPr(pr);
  console.log(`\nSeeded ${DEMO.length} PRs for ${REQUESTER}. The next PR created on the website will be IT-${String(DEMO.length + 1).padStart(3, "0")}-PR.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
