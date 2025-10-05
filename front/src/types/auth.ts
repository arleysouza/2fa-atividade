export interface Register {
  success: boolean;
  data?: { message: string };
  error?: string;
}

export type Logout = Register;

export interface User {
  id: number;
  username: string;
  phone: string;
}

export interface AuthResponseData {
  message: string;
  token?: string;
  user?: User;
  requires2FA?: boolean;
}

export interface Login {
  success: boolean;
  data?: AuthResponseData;
  error?: string;
}

export type VerifyMfa = Login;

export interface ChangePassword {
  oldPassword: string;
  newPassword: string;
  success: boolean;
  data?: { message: string };
  error?: string;
}
