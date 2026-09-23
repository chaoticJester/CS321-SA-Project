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
  vendor_name: string | null;
  status: PrStatus;
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
  total_amount: number;
}