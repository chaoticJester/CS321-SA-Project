import { Response } from "express";
import { findEmployeeById } from "../models/employee.model";
import { AuthedRequest } from "../middlewares/auth.middleware";
import { findPendingApprovalsForEmployee } from "../models/employee.model";
import { findApprovalHistoryForEmployee } from "../models/employee.model";

export async function getEmployeeById(req: AuthedRequest, res: Response) {
  try {
    const id  = req.params.id as string;

    const employee = await findEmployeeById(id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const { passcode_hash, ...safeEmployee } = employee;

    return res.json(safeEmployee);
  } catch (err) {
    console.error("getEmployeeById error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}


export async function getPendingApprovals(req: AuthedRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const items = await findPendingApprovalsForEmployee(id);
    return res.json(items);
  } catch (err) {
    console.error("getPendingApprovals error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getApprovalHistory(req: AuthedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.params.id !== req.user.sub) return res.status(403).json({ message: "Cannot access another employee's approval history" });
  try {
    return res.json(await findApprovalHistoryForEmployee(req.user.sub));
  } catch (error) {
    console.error("getApprovalHistory error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
