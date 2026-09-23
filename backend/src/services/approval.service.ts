import { RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { ApprovalLevel, ApprovalLogRow } from '../types/approval';
import crypto from 'crypto';
import { insertApprovalLogs, findNextPendingLog, hasApprovalLogs } from '../models/prApprovalLog.model';
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