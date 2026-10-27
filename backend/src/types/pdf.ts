import type { ApprovalStepWithSignature } from "./approval";
import type { PrWithItems } from "./pr";

// Who created the PR, as printed in the document.
// site / line are not stored in the DB yet -> null (printed as "-").
export interface PdfRequester {
  employee_id: string;
  full_name: string;
  position: string | null;
  department: string | null;
  site: string | null;
  line: string | null;
}

// Fields in the PR design that the `pr` table does not store yet.
// They are null for now and printed as "-"; fill them in buildPrPdfData
// once the columns exist.
export interface PdfExtraFields {
  main_group: string | null;
  budget_type: string | null;
  budget_code: string | null;
  budget_description: string | null;
  remark: string | null;
  purchaser_section: string | null;
}

// Everything the PDF renderer needs. Built from the DB in pdf.service.
export interface PrPdfData {
  company_name: string;
  generated_at: Date;
  pr: PrWithItems;
  requester: PdfRequester;
  extra: PdfExtraFields;
  approvals: ApprovalStepWithSignature[];
}
