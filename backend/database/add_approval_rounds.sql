USE pr_approval;

-- รอบการอนุมัติ: PR ที่ถูกปฏิเสธแล้วส่งใหม่ (resubmit) จะได้รอบใหม่และสายอนุมัติชุดใหม่
-- log ของรอบเก่ายังเก็บไว้เป็นประวัติ (เช่น เหตุผลที่ถูกปฏิเสธ) แต่สถานะ/PDF/กล่องรออนุมัติ
-- จะดูเฉพาะรอบปัจจุบัน (pr.approval_round)
ALTER TABLE pr
    ADD COLUMN approval_round INT UNSIGNED NOT NULL DEFAULT 1 AFTER status;

ALTER TABLE approval_log
    ADD COLUMN approval_round INT UNSIGNED NOT NULL DEFAULT 1 AFTER pr_id,
    ADD INDEX idx_approval_log_pr_round (pr_id, approval_round);
