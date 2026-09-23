import { RowDataPacket } from "mysql2";
import pool from "../config/db";
import { getApprovalChain, createApprovalLog } from "../services/approval.service";

async function main() {
  const conn = await pool.getConnection(); 
  try {
    await conn.beginTransaction();          

    await conn.query("DELETE FROM approval_log WHERE pr_id = ?", ["PR0001"]);

    const chain = await getApprovalChain(110000, conn);
    await createApprovalLog("PR0001", chain, conn);

    const [inside] = await conn.query<RowDataPacket[]>(
      "SELECT log_id FROM approval_log WHERE pr_id = ?", ["PR0001"]
    );
    console.log("conn seen:", inside.map(r => r.log_id));

    const [outside] = await pool.query<RowDataPacket[]>(
      "SELECT log_id FROM approval_log WHERE pr_id = ?", ["PR0001"]
    );
    console.log("others see (pool sees the original):", outside.map(r => r.log_id));
  } finally {
    await conn.rollback();            
    conn.release();                        
    await pool.end();
  }
}

main();