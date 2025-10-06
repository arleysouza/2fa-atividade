import { isAxiosError } from "axios";
import apiClient from "./client";
import type {
  Register,
  Login,
  Logout,
  ChangePassword,
  VerifyMfa,
} from "../types/auth";

type ApiErrorResponse = {
  error?: string;
  message?: string;
  data?: string[];
};

// Wrapper para padronizar sucesso/erro
const requestWrapper = async <T>(
  fn: () => Promise<{ data: T }>,
): Promise<T> => {
  try {
    const response = await fn();
    return response.data;
  } catch (err: unknown) {
    if (isAxiosError<ApiErrorResponse>(err)) {
      const respData = err.response?.data;

      return {
        success: false,
        error:
          respData?.data?.[0] ??
          respData?.error ??
          respData?.message ??
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
    apiClient.post("/users", { username, password, phone }),
  );

export const login = async (
  username: string,
  password: string,
): Promise<Login> =>
  requestWrapper<Login>(() =>
    apiClient.post("/users/login", { username, password }),
  );

export const verifyMfa = async (
  username: string,
  code: string,
): Promise<VerifyMfa> =>
  requestWrapper<VerifyMfa>(() =>
    apiClient.post("/users/login/verify-mfa", { username, code }),
  );

export const logout = async (token: string): Promise<Logout> =>
  requestWrapper<Logout>(() =>
    apiClient.post(
      "/users/logout",
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
    apiClient.patch(
      "/users/password",
      { oldPassword, newPassword },
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  );
