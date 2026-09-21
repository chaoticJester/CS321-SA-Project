import {Router} from "express";
import {login} from "../controllers/auth.controller";

const router = Router();

//POST /api/auth/login
router.post("/login", login);

//POST /api/auth/verify-passcode -> Peak's task

export default router;
