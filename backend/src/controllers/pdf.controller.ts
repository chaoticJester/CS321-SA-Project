import { Response } from "express";
import { AuthedRequest } from "../middlewares/auth.middleware";
import { canEmployeeAccessPr, findPrById } from "../models/pr.model";
import { buildDraftPdfData, buildPrPdfData, renderPrPdf } from "../services/pdf.service";
import { parsePrInput } from "./pr.controller";

// GET /api/pr/:id/pdf             -> show in the browser (inline)
// GET /api/pr/:id/pdf?download=1  -> save as a file (attachment)
// Only the requester and the approvers in the PR's chain may see it.
export async function getPrPdfController(req: AuthedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const prId = req.params.id as string;

  try {
    const pr = await findPrById(prId);
    if (!pr) {
      res.status(404).json({ message: "PR not found" });
      return;
    }

    const canAccess = await canEmployeeAccessPr(prId, req.user.sub);
    if (!canAccess) {
      res.status(403).json({ message: "Cannot access this PR" });
      return;
    }

    const pdf = await renderPrPdf(await buildPrPdfData(pr));

    const fileName = `${pr.pr_no.replace(/[^A-Za-z0-9._-]/g, "_")}.pdf`;
    const disposition = req.query.download === "1" ? "attachment" : "inline";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${disposition}; filename="${fileName}"`);
    res.setHeader("Content-Length", pdf.length);
    // The approval status changes over time, so never serve a cached copy.
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).end(pdf);
  } catch (error) {
    console.error("getPrPdf error:", error);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
}

// POST /api/pr/pdf-preview  body = same as POST /api/pr (reservation_id not needed)
// Renders the PDF of a PR that has not been submitted yet. Nothing is saved.
export async function previewPrPdfController(req: AuthedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const body: unknown = req.body;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const input = parsePrInput(body as Record<string, unknown>, req.user.sub);
  if (typeof input === "string") {
    res.status(400).json({ message: input });
    return;
  }

  try {
    const pdf = await renderPrPdf(await buildDraftPdfData(input));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="PR-Draft.pdf"');
    res.setHeader("Content-Length", pdf.length);
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).end(pdf);
  } catch (error) {
    console.error("previewPrPdf error:", error);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
}
