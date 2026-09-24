import {Router} from "express";
import {authMiddleware} from "../middlewares/auth.middleware.js";
import {getPrById} from "../controllers/pr.controller.js";
import { createPrController } from "../controllers/pr.controller.js";
import multer from "multer";
import { uploadPrAttachment } from "../middlewares/prUpload.middleware.js";
import {
  checkPrForUpload,
  addPrAttachment,
} from "../controllers/pr.controller.js";


const router = Router();

router.post("/", authMiddleware, createPrController);
router.get("/:id", authMiddleware, getPrById);
router.post(
  "/:id/attachments",
  authMiddleware,
  checkPrForUpload,
  (req, res, next) => {
    uploadPrAttachment(req, res, (error) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ message: "File exceeds 10 MB" });
        return;
      }

      res.status(400).json({ message: "Invalid upload" });
    });
  },
  addPrAttachment,
);

export default router;
