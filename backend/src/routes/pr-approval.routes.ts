import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { verifyPasscode } from "../middlewares/passcode.middleware";
import {
  approvePrController,
  rejectPrController,
  getPrStatusController,
  resubmitPrController,
} from "../controllers/pr-approval.controller";
import { getPrPdfController, previewPrPdfController } from "../controllers/pdf.controller";

const router = Router();

// GET  /api/pr/:id/status
router.get("/:id/status", authMiddleware, getPrStatusController);

// POST /api/pr/:id/approve  (JWT -> passcode -> controller)
router.post("/:id/approve", authMiddleware, verifyPasscode, approvePrController);

// POST /api/pr/:id/reject
router.post("/:id/reject", authMiddleware, rejectPrController);

// POST /api/pr/:id/resubmit  (requester sends a rejected PR again; new approval round)
router.post("/:id/resubmit", authMiddleware, resubmitPrController);

// GET /api/pr/:id/pdf  (?download=1 to save as a file)
router.get("/:id/pdf", authMiddleware, getPrPdfController);

// POST /api/pr/pdf-preview  (PR not submitted yet, nothing is saved)
router.post("/pdf-preview", authMiddleware, previewPrPdfController);



export default router;