import pool from "../config/db.js";
import type { CreatePrInput } from "../types/pr.js";
import { getLatestPrNumber, insertPrAndItems } from "../models/pr.model.js";
import { generatePrNumber } from "../utils/generatePrNumber.js";
import { calculatePrTotal } from "../utils/calculatePrTotal.js";
import {
  getApprovalChain,
  createApprovalLog,
} from "./approval.service.js";
import type { RowDataPacket } from "mysql2/promise";

interface LockRow extends RowDataPacket {
  acquired: number | null;
}

export async function createPr(input: CreatePrInput): Promise<string> {
  const totalAmount = calculatePrTotal(input.items);
  const connection = await pool.getConnection();
  let lockAcquired = false;
  
  try {
    const [rows] = await connection.query<LockRow[]>(
      "SELECT GET_LOCK('pr_approval:pr_number', 10) AS acquired",
    );
  
    if (rows[0]?.acquired !== 1) {
      throw new Error("Could not reserve a PR number");
    }
    lockAcquired = true;
  
    await connection.beginTransaction();
  
    const latestPrNumber = await getLatestPrNumber(connection);
    const prNo = generatePrNumber(latestPrNumber);
    const prId = await insertPrAndItems(connection, input, prNo);
    const chain = await getApprovalChain(totalAmount, connection);
    await createApprovalLog(prId, chain, connection);
  
    await connection.commit();
    return prId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    try {
      if (lockAcquired) {
        await connection.query(
          "SELECT RELEASE_LOCK('pr_approval:pr_number')",
        );
      }
    } finally {
      connection.release();
    }
  }
}
