import fs from "fs";
import os from "os";
import path from "path";
import PDFDocument from "pdfkit";
import { wrapThaiText } from "../utils/thaiText";

// Quick check that pdfkit + Sarabun render Thai correctly:
// stacked vowels / tone marks must not overlap, and long Thai text
// must wrap between words (not in the middle of a word).
// Run: npx tsx src/scripts/try-pdf.ts

const FONT_DIR = path.resolve(__dirname, "../../assets/fonts");
const outPath = path.join(os.tmpdir(), "try-pdf.pdf");

const doc = new PDFDocument({ size: "A4", margin: 50 });
doc.pipe(fs.createWriteStream(outPath));

doc.registerFont("Sarabun", path.join(FONT_DIR, "Sarabun-Regular.ttf"));
doc.registerFont("Sarabun-Bold", path.join(FONT_DIR, "Sarabun-Bold.ttf"));

doc.font("Sarabun-Bold").fontSize(20).text("ใบขอสั่งซื้อ (Purchase Requisition)");
doc.moveDown();

doc.font("Sarabun").fontSize(14);
doc.text("สระบน/ล่าง + วรรณยุกต์: ที่ นี่ ผู้ใช้ กุ้ง ปู่ ญี่ปุ่น ฐาน ฎีกา");
doc.text("วรรณยุกต์ซ้อน: น้ำ ก็ ปี่ ปู้ ตั๋ว เกี๊ยว ผู้ที่ได้รับอนุมัติ");
doc.text("ตัวเลขและเงิน: ๑๒๓ 110,000.00 บาท");
doc.text("ภาษาอังกฤษปน: Notebook HP 15s-fq5 จำนวน 5 เครื่อง");
doc.moveDown();

const longText =
  "ข้อความยาวเพื่อทดสอบการตัดบรรทัด: ผู้ขอซื้อต้องการจัดซื้อคอมพิวเตอร์โน้ตบุ๊กสำหรับพนักงานฝ่ายเทคโนโลยีสารสนเทศเพื่อใช้ในการพัฒนาระบบภายในองค์กรและรองรับการทำงานจากที่บ้าน";

doc.font("Sarabun-Bold").text("pdfkit ตัดบรรทัดเอง (คำขาดกลาง):");
doc.font("Sarabun").text(longText, { width: 300 });
doc.moveDown();

doc.font("Sarabun-Bold").text("ใช้ wrapThaiText (ตัดตามคำ):");
doc.font("Sarabun");
// Lines already fit, so joining with "\n" lets pdfkit lay them out as-is.
doc.text(wrapThaiText(doc, longText, 300).join("\n"), { width: 300 });

doc.end();
console.log("PDF written to:", outPath);
