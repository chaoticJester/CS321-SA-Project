import { RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { ApprovalLevel, ApprovalLogRow, ApprovalStepWithSignature, ApproveResult, PrApprovalStatus, ResubmitResult } from '../types/approval';
import type { CreatePrInput } from '../types/pr';
import { calculatePrTotal } from '../utils/calculatePrTotal';
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
import { canEmployeeAccessPr, findPrById, updatePrForResubmit } from '../models/pr.model';
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

interface PreviewApproverRow extends RowDataPacket {
    employee_id: string;
    full_name: string;
    position: string | null;
    department: string | null;
    approval_level_id: string;
}

// The chain a new PR with this total would get, all still pending.
// Used by the draft PDF preview; nothing is written to approval_log.
export async function previewApprovalSteps(totalAmount: number, db: Queryable = pool): Promise<ApprovalStepWithSignature[]> {
    const chain = await getApprovalChain(totalAmount, db);
    if (chain.length === 0) {
        return [];
    }

    const [rows] = await db.query<PreviewApproverRow[]>(
        'SELECT employee_id, full_name, position, department, approval_level_id FROM employee WHERE approval_level_id IN (?)',
        [chain.map(level => level.level_id)]
    );
    const approversByLevel = new Map(rows.map(row => [row.approval_level_id, row]));

    return chain.flatMap(level => {
        const approver = approversByLevel.get(level.level_id);
        if (!approver) {
            return [];
        }
        return [{
            sequence_order: level.sequence_order,
            level_name: level.level_name,
            approver_id: approver.employee_id,
            approver_name: approver.full_name,
            position: approver.position,
            department: approver.department,
            status: 'pending' as const,
            comment: null,
            approved_at: null,
            signature_applied: false,
            signature_image: null,
        }];
    });
}

function generateLogId(): string {
    return `LOG${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

// approvalRound is 1 for a new PR and pr.approval_round for a resubmitted one.
export async function createApprovalLog(prId: string, chain: ApprovalLevel[], db: Queryable = pool, approvalRound = 1): Promise<void> {
    const alreadyExists = await hasApprovalLogs(prId, approvalRound, db);
    if (alreadyExists) {
        throw new Error(`Approval logs already exist for PR ID ${prId} round ${approvalRound}`);
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
            approval_round: approvalRound,
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

// Only the requester and the approvers in this PR's chain may see its status.
export async function getPrApprovalStatus(prId: string, employeeId: string): Promise<PrApprovalStatus> {
    const pr = await findPrById(prId);
    if (!pr) {
        throw new ApprovalError(404, 'PR not found');
    }
    if (!(await canEmployeeAccessPr(prId, employeeId))) {
        throw new ApprovalError(403, 'Cannot access this PR');
    }

    const chain = await findApprovalStatusByPrId(prId);

    return {
        pr_id: pr.pr_id,
        pr_no: pr.pr_no,
        pr_status: pr.status,
        approval_round: pr.approval_round,
        total: pr.total_amount,
        chain,
    };
}

// Requester edits a rejected PR and sends it again. In one transaction:
// update the PR + items, set it back to pending, and start the next approval
// round with a new chain for the new total (starting at Senior Chief again).
// Logs of earlier rounds are kept as history.
export async function resubmitPr(prId: string, requesterId: string, input: CreatePrInput): Promise<ResubmitResult> {
    const total = calculatePrTotal(input.items);
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const pr = await lockPrForApproval(prId, connection);
        if (!pr) {
            throw new ApprovalError(404, 'PR not found');
        }
        if (pr.requester_id !== requesterId) {
            throw new ApprovalError(403, 'Only the requester can resubmit this PR');
        }
        if (pr.status !== 'rejected') {
            throw new ApprovalError(409, `Only a rejected PR can be resubmitted (this PR is ${pr.status})`);
        }

        const approvalRound = await updatePrForResubmit(connection, prId, input);
        const chain = await getApprovalChain(total, connection);
        await createApprovalLog(prId, chain, connection, approvalRound);

        const [rows] = await connection.query<RowDataPacket[]>('SELECT pr_no FROM pr WHERE pr_id = ?', [prId]);

        await connection.commit();

        return {
            pr_id: prId,
            pr_no: String(rows[0]?.pr_no),
            approval_round: approvalRound,
            total,
            levels: chain.map(level => level.level_name),
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
