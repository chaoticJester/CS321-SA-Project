import type {Request, Response} from "express";
import {findPrById} from "../models/pr.model.js";

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
