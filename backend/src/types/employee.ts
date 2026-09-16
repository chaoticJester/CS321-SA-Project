export interface Employee {
  employee_id: string;
  full_name: string;
  position: string | null;
  department: string | null;
  approval_level_id: string | null;
  passcode_hash: string; //Can not be sent in response
  signature_image: string | null;
}

//Data we will put in JWT token
export interface JwtPayload {
  sub: string; //subject = employee_id
  approval_level_id: string | null;
}
