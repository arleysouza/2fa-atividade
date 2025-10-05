import axios from "axios";
import type { Register, Login, Logout, ChangePassword, VerifyMfa } from "../types/auth";

// URL base do backend (nginx faz proxy para /api → server-app:3000)
const VITE_SERVER = "/api";

// Wrapper para padronizar sucesso/erro
const requestWrapper = async <T>(
  fn: () => Promise<{ data: T }>,
): Promise<T> => {
  try {
    const response = await fn();
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const respData = err.response?.data as {
        error?: string;
        message?: string;
        data?: string[];
      };

      return {
        success: false,
        error:
          respData?.data?.[0] ||
          respData?.error ||
          respData?.message ||
          "Erro de comunicação com o servidor",
      } as T;
    }

    return {
      success: false,
      error: "Erro desconhecido",
    } as T;
  }
};

export const register = async (
  username: string,
  password: string,
  phone: string,
): Promise<Register> =>
  requestWrapper<Register>(() =>
    axios.post(`${VITE_SERVER}/users`, { username, password, phone }),
  );

export const login = async (
  username: string,
  password: string,
): Promise<Login> =>
  requestWrapper<Login>(() =>
    axios.post(`${VITE_SERVER}/users/login`, { username, password }),
  );

export const verifyMfa = async (
  username: string,
  code: string,
): Promise<VerifyMfa> =>
  requestWrapper<VerifyMfa>(() =>
    axios.post(`${VITE_SERVER}/users/login/verify-mfa`, { username, code }),
  );

export const logout = async (token: string): Promise<Logout> =>
  requestWrapper<Logout>(() =>
    axios.post(
      `${VITE_SERVER}/users/logout`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  );

export const changePassword = async (
  token: string,
  oldPassword: string,
  newPassword: string,
): Promise<ChangePassword> =>
  requestWrapper<ChangePassword>(() =>
    axios.patch(
      `${VITE_SERVER}/users/password`,
      { oldPassword, newPassword },
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  );



