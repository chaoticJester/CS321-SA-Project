import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { AuthedRequest } from "./auth.middleware";
import { findEmployeeById } from "../models/employee.model";

const PASSCODE_PATTERN = /^\d{6}$/;

export async function verifyPasscode(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const passcode: unknown = req.body?.passcode;
    if (typeof passcode !== "string" || !PASSCODE_PATTERN.test(passcode)) {
      res.status(400).json({ message: "passcode must be a 6-digit string" });
      return;
    }

    const employee = await findEmployeeById(req.user.sub);
    if (!employee) {
      res.status(401).json({ message: "Invalid passcode" });
      return;
    }

    const ok = await bcrypt.compare(passcode, employee.passcode_hash);
    if (!ok) {
      res.status(401).json({ message: "Invalid passcode" });
      return;
    }

    next();
  } catch (err) {
    console.error("verifyPasscode error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}