import {Request, Response, NextFunction} from "express";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/employee";

// Extend Request
export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

export function authMiddleware(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  //1 Read header Authorization
  const header = req.headers.authorization;

  //2 Must have and must start with "Bearer "
  if(!header?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({message: "Missing or invalid Authorization header"});
  }

  //3 Cut "Bearer " off. Must have only the token
  const token = header.slice("Bearer ".length);

  try {
    //4 Verify token with the same secret as with using sign
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;


    //5 Passed -> Put user onto the request and move on
    req.user = payload;
    next();
  } catch {
    //6 Fake token or token expired -> 401
    return res.status(401).json({message: "Invalid or expired token"});
  }
}
