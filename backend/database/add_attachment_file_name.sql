USE pr_approval;

-- ชื่อไฟล์เดิมตอนอัปโหลด (file_path เป็นชื่อสุ่มที่เก็บในโฟลเดอร์ uploads)
-- แถวเก่าเป็น NULL และหน้าเว็บจะแสดง file_path แทน
ALTER TABLE attachment
    ADD COLUMN file_name VARCHAR(255) NULL AFTER file_path;
