import {Request, Response} from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {findEmployeeById} from "../models/employee.model";
import {JwtPayload} from "../types/employee";

export async function login(req: Request, res: Response) {
  try {
    //1 get value from body
    const {employee_id, passcode} = req.body ?? {};

    //2 validate if we get all required data
    if(!employee_id || !passcode) {
      return res
      .status(400)
      .json({message: "employee_id and passcode are required"});
    }

    //3 find employee from DB
    const employee = await findEmployeeById(String(employee_id));

    //4 if user is not found -> 401
    if(!employee) {
      return res
      .status(401)
      .json({message: "Invalid credentials"});
    }

    //5 check passcode with hash in DB
    const ok = await bcrypt.compare(String(passcode), employee.passcode_hash);

    //6 if passcode != hash in DB -> 401
    if(!ok) {
      return res
      .status(401)
      .json({message: "Invalid credentials"});
    }

    //7 All clear -> create
    const payload: JwtPayload = {
      sub: employee.employee_id,
      approval_level_id: employee.approval_level_id,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: "8h"
    });

    // return only safe fields (no passcode_hash)
    return res.json({
      token,
      employee: {
        employee_id: employee.employee_id,
        full_name: employee.full_name,
        position: employee.position,
        department: employee.department,
        approval_level_id: employee.approval_level_id
      }
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({message: "Internal server error"});
  }
}
