CREATE DATABASE IF NOT EXISTS pr_approval
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE pr_approval;

CREATE TABLE approval_level (
    level_id        VARCHAR(20)     NOT NULL,
    level_name      VARCHAR(100)    NOT NULL,
    sequence_order  INT             NOT NULL,
    limit_amount    DECIMAL(15,2)   NULL,     
    PRIMARY KEY (level_id),
    UNIQUE KEY uq_approval_level_sequence (sequence_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE employee (
    employee_id         VARCHAR(20)     NOT NULL,
    full_name           VARCHAR(150)    NOT NULL,
    position             VARCHAR(100)    NULL,
    department          VARCHAR(100)    NULL,
    approval_level_id   VARCHAR(20)     NULL,      
    passcode_hash        VARCHAR(255)    NOT NULL, 
    signature_image      VARCHAR(255)    NULL,     
    PRIMARY KEY (employee_id),
    CONSTRAINT fk_employee_approval_level
        FOREIGN KEY (approval_level_id) REFERENCES approval_level(level_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pr (
    pr_id           VARCHAR(20)     NOT NULL,
    pr_no           VARCHAR(30)     NOT NULL,      
    requester_id    VARCHAR(20)     NOT NULL,
    require_date    DATETIME        NOT NULL,
    job_name        VARCHAR(150)    NULL,
    purpose         VARCHAR(255)    NULL,
    asset_type      VARCHAR(100)    NULL,
    vendor_name     VARCHAR(150)    NULL,
    status          VARCHAR(30)     NOT NULL DEFAULT 'pending',  
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (pr_id),
    UNIQUE KEY uq_pr_no (pr_no),
    CONSTRAINT fk_pr_requester
        FOREIGN KEY (requester_id) REFERENCES employee(employee_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pr_item (
    item_id       VARCHAR(20)     NOT NULL,
    pr_id         VARCHAR(20)     NOT NULL,
    description   VARCHAR(255)    NOT NULL,
    qty           INT             NOT NULL,
    unit          VARCHAR(30)     NULL,
    unit_price    DECIMAL(15,2)   NOT NULL,
    PRIMARY KEY (item_id),
    CONSTRAINT fk_pr_item_pr
        FOREIGN KEY (pr_id) REFERENCES pr(pr_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE           
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE attachment (
    attachment_id   VARCHAR(20)     NOT NULL,
    pr_id           VARCHAR(20)     NOT NULL,
    file_type       VARCHAR(50)     NULL,          
    file_path       VARCHAR(255)    NOT NULL,
    uploaded_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (attachment_id),
    CONSTRAINT fk_attachment_pr
        FOREIGN KEY (pr_id) REFERENCES pr(pr_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE approval_log (
    log_id              VARCHAR(20)     NOT NULL,
    pr_id               VARCHAR(20)     NOT NULL,
    approver_id         VARCHAR(20)     NOT NULL,
    level_id            VARCHAR(20)     NOT NULL,
    job_action          VARCHAR(30)     NOT NULL,  
    comment             VARCHAR(255)    NULL,
    signature_applied   BOOLEAN         NOT NULL DEFAULT FALSE,
    approved_at         DATETIME        NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (log_id),
    CONSTRAINT fk_approval_log_pr
        FOREIGN KEY (pr_id) REFERENCES pr(pr_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_approval_log_employee
        FOREIGN KEY (approver_id) REFERENCES employee(employee_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_approval_log_level
        FOREIGN KEY (level_id) REFERENCES approval_level(level_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;