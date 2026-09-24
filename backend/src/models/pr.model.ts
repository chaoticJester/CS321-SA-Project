import type { ResultSetHeader, PoolConnection, RowDataPacket } from "mysql2/promise";
import { randomBytes } from "node:crypto";
import type { CreatePrInput } from "../types/pr.js";
import pool from "../config/db.js";
import type { PrRow, PrItemRow, PrWithItems } from "../types/pr.js";

type PrDbRow = PrRow & RowDataPacket;
type PrItemDbRow = PrItemRow & RowDataPacket;
interface LatestPrNumberRow extends RowDataPacket {
    pr_no: string;
}

export async function getLatestPrNumber(
    connection: PoolConnection,
): Promise<string | undefined> {
    const [rows] = await connection.query<LatestPrNumberRow[]>(
        `
      SELECT pr_no
      FROM pr
      WHERE pr_no REGEXP '^IT-[0-9]+-PR$'
      ORDER BY CAST(
        SUBSTRING_INDEX(SUBSTRING_INDEX(pr_no, '-', 2), '-', -1)
        AS UNSIGNED
      ) DESC
      LIMIT 1
    `,
    );

    return rows[0]?.pr_no;
}

export async function insertPrAndItems(
    connection: PoolConnection,
    input: CreatePrInput,
    prNo: string,
): Promise<string> {
    // pr_id ยาว 18 ตัวอักษร อยู่ในขนาด VARCHAR(20)
    const prId = `PR${randomBytes(8).toString("hex")}`;

    await connection.execute<ResultSetHeader>(
        `INSERT INTO pr (
      pr_id, pr_no, requester_id, require_date,
      job_name, purpose, asset_type, vendor_name, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
            prId,
            prNo,
            input.requester_id,
            input.require_date,
            input.job_name ?? null,
            input.purpose ?? null,
            input.asset_type ?? null,
            input.vendor_name ?? null,
        ],
    );

    for (const item of input.items) {
        // item_id ยาว 18 ตัวอักษร อยู่ในขนาด VARCHAR(20)
        const itemId = `IT${randomBytes(8).toString("hex")}`;

        await connection.execute<ResultSetHeader>(
            `INSERT INTO pr_item (
        item_id, pr_id, description, qty, unit, unit_price
      ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                itemId,
                prId,
                item.description,
                item.qty,
                item.unit ?? null,
                item.unit_price,
            ],
        );
    }

    return prId;
}

export async function findPrById(
  prId: string,
): Promise<PrWithItems | null> {
  const [prs] = await pool.query<PrDbRow[]>(
    "SELECT * FROM pr WHERE pr_id = ?",
    [prId],
  );

  const pr = prs[0];
  if(!pr) {
    return null;
  }

  const [items] = await pool.query<PrItemDbRow[]>(
    "SELECT * FROM pr_item WHERE pr_id = ? ORDER BY item_id",
    [prId],
  );

  const totalAmount = items.reduce(
    (sum, item) => sum + item.qty * Number(item.unit_price),
    0
  );

  return {
    ...pr,
    items,
    total_amount: totalAmount,
  };
}
