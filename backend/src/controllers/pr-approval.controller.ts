import { Response } from "express";
import { AuthedRequest } from "../middlewares/auth.middleware";
import {
  approvePr,
  rejectPr,
  getPrApprovalStatus,
  ApprovalError,
} from "../services/approval.service";

function sendError(res: Response, error: unknown, context: string): void {
  if (error instanceof ApprovalError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }
  console.error(`${context} error:`, error);
  res.status(500).json({ message: "Internal server error" });
}

// POST /api/pr/:id/approve   body: { "passcode": "123456" }
export async function approvePrController(req: AuthedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const result = await approvePr(req.params.id as string, req.user.sub);
    res.status(200).json({ message: "Approved successfully", ...result });
  } catch (error) {
    sendError(res, error, "approvePr");
  }
}

// POST /api/pr/:id/reject   body: { "reason": "..." }
export async function rejectPrController(req: AuthedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const reason: unknown = req.body?.reason;
  if (typeof reason !== "string" || reason.trim().length === 0 || reason.length > 255) {
    res.status(400).json({ message: "reason is required (max 255 characters)" });
    return;
  }

  try {
    await rejectPr(req.params.id as string, req.user.sub, reason.trim());
    res.status(200).json({ message: "Rejected successfully", pr_id: req.params.id });
  } catch (error) {
    sendError(res, error, "rejectPr");
  }
}

// GET /api/pr/:id/status
export async function getPrStatusController(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const status = await getPrApprovalStatus(req.params.id as string);
    res.status(200).json(status);
  } catch (error) {
    sendError(res, error, "getPrStatus");
  }
}