export interface ApprovalLevel {
    level_id: string;
    level_name: string;
    sequence_order: number;
    limit_amount: number | null;
}

export type ApprovalAction = 'pending' | 'approved' | 'rejected';

export interface ApprovalLogRow {
    log_id: string;
    pr_id: string;
    approver_id: string;
    level_id: string;
    job_action: ApprovalAction;
    comment: string | null;
    signature_applied: boolean;
    approved_at: Date | null;
    created_at: Date;
}