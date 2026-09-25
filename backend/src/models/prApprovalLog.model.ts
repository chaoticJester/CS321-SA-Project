import { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../config/db";
import { ApprovalLogRow, ApprovalStatusStep, PendingLogRow } from "../types/approval";
import { Queryable } from "../types/db";
import { PrStatus } from "../types/pr";

interface ApprovalLogDbRow extends RowDataPacket, ApprovalLogRow {}
interface PendingLogDbRow extends RowDataPacket, PendingLogRow {}
interface ApprovalStatusDbRow extends RowDataPacket, ApprovalStatusStep {}
interface PrLockRow extends RowDataPacket {
    pr_id: string;
    status: PrStatus;
}

export interface NewApprovalLogInput {
    log_id: string;
    pr_id: string;
    approver_id: string;
    level_id: string;
}

export async function insertApprovalLogs(logs: NewApprovalLogInput[], db: Queryable = pool): Promise<void> {
    if (logs.length === 0) {
        return;
    }

    const values = logs.map(log => [
        log.log_id,
        log.pr_id,
        log.approver_id,
        log.level_id,
        'pending',
    ]);

    await db.query('INSERT INTO approval_log (log_id, pr_id, approver_id, level_id, job_action) VALUES ?', [values]);
}

export async function findNextPendingLog(prId: string, db: Queryable = pool): Promise<PendingLogRow | null> {
    const [rows] = await db.query<PendingLogDbRow[]>(
        `SELECT al.*, lvl.level_name
         FROM approval_log al
         JOIN approval_level lvl ON al.level_id = lvl.level_id
         WHERE al.pr_id = ? AND al.job_action = 'pending'
         ORDER BY lvl.sequence_order ASC
         LIMIT 1`,
        [prId]
    );
    return rows[0] ?? null;
}

export async function hasApprovalLogs(prId: string, db: Queryable = pool): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT 1 FROM approval_log WHERE pr_id = ? LIMIT 1`,
    [prId]
  );
  return rows.length > 0;
}

export async function lockPrForApproval(prId: string, db: Queryable): Promise<PrLockRow | null> {
    const [rows] = await db.query<PrLockRow[]>(
        'SELECT pr_id, status FROM pr WHERE pr_id = ? FOR UPDATE',
        [prId]
    );
    return rows[0] ?? null;
}

export async function markLogApproved(logId: string, db: Queryable = pool): Promise<void> {
    const [result] = await db.query<ResultSetHeader>(
        `UPDATE approval_log
         SET job_action = 'approved', approved_at = NOW(), signature_applied = TRUE
         WHERE log_id = ? AND job_action = 'pending'`,
        [logId]
    );
    if (result.affectedRows !== 1) {
        throw new Error(`Could not approve log ${logId}`);
    }
}

export async function markLogRejected(logId: string, comment: string, db: Queryable = pool): Promise<void> {
    const [result] = await db.query<ResultSetHeader>(
        `UPDATE approval_log
         SET job_action = 'rejected', comment = ?, approved_at = NOW()
         WHERE log_id = ? AND job_action = 'pending'`,
        [comment, logId]
    );
    if (result.affectedRows !== 1) {
        throw new Error(`Could not reject log ${logId}`);
    }
}

export async function cancelRemainingLogs(prId: string, db: Queryable = pool): Promise<void> {
    await db.query(
        `UPDATE approval_log SET job_action = 'cancelled'
         WHERE pr_id = ? AND job_action = 'pending'`,
        [prId]
    );
}

export async function updatePrStatus(prId: string, status: PrStatus, db: Queryable = pool): Promise<void> {
    await db.query('UPDATE pr SET status = ? WHERE pr_id = ?', [status, prId]);
}

export async function findApprovalStatusByPrId(prId: string, db: Queryable = pool): Promise<ApprovalStatusStep[]> {
    const [rows] = await db.query<ApprovalStatusDbRow[]>(
        `SELECT
            lvl.sequence_order,
            lvl.level_name,
            al.approver_id,
            e.full_name AS approver_name,
            e.position,
            e.department,
            al.job_action AS status,
            al.comment,
            al.approved_at
         FROM approval_log al
         JOIN approval_level lvl ON lvl.level_id = al.level_id
         JOIN employee e ON e.employee_id = al.approver_id
         WHERE al.pr_id = ?
         ORDER BY lvl.sequence_order ASC`,
        [prId]
    );
    return rows;
}