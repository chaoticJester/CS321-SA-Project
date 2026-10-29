USE pr_approval;

-- ข้อมูลจากฟอร์มสร้าง PR ที่ก่อนหน้านี้ไม่ได้บันทึก (แสดงในใบขอซื้อ PDF)
-- PR เก่าที่สร้างก่อนมีคอลัมน์เหล่านี้เป็น NULL และ PDF จะแสดง "-"
ALTER TABLE pr
    ADD COLUMN main_group         VARCHAR(100) NULL AFTER asset_type,
    ADD COLUMN budget_type        VARCHAR(50)  NULL AFTER main_group,
    ADD COLUMN budget_description VARCHAR(255) NULL AFTER budget_code,
    ADD COLUMN line_name          VARCHAR(150) NULL AFTER budget_description,
    ADD COLUMN remark             VARCHAR(500) NULL AFTER line_name,
    ADD COLUMN purchaser_section  VARCHAR(100) NULL AFTER remark;

-- สาขาของพนักงาน (แสดงในหัวข้อข้อมูลผู้ขอซื้อของ PDF)
ALTER TABLE employee
    ADD COLUMN site VARCHAR(100) NULL AFTER department;

-- พนักงานใน seed_data.sql อยู่สำนักงานใหญ่ทั้งหมด
UPDATE employee SET site = 'สำนักงานใหญ่' WHERE site IS NULL;
