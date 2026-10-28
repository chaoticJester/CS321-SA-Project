USE pr_approval;

-- รหัสงบประมาณที่เลือกในฟอร์ม (Basic Info) เช่น 26-23-ADM-072
-- PR เก่าที่สร้างก่อนมีคอลัมน์นี้เป็น NULL
ALTER TABLE pr
    ADD COLUMN budget_code VARCHAR(50) NULL AFTER asset_type;
