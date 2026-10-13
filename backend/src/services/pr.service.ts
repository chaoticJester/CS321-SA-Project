import pool from "../config/db.js";
import type { CreatePrInput } from "../types/pr.js";
import { insertPrAndItems } from "../models/pr.model.js";
import {
  findPrNumberReservationForUpdate,
  markPrNumberReservationUsed,
} from "../models/pr-number.model.js";
import { calculatePrTotal } from "../utils/calculatePrTotal.js";
import {
  getApprovalChain,
  createApprovalLog,
} from "./approval.service.js";

export class PrReservationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 400 | 409,
  ) {
    super(message);
    this.name = "PrReservationError";
  }
}

export async function createPr(
  input: CreatePrInput,
  reservationId: string,
): Promise<string> {
  const totalAmount = calculatePrTotal(input.items);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const reservation = await findPrNumberReservationForUpdate(
      connection,
      reservationId,
      input.requester_id,
    );

    if (!reservation) {
      throw new PrReservationError(
        "Invalid PR number reservation",
        400,
      );
    }

    if (reservation.used_at !== null) {
      throw new PrReservationError(
        "PR number reservation has already been used",
        409,
      );
    }

    const prId = await insertPrAndItems(
      connection,
      input,
      reservation.pr_no,
    );

    const chain = await getApprovalChain(totalAmount, connection);
    await createApprovalLog(prId, chain, connection);

    await markPrNumberReservationUsed(
      connection,
      reservationId,
      input.requester_id,
    );

    await connection.commit();
    return prId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}