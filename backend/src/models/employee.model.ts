import {RowDataPacket} from "mysql2";
import pool from "../config/db";
import {Employee} from "../types/employee";

//mysql2 Return RowDataPacket
interface EmployeeRow extends RowDataPacket, Employee {}

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
