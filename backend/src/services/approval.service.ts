import { RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { ApprovalLevel, ApprovalLogRow, ApproveResult, PrApprovalStatus } from '../types/approval';
import crypto from 'crypto';
import {
    insertApprovalLogs,
    findNextPendingLog,
    hasApprovalLogs,
    lockPrForApproval,
    markLogApproved,
    markLogRejected,
    cancelRemainingLogs,
    updatePrStatus,
    findApprovalStatusByPrId,
} from '../models/prApprovalLog.model';
import { findPrById } from '../models/pr.model';
import { Queryable } from '../types/db';

interface ApprovalLevelRow extends RowDataPacket, ApprovalLevel {}

async function getAllApprovalLevels(db: Queryable = pool): Promise<ApprovalLevel[]> {
    const [rows] = await db.query<ApprovalLevelRow[]>(
        'SELECT * FROM approval_level ORDER BY sequence_order ASC'
    );
    return rows;
}

export async function getApprovalChain(totalAmount: number, db: Queryable = pool): Promise<ApprovalLevel[]> {
    const levels = await getAllApprovalLevels(db);
    const chain: ApprovalLevel[] = [];

    for (const level of levels) {
        const limitAmount = level.limit_amount === null ? null : Number(level.limit_amount);
        chain.push(level);

        if (level.sequence_order === 1) {
            continue;
        }

        if (limitAmount === null) {
            break;
        }

        if (limitAmount >= totalAmount) {
            break;
        }
    }

    return chain;
}

interface EmployeeLevelRow extends RowDataPacket {
    employee_id: string;
    approval_level_id: string;
}

async function getApproversForChain(chain: ApprovalLevel[], db: Queryable = pool): Promise<Map<string, string>> {
    const levelIds = chain.map(level => level.level_id);

    const [rows] = await db.query<EmployeeLevelRow[]>(
        'SELECT employee_id, approval_level_id FROM employee WHERE approval_level_id IN (?)', [levelIds]
    );

    const approversByLevel = new Map<string, string>();
    for (const row of rows) {
        approversByLevel.set(row.approval_level_id, row.employee_id);
    }

    return approversByLevel;
}

function generateLogId(): string {
    return `LOG${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

export async function createApprovalLog(prId: string, chain: ApprovalLevel[], db: Queryable = pool): Promise<void> {
    const alreadyExists = await hasApprovalLogs(prId, db);
    if (alreadyExists) {
        throw new Error(`Approval logs already exist for PR ID ${prId}`);
    }
    
    const approversByLevel = await getApproversForChain(chain, db);

    const logs = chain.map(level => {
        const approverId = approversByLevel.get(level.level_id);
        if (!approverId) {
            throw new Error(`No approver found for level ${level.level_id}`);
        }
        return {
            log_id: generateLogId(),
            pr_id: prId,
            approver_id: approverId,
            level_id: level.level_id,
        };
    });

    await insertApprovalLogs(logs, db);
}

export async function getNextApprover(prId: string): Promise<ApprovalLogRow | null> {
    return findNextPendingLog(prId);
}

export class ApprovalError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.name = 'ApprovalError';
        this.statusCode = statusCode;
    }
}

export async function approvePr(prId: string, approverId: string): Promise<ApproveResult> {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const pr = await lockPrForApproval(prId, connection);
        if (!pr) {
            throw new ApprovalError(404, 'PR not found');
        }
        if (pr.status !== 'pending') {
            throw new ApprovalError(409, `PR is already ${pr.status}`);
        }

        const currentLog = await findNextPendingLog(prId, connection);
        if (!currentLog) {
            throw new ApprovalError(409, 'No pending approval step for this PR');
        }
        if (currentLog.approver_id !== approverId) {
            throw new ApprovalError(403, 'It is not your turn to approve this PR');
        }

        await markLogApproved(currentLog.log_id, connection);

        const nextLog = await findNextPendingLog(prId, connection);
        const isFinal = nextLog === null;

        if (isFinal) {
            await updatePrStatus(prId, 'approved', connection);
        
        } else {
            
        }

        await connection.commit();

        return {
            pr_id: prId,
            current_level: currentLog.level_name,
            is_final: isFinal,
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function rejectPr(prId: string, approverId: string, reason: string): Promise<void> {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const pr = await lockPrForApproval(prId, connection);
        if (!pr) {
            throw new ApprovalError(404, 'PR not found');
        }
        if (pr.status !== 'pending') {
            throw new ApprovalError(409, `PR is already ${pr.status}`);
        }

        const currentLog = await findNextPendingLog(prId, connection);
        if (!currentLog) {
            throw new ApprovalError(409, 'No pending approval step for this PR');
        }
        if (currentLog.approver_id !== approverId) {
            throw new ApprovalError(403, 'It is not your turn to review this PR');
        }

        await markLogRejected(currentLog.log_id, reason, connection);
        await cancelRemainingLogs(prId, connection);
        await updatePrStatus(prId, 'rejected', connection);
        

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function getPrApprovalStatus(prId: string): Promise<PrApprovalStatus> {
    const pr = await findPrById(prId);
    if (!pr) {
        throw new ApprovalError(404, 'PR not found');
    }

    const chain = await findApprovalStatusByPrId(prId);

    return {
        pr_id: pr.pr_id,
        pr_no: pr.pr_no,
        pr_status: pr.status,
        total: pr.total_amount,
        chain,
    };
}