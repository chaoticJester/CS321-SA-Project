import express, { Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes"
import { authMiddleware } from "./middlewares/auth.middleware";

const app = express();

// middleware กลาง
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

// health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// mount routes (ค่อย uncomment ทีละตัวเมื่อไฟล์พร้อม)
// app.use("/api/employees", employeeRoutes);
// app.use("/api/vendors", vendorRoutes);
// app.use("/api/pr", prRoutes);
// app.use("/api/pr", prApprovalRoutes); // ← ไฟล์คนที่ 2

export default app;
