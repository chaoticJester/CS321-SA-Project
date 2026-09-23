import { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "../config/db";
import { ApprovalLogRow } from "../types/approval";
import {Queryable} from "../types/db";

interface ApprovalLogDbRow extends RowDataPacket, ApprovalLogRow {}

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

export async function findNextPendingLog(prId: string): Promise<ApprovalLogRow | null> {
    const [rows] = await pool.query<ApprovalLogDbRow[]>(
        'SELECT al.* FROM approval_log al JOIN approval_level lvl ON al.level_id = lvl.level_id WHERE al.pr_id = ? AND al.job_action = "pending" ORDER BY lvl.sequence_order ASC LIMIT 1', [prId]
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
