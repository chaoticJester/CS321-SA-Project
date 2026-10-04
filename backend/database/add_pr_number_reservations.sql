USE pr_approval;

-- เก็บลำดับล่าสุดที่ออกให้ผู้ใช้
CREATE TABLE pr_number_counter (
    counter_name    VARCHAR(30) NOT NULL,
    last_sequence   BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (counter_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- เริ่มตัวนับจากเลข PR สูงสุดที่มีอยู่แล้ว
-- หากไม่มี PR ให้เริ่มที่ 0
INSERT INTO pr_number_counter (counter_name, last_sequence)
SELECT
    'pr',
    COALESCE(
        MAX(
            CAST(
                SUBSTRING_INDEX(
                    SUBSTRING_INDEX(pr_no, '-', 2),
                    '-',
                    -1
                ) AS UNSIGNED
            )
        ),
        0
    )
FROM pr
WHERE pr_no REGEXP '^IT-[0-9]+-PR$';

-- เก็บว่าเลขไหนถูกจองโดยใคร และใช้สร้าง PR แล้วหรือยัง
CREATE TABLE pr_number_reservation (
    reservation_id  VARCHAR(36) NOT NULL,
    pr_no           VARCHAR(30) NOT NULL,
    requester_id    VARCHAR(20) NOT NULL,
    used_at         DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (reservation_id),
    UNIQUE KEY uq_pr_reservation_no (pr_no),

    CONSTRAINT fk_pr_reservation_requester
        FOREIGN KEY (requester_id)
        REFERENCES employee(employee_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;