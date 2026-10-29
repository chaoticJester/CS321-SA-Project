export interface ApprovalLevel {
    level_id: string;
    level_name: string;
    sequence_order: number;
    limit_amount: number | null;
}

export type ApprovalAction = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ApprovalLogRow {
    log_id: string;
    pr_id: string;
    approval_round: number;
    approver_id: string;
    level_id: string;
    job_action: ApprovalAction;
    comment: string | null;
    signature_applied: boolean;
    approved_at: Date | null;
    created_at: Date;
}

export interface PendingLogRow extends ApprovalLogRow {
    level_name: string;
}

export interface ApprovalStatusStep {
    sequence_order: number;
    level_name: string;
    approver_id: string;
    approver_name: string;
    position: string | null;
    department: string | null;
    status: ApprovalAction;
    comment: string | null;
    approved_at: Date | null;
}

// An approval step plus the signature fields the PDF needs.
export interface ApprovalStepWithSignature extends ApprovalStatusStep {
    signature_applied: boolean;
    signature_image: string | null;
}

export interface PrApprovalStatus {
    pr_id: string;
    pr_no: string;
    pr_status: string;
    // 1 for the first submission, +1 every time a rejected PR is resubmitted.
    approval_round: number;
    total: number;
    chain: ApprovalStatusStep[];
}

export interface ApproveResult {
    pr_id: string;
    current_level: string;
    is_final: boolean;
}

export interface ResubmitResult {
    pr_id: string;
    pr_no: string;
    approval_round: number;
    total: number;
    // Level names of the new chain, in order.
    levels: string[];
}
