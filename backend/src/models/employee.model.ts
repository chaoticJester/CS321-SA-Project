import {RowDataPacket} from "mysql2";
import pool from "../config/db";
import {Employee} from "../types/employee";
import { PendingApprovalItem } from "../types/employee";


//mysql2 Return RowDataPacket
interface EmployeeRow extends RowDataPacket, Employee {}
interface PendingApprovalRow extends RowDataPacket, PendingApprovalItem {}

//Return Employee if found, null if otherwise
export async function findEmployeeById(
  employeeId: string
): Promise<Employee | null> {
  const [rows] = await pool.query<EmployeeRow[]>(
    "SELECT * FROM employee WHERE employee_id = ?",
    [employeeId]
  );
  return rows[0] ?? null;
}


export async function findPendingApprovalsForEmployee(
  employeeId: string
): Promise<PendingApprovalItem[]> {
  const [rows] = await pool.query<PendingApprovalRow[]>(
    `SELECT pr.pr_id, pr.pr_no, pr.job_name, pr.requester_id, pr.created_at, pr.require_date, pr.asset_type,
            requester.full_name AS requester_name,
            requester.department AS requester_department,
            COALESCE(SUM(item.qty * item.unit_price), 0) AS total_amount
     FROM approval_log al
     JOIN pr ON pr.pr_id = al.pr_id
     JOIN employee requester ON requester.employee_id = pr.requester_id
     LEFT JOIN pr_item item ON item.pr_id = pr.pr_id
     WHERE al.approver_id = ?
       AND al.job_action = 'pending'
       AND al.level_id = (
         SELECT al2.level_id
         FROM approval_log al2
         JOIN approval_level lvl2 ON al2.level_id = lvl2.level_id
         WHERE al2.pr_id = al.pr_id AND al2.job_action = 'pending'
         ORDER BY lvl2.sequence_order ASC
         LIMIT 1
       )
     GROUP BY pr.pr_id, pr.pr_no, pr.job_name, pr.requester_id, pr.created_at, pr.require_date, pr.asset_type, requester.full_name, requester.department
     ORDER BY pr.created_at ASC`,
    [employeeId]
  );
  return rows;
}

export async function findApprovalHistoryForEmployee(employeeId: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT pr.pr_id, pr.pr_no, pr.job_name, pr.requester_id, pr.created_at, pr.require_date, pr.asset_type,
            requester.full_name AS requester_name, requester.department AS requester_department,
            al.job_action AS decision, al.comment, al.approved_at,
            (SELECT COALESCE(SUM(item.qty * item.unit_price), 0)
             FROM pr_item item WHERE item.pr_id = pr.pr_id) AS total_amount
     FROM approval_log al
     JOIN pr ON pr.pr_id = al.pr_id
     JOIN employee requester ON requester.employee_id = pr.requester_id
     WHERE al.approver_id = ? AND al.job_action IN ('approved', 'rejected')
     ORDER BY al.approved_at DESC`,
    [employeeId],
  );
  return rows;
}
