import fs from "fs";
import os from "os";
import path from "path";
import { generatePrPdf, renderPrPdf } from "../services/pdf.service";
import type { ApprovalAction, ApprovalStepWithSignature } from "../types/approval";
import type { PrPdfData } from "../types/pdf";
import type { PrStatus } from "../types/pr";
import type { PrItemRow } from "../types/pr";

// Render a PR document to a PDF file so the layout can be checked by eye.
//
//   npx tsx src/scripts/try-pdf.ts           sample data, waiting for the 2nd approver (no DB needed)
//   npx tsx src/scripts/try-pdf.ts approved  sample data, fully approved (all signatures)
//   npx tsx src/scripts/try-pdf.ts rejected  sample data, rejected at the 3rd approver
//   npx tsx src/scripts/try-pdf.ts long      sample data with many items (page breaks)
//   npx tsx src/scripts/try-pdf.ts PR0001    real PR from the database

const SAMPLE_ITEMS: PrItemRow[] = [
  { item_id: "ITM0001", pr_id: "PR-SAMPLE", description: "Notebook Dell รุ่นตัวอย่าง", qty: 2, unit: "เครื่อง", unit_price: "25000.00" },
  { item_id: "ITM0002", pr_id: "PR-SAMPLE", description: "จอภาพขนาด 24 นิ้ว", qty: 2, unit: "เครื่อง", unit_price: "3500.00" },
  {
    item_id: "ITM0003",
    pr_id: "PR-SAMPLE",
    description: "เมาส์ไร้สายและคีย์บอร์ดภาษาไทย-อังกฤษ สำหรับพนักงานฝ่ายพัฒนาระบบที่ทำงานแบบไฮบริด (Logitech MK295)",
    qty: 4,
    unit: "ชุด",
    unit_price: "1290.50",
  },
];

type Scenario = "pending" | "approved" | "rejected";

// Approvers from seed_data.sql (signature files in assets/signatures).
const SAMPLE_APPROVERS = [
  { level: "Senior Chief", id: "E0018", name: "Mr. B" },
  { level: "Manager", id: "E0017", name: "Mr. C" },
  { level: "Deputy General Manager", id: "E0015", name: "Mr. D" },
  { level: "General Manager", id: "E0010", name: "Mr. E" },
];

function sampleApprovals(scenario: Scenario): ApprovalStepWithSignature[] {
  const statuses: Record<Scenario, ApprovalAction[]> = {
    pending: ["approved", "pending", "pending", "pending"],
    approved: ["approved", "approved", "approved", "approved"],
    rejected: ["approved", "approved", "rejected", "cancelled"],
  };

  return SAMPLE_APPROVERS.map((approver, i) => {
    const status = statuses[scenario][i]!;
    const done = status === "approved" || status === "rejected";
    return {
      sequence_order: i + 1,
      level_name: approver.level,
      approver_id: approver.id,
      approver_name: approver.name,
      position: approver.level,
      department: "IT Department",
      status,
      comment: status === "rejected" ? "ราคาสูงกว่างบประมาณที่ตั้งไว้ กรุณาขอใบเสนอราคาเพิ่มอีก 2 ราย & แนบมาใหม่" : null,
      approved_at: done ? new Date(Date.UTC(2026, 8, 21 + i, 3, 24)) : null,
      signature_applied: status === "approved",
      signature_image: `/signatures/${approver.id.toLowerCase()}.png`,
    };
  });
}

function sampleData(itemCount: number, scenario: Scenario = "pending"): PrPdfData {
  const items: PrItemRow[] = [];
  for (let i = 0; i < itemCount; i++) {
    const base = SAMPLE_ITEMS[i % SAMPLE_ITEMS.length]!;
    items.push({ ...base, item_id: `ITM${String(i + 1).padStart(4, "0")}` });
  }

  return {
    company_name: "บริษัทตัวอย่าง จำกัด",
    generated_at: new Date(),
    approvals: sampleApprovals(scenario),
    pr: {
      pr_id: "PR-SAMPLE",
      pr_no: "IT-026-PR",
      requester_id: "E0020",
      require_date: new Date("2026-09-30T00:00:00Z"),
      job_name: "จัดซื้อคอมพิวเตอร์และจอภาพ",
      purpose:
        "ทดแทนเครื่องเดิมที่ใช้งานมานานกว่าห้าปี เครื่องเดิมทำงานช้าและไม่รองรับซอฟต์แวร์รุ่นใหม่ที่ฝ่ายเทคโนโลยีสารสนเทศต้องใช้ในการพัฒนาระบบภายในองค์กร",
      asset_type: "Office Supply",
      vendor_name: "บริษัท ABC จำกัด",
      status: scenario as PrStatus,
      created_at: new Date("2026-09-20T09:00:00+07:00"),
      items,
      attachments: [],
      total_amount: items.reduce((sum, item) => sum + item.qty * Number(item.unit_price), 0),
    },
    requester: {
      employee_id: "E0020",
      full_name: "Amika Rattanakul",
      position: "IT Support",
      department: "Technology Development",
      site: null,
      line: null,
    },
    extra: {
      main_group: null,
      budget_type: null,
      budget_code: null,
      budget_description: null,
      remark: null,
      purchaser_section: null,
    },
  };
}

async function main() {
  const arg = process.argv[2];
  let pdf: Buffer | null;

  if (!arg || arg === "long") {
    pdf = await renderPrPdf(sampleData(arg === "long" ? 45 : 3));
  } else if (arg === "approved" || arg === "rejected") {
    pdf = await renderPrPdf(sampleData(3, arg));
  } else {
    pdf = await generatePrPdf(arg);
    if (!pdf) {
      console.error("PR not found:", arg);
      process.exit(1);
    }
  }

  const outPath = path.join(os.tmpdir(), `try-pdf${arg ? `-${arg}` : ""}.pdf`);
  fs.writeFileSync(outPath, pdf);
  console.log("PDF written to:", outPath);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
