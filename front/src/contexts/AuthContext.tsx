import { createContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import * as authApi from "../api/auth";
import type { User, Login, Register, Logout, VerifyMfa } from "../types/auth";

interface AuthContextProps {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<Login>;
  verifyMfa: (username: string, code: string) => Promise<VerifyMfa>;
  register: (username: string, password: string, phone: string) => Promise<Register>;
  logout: () => Promise<Logout | void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const persistSession = (
  setter: {
    setToken: (token: string | null) => void;
    setUser: (user: User | null) => void;
  },
  sessionToken: string,
  sessionUser: User,
) => {
  setter.setToken(sessionToken);
  setter.setUser(sessionUser);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carrega token e usuario do localStorage ao iniciar
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken) setToken(storedToken);
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  // Persiste no localStorage quando mudar
  useEffect(() => {
    if (token && user) {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }, [token, user]);

  const handleLogin = async (
    username: string,
    password: string,
  ): Promise<Login> => {
    setError(null);
    const response = await authApi.login(username, password);

    if (response.success && response.data?.token && response.data.user) {
      persistSession({ setToken, setUser }, response.data.token, response.data.user);
    } else if (!response.success && response.error) {
      setError(response.error);
    }

    // Quando requires2FA vier verdadeiro mantemos token null
    if (response.success && response.data?.requires2FA) {
      setToken(null);
      setUser(null);
    }

    return response;
  };

  const handleVerifyMfa = async (
    username: string,
    code: string,
  ): Promise<VerifyMfa> => {
    setError(null);
    const response = await authApi.verifyMfa(username, code);

    if (response.success && response.data?.token && response.data.user) {
      persistSession({ setToken, setUser }, response.data.token, response.data.user);
    } else if (!response.success && response.error) {
      setError(response.error);
    }

    return response;
  };

  const handleRegister = async (
    username: string,
    password: string,
    phone: string,
  ): Promise<Register> => {
    setError(null);
    const response = await authApi.register(username, password, phone);
    if (!response.success && response.error) {
      setError(response.error);
    }
    return response;
  };

  const handleLogout = async (): Promise<Logout | void> => {
    setError(null);
    if (!token) return;
    try {
      const response = await authApi.logout(token);
      setToken(null);
      setUser(null);
      localStorage.clear();
      return response;
    } catch {
      setError("Erro ao deslogar");
    }
  };

  const handleChangePassword = async (
    oldPassword: string,
    newPassword: string,
  ): Promise<void> => {
    setError(null);
    if (!token) throw new Error("Usuario nao autenticado");
    try {
      const response = await authApi.changePassword(token, oldPassword, newPassword);
      if (!response.success && response.error) {
        setError(response.error);
      }
    } catch {
      setError("Erro ao alterar a senha");
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        error,
        login: handleLogin,
        verifyMfa: handleVerifyMfa,
        register: handleRegister,
        logout: handleLogout,
        changePassword: handleChangePassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
