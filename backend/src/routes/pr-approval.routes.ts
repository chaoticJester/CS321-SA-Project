import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { verifyPasscode } from "../middlewares/passcode.middleware";
import {
  approvePrController,
  rejectPrController,
  getPrStatusController,
} from "../controllers/pr-approval.controller";

const router = Router();

// GET  /api/pr/:id/status
router.get("/:id/status", authMiddleware, getPrStatusController);

// POST /api/pr/:id/approve  (JWT -> passcode -> controller)
router.post("/:id/approve", authMiddleware, verifyPasscode, approvePrController);

// POST /api/pr/:id/reject
router.post("/:id/reject", authMiddleware, rejectPrController);



export default router;