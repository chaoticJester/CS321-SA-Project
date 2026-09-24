import {Router} from "express";
import {authMiddleware} from "../middlewares/auth.middleware.js";
import {getPrById} from "../controllers/pr.controller.js";

const router = Router();

router.get("/:id", authMiddleware, getPrById);

export default router;
