import express, { Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes"
import employeeRoutes from "./routes/employee.routes";
import prRoutes from "./routes/pr.routes";

const app = express();

// middleware กลาง
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

// health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use("/api/employees", employeeRoutes);
app.use("/api/pr", prRoutes);

// mount routes (ค่อย uncomment ทีละตัวเมื่อไฟล์พร้อม)
// app.use("/api/pr", prApprovalRoutes); // ← ไฟล์คนที่ 2

export default app;
