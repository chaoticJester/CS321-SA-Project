import { randomUUID } from "node:crypto";
import pool from "../config/db.js";
import {
  allocatePrNumber,
  insertPrNumberReservation,
  type PrNumberReservation,
} from "../models/pr-number.model.js";

export async function reservePrNumber(
  requesterId: string,
): Promise<PrNumberReservation> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const reservation: PrNumberReservation = {
      reservation_id: randomUUID(),
      pr_no: await allocatePrNumber(connection),
    };

    await insertPrNumberReservation(
      connection,
      reservation,
      requesterId,
    );

    await connection.commit();

    return reservation;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}