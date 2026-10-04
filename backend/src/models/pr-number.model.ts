import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { generatePrNumber } from "../utils/generatePrNumber";
import type { ResultSetHeader } from "mysql2";


interface CounterRow extends RowDataPacket {
  last_sequence: string;
}

export interface PrNumberReservation {
  reservation_id: string;
  pr_no: string;
}

export async function insertPrNumberReservation(
  connection: PoolConnection,
  reservation: PrNumberReservation,
  requesterId: string,
): Promise<void> {
  await connection.execute<ResultSetHeader>(
    `INSERT INTO pr_number_reservation (
       reservation_id,
       pr_no,
       requester_id
     ) VALUES (?, ?, ?)`,
    [
      reservation.reservation_id,
      reservation.pr_no,
      requesterId,
    ],
  );
}

export async function allocatePrNumber(
  connection: PoolConnection,
): Promise<string> {
  const [rows] = await connection.query<CounterRow[]>(
    `SELECT CAST(last_sequence AS CHAR) AS last_sequence
     FROM pr_number_counter
     WHERE counter_name = 'pr'
     FOR UPDATE`,
  );

  const counter = rows[0];

  if (!counter) {
    throw new Error("PR number counter is not initialized");
  }

  // ส่วนเพิ่มเลขอยู่ถัดจากนี้ในไฟล์
  const lastSequence = Number(counter.last_sequence);

  if (
    !Number.isSafeInteger(lastSequence) ||
    lastSequence < 0 ||
    !Number.isSafeInteger(lastSequence + 1)
  ) {
    throw new Error("PR number sequence exceeds the supported range");
  }
  
  const prNo = generatePrNumber(`IT-${lastSequence}-PR`);

  await connection.execute<ResultSetHeader>(
    `UPDATE pr_number_counter
     SET last_sequence = last_sequence + 1
     WHERE counter_name = 'pr'`,
  );
  
  return prNo;
}

interface ReservationRow extends RowDataPacket {
  reservation_id: string;
  pr_no: string;
  requester_id: string;
  used_at: Date | null;
}

export async function findPrNumberReservationForUpdate(
  connection: PoolConnection,
  reservationId: string,
  requesterId: string,
): Promise<ReservationRow | null> {
  const [rows] = await connection.execute<ReservationRow[]>(
    `SELECT reservation_id, pr_no, requester_id, used_at
     FROM pr_number_reservation
     WHERE reservation_id = ?
       AND requester_id = ?
     FOR UPDATE`,
    [reservationId, requesterId],
  );

  return rows[0] ?? null;
}

export async function markPrNumberReservationUsed(
  connection: PoolConnection,
  reservationId: string,
  requesterId: string,
): Promise<void> {
  const [result] = await connection.execute<ResultSetHeader>(
    `UPDATE pr_number_reservation
     SET used_at = UTC_TIMESTAMP()
     WHERE reservation_id = ?
       AND requester_id = ?
       AND used_at IS NULL`,
    [reservationId, requesterId],
  );

  if (result.affectedRows !== 1) {
    throw new Error("PR number reservation could not be marked as used");
  }
}