import { Response } from "express";
import { findEmployeeById } from "../models/employee.model";
import { AuthedRequest } from "../middlewares/auth.middleware";

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