import { Router } from "express";
import { getEmployeeById } from "../controllers/employee.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { getPendingApprovals } from "../controllers/employee.controller";

const router = Router();

// GET /api/employees/:id 
router.get("/:id", authMiddleware, getEmployeeById);
router.get("/:id/pending-approvals", authMiddleware, getPendingApprovals);
export default router;