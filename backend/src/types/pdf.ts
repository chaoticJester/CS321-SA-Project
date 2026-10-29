import type { ApprovalStepWithSignature } from "./approval";
import type { PrWithItems } from "./pr";

// Who created the PR, as printed in the document.
// (The PR's own fields, including หน่วยงาน = pr.line_name, come from `pr`.)
// Empty values are printed as "-".
export interface PdfRequester {
  employee_id: string;
  full_name: string;
  position: string | null;
  department: string | null;
  site: string | null;
}

// Everything the PDF renderer needs. Built from the DB in pdf.service.
export interface PrPdfData {
  company_name: string;
  generated_at: Date;
  pr: PrWithItems;
  requester: PdfRequester;
  approvals: ApprovalStepWithSignature[];
}
