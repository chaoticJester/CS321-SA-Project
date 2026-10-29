export type PrStatus = "pending" | "approved" | "rejected";

export interface PrItemInput {
  description: string;
  qty: number;
  unit?: string;
  unit_price: number;
}

export interface CreatePrInput {
  requester_id: string;
  require_date: string;
  job_name?: string;
  purpose?: string;
  asset_type?: string;
  main_group?: string;
  budget_type?: string;
  budget_code?: string;
  budget_description?: string;
  line_name?: string;
  remark?: string;
  purchaser_section?: string;
  vendor_name?: string;
  items: PrItemInput[];
}

export interface PrRow {
  pr_id: string;
  pr_no: string;
  requester_id: string;
  require_date: Date;
  job_name: string | null;
  purpose: string | null;
  asset_type: string | null;
  main_group: string | null;
  budget_type: string | null;
  budget_code: string | null;
  budget_description: string | null;
  line_name: string | null;
  remark: string | null;
  purchaser_section: string | null;
  vendor_name: string | null;
  status: PrStatus;
  // 1 for the first submission, +1 every time a rejected PR is resubmitted.
  approval_round: number;
  created_at: Date;
}

export interface PrItemRow {
  item_id: string;
  pr_id: string;
  description: string;
  qty: number;
  unit: string | null;
  unit_price: string;
}

export interface PrWithItems extends PrRow {
  items: PrItemRow[];
  attachments: PrAttachment[];
  total_amount: number;
}

export interface PrListItem {
  pr_id: string;
  pr_no: string;
  requester_id: string;
  require_date: Date;
  job_name: string | null;
  purpose: string | null;
  asset_type: string | null;
  vendor_name: string | null;
  status: PrStatus;
  created_at: Date;
  total_amount: number;
}

export interface PrListResult {
  data: PrListItem[];
  total: number;
}

export interface PrAttachment {
  attachment_id: string;
  pr_id: string;
  file_type: string | null;
  file_path: string;
  // Name of the file when it was uploaded; null for rows from before it was stored.
  file_name: string | null;
  uploaded_at: Date;
}
