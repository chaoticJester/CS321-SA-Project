import { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../config/db";
import { ApprovalLogRow, ApprovalStatusStep, ApprovalStepWithSignature, PendingLogRow } from "../types/approval";
import { Queryable } from "../types/db";
import { PrStatus } from "../types/pr";

interface ApprovalLogDbRow extends RowDataPacket, ApprovalLogRow {}
interface PendingLogDbRow extends RowDataPacket, PendingLogRow {}
interface ApprovalStatusDbRow extends RowDataPacket, ApprovalStatusStep {}
interface ApprovalStepWithSignatureDbRow extends RowDataPacket, Omit<ApprovalStepWithSignature, "signature_applied"> {
    signature_applied: number | boolean;
}
interface PrLockRow extends RowDataPacket {
    pr_id: string;
    requester_id: string;
    status: PrStatus;
    approval_round: number;
}

export interface NewApprovalLogInput {
    log_id: string;
    pr_id: string;
    approval_round: number;
    approver_id: string;
    level_id: string;
}

// Every query about "the" chain of a PR only looks at its current round
// (pr.approval_round). Logs of earlier rounds stay as history.

export async function insertApprovalLogs(logs: NewApprovalLogInput[], db: Queryable = pool): Promise<void> {
    if (logs.length === 0) {
        return;
    }

    const values = logs.map(log => [
        log.log_id,
        log.pr_id,
        log.approval_round,
        log.approver_id,
        log.level_id,
        'pending',
    ]);

    await db.query('INSERT INTO approval_log (log_id, pr_id, approval_round, approver_id, level_id, job_action) VALUES ?', [values]);
}

export async function findNextPendingLog(prId: string, db: Queryable = pool): Promise<PendingLogRow | null> {
    const [rows] = await db.query<PendingLogDbRow[]>(
        `SELECT al.*, lvl.level_name
         FROM approval_log al
         JOIN approval_level lvl ON al.level_id = lvl.level_id
         JOIN pr ON pr.pr_id = al.pr_id
         WHERE al.pr_id = ? AND al.job_action = 'pending'
           AND al.approval_round = pr.approval_round
         ORDER BY lvl.sequence_order ASC
         LIMIT 1`,
        [prId]
    );
    return rows[0] ?? null;
}

export async function hasApprovalLogs(prId: string, approvalRound: number, db: Queryable = pool): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT 1 FROM approval_log WHERE pr_id = ? AND approval_round = ? LIMIT 1`,
    [prId, approvalRound]
  );
  return rows.length > 0;
}

export async function lockPrForApproval(prId: string, db: Queryable): Promise<PrLockRow | null> {
    const [rows] = await db.query<PrLockRow[]>(
        'SELECT pr_id, requester_id, status, approval_round FROM pr WHERE pr_id = ? FOR UPDATE',
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
        `UPDATE approval_log al
         JOIN pr ON pr.pr_id = al.pr_id
         SET al.job_action = 'cancelled'
         WHERE al.pr_id = ? AND al.job_action = 'pending'
           AND al.approval_round = pr.approval_round`,
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
         JOIN pr ON pr.pr_id = al.pr_id
         WHERE al.pr_id = ? AND al.approval_round = pr.approval_round
         ORDER BY lvl.sequence_order ASC`,
        [prId]
    );
    return rows;
}

// Same rows and order as findApprovalStatusByPrId (what the website shows),
// plus the signature fields the PDF needs. Kept separate so GET /status does
// not expose signature file paths.
export async function findApprovalStepsWithSignature(prId: string, db: Queryable = pool): Promise<ApprovalStepWithSignature[]> {
    const [rows] = await db.query<ApprovalStepWithSignatureDbRow[]>(
        `SELECT
            lvl.sequence_order,
            lvl.level_name,
            al.approver_id,
            e.full_name AS approver_name,
            e.position,
            e.department,
            al.job_action AS status,
            al.comment,
            al.approved_at,
            al.signature_applied,
            e.signature_image
         FROM approval_log al
         JOIN approval_level lvl ON lvl.level_id = al.level_id
         JOIN employee e ON e.employee_id = al.approver_id
         JOIN pr ON pr.pr_id = al.pr_id
         WHERE al.pr_id = ? AND al.approval_round = pr.approval_round
         ORDER BY lvl.sequence_order ASC`,
        [prId]
    );
    // MySQL BOOLEAN comes back as 0 / 1.
    return rows.map((row) => ({ ...row, signature_applied: Boolean(row.signature_applied) }));
}
