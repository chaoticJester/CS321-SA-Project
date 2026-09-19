import { Router } from "express";
import { getEmployeeById } from "../controllers/employee.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// GET /api/employees/:id 
router.get("/:id", authMiddleware, getEmployeeById);

export default router;