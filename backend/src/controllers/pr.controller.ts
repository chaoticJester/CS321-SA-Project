import type {Request, Response} from "express";
import type { AuthedRequest } from "../middlewares/auth.middleware.js";
import { createPr } from "../services/pr.service.js";
import { unlink } from "node:fs/promises";
import type { NextFunction } from "express";
import { insertAttachment } from "../models/pr.model.js";
import { findPrById, findPrsByRequester } from "../models/pr.model.js";
import type { CreatePrInput, PrStatus } from "../types/pr.js";

const ALLOWED_STATUSES = new Set<PrStatus>([
  "pending",
  "approved",
  "rejected",
]);

export async function getPrById(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const prId = req.params.id as string;
    const pr = await findPrById(prId);

    if (!pr) {
      res.status(404).json({message: "PR not found"});
      return;
    }
    
    res.status(200).json(pr);
  } catch (error) {
    console.error("Failed to get PR:", error);
    res.status(500).json({message: "Internal server error"});
  }
}

export async function createPrController(
  req: AuthedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const data = body as Record<string, unknown>;
  const date = typeof data.require_date === "string"
    ? new Date(data.require_date)
    : null;

  if (!date || Number.isNaN(date.getTime())) {
    res.status(400).json({ message: "Invalid require_date" });
    return;
  }

  if (
    !Array.isArray(data.items) ||
    data.items.length === 0 ||
    !data.items.every((item: unknown) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        return false;
      }

      const row = item as Record<string, unknown>;
      const price = row.unit_price;

      return (
        typeof row.description === "string" &&
        row.description.trim().length > 0 &&
        row.description.length <= 255 &&
        Number.isInteger(row.qty) &&
        (row.qty as number) > 0 &&
        typeof price === "number" &&
        Number.isFinite(price) &&
        price >= 0 &&
        price <= 9_999_999_999_999.99 &&
        Math.abs(price * 100 - Math.round(price * 100)) < 1e-7 &&
        (row.unit === undefined ||
          (typeof row.unit === "string" && row.unit.length <= 30))
      );
    })
  ) {
    res.status(400).json({ message: "Invalid PR items" });
    return;
  }

  const optionalFields = {
    job_name: 150,
    purpose: 255,
    asset_type: 100,
    vendor_name: 150,
  } as const;

  for (const [key, maxLength] of Object.entries(optionalFields)) {
    const value = data[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.length > maxLength)
    ) {
      res.status(400).json({ message: `Invalid ${key}` });
      return;
    }
  }

  const input: CreatePrInput = {
    requester_id: req.user.sub,
    // MySQL DATETIME ไม่มีข้อมูล timezone; บันทึกเป็นเวลา UTC
    require_date: date.toISOString().slice(0, 19).replace("T", " "),
    job_name: data.job_name as string | undefined,
    purpose: data.purpose as string | undefined,
    asset_type: data.asset_type as string | undefined,
    vendor_name: data.vendor_name as string | undefined,
    items: data.items as CreatePrInput["items"],
  };

  try {
    const prId = await createPr(input);
    res.status(201).json({ pr_id: prId });
  } catch (error) {
    console.error("Failed to create PR:", error);
    res.status(500).json({ message: "Failed to create PR" });
  }
}

export async function checkPrForUpload(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const prId = req.params.id as string;
    const pr = await findPrById(prId);

    if (!pr) {
      res.status(404).json({ message: "PR not found" });
      return;
    }

    if (!req.user || pr.requester_id !== req.user.sub) {
      res.status(403).json({ message: "Cannot attach files to this PR" });
      return;
    }

    next();
  } catch (error) {
    console.error("Failed to check PR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function addPrAttachment(
  req: AuthedRequest,
  res: Response,
): Promise<void> {
  const file = req.file;

  if (!file) {
    res.status(400).json({ message: "File is required" });
    return;
  }

  try {
    const attachmentId = await insertAttachment(
      req.params.id as string,
      file.mimetype,
      file.filename,
    );

    res.status(201).json({
      attachment_id: attachmentId,
      pr_id: req.params.id,
      file_type: file.mimetype,
      file_path: file.filename,
    });
  } catch (error) {
    // Multer เขียนไฟล์แล้ว แต่ INSERT ล้มเหลว: ลบไฟล์ที่ค้างอยู่
    try {
      await unlink(file.path);
    } catch (cleanupError) {
      console.error("Failed to remove uploaded file:", cleanupError);
    }

    console.error("Failed to save attachment:", error);
    res.status(500).json({ message: "Failed to save attachment" });
  }
}

export async function listMyPrs(
  req: AuthedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  if (!Number.isInteger(page) || page < 1) {
    res.status(400).json({
      message: "page must be a positive integer",
    });
    return;
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    res.status(400).json({
      message: "limit must be an integer between 1 and 100",
    });
    return;
  }

  const rawStatus =
    typeof req.query.status === "string"
      ? req.query.status
      : "";

  const statuses = rawStatus
    .split(",")
    .map((status) => status.trim())
    .filter((status) => status.length > 0);

  if (
    !statuses.every((status) =>
      ALLOWED_STATUSES.has(status as PrStatus),
    )
  ) {
    res.status(400).json({
      message: "status must be pending, approved or rejected",
    });
    return;
  }

  try {
    const result = await findPrsByRequester(
      req.user.sub,
      statuses as PrStatus[],
      page,
      limit,
    );

    res.status(200).json({
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        total_pages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to list PRs:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}