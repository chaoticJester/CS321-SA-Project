import express, { Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes"
import employeeRoutes from "./routes/employee.routes";
import prRoutes from "./routes/pr.routes";
import prApprovalRoutes from "./routes/pr-approval.routes";

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

app.use("/api/pr", prApprovalRoutes);

export default app;
