import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../../contexts/useAuth";
import type { User } from "../../types/auth";
import AuthLayout from "../../layouts/AuthLayout";
import PasswordInput from "../../components/PasswordInput";

const LoginPage = () => {
  const { login, verifyMfa, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [awaitingMfa, setAwaitingMfa] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [mfaMessage, setMfaMessage] = useState<string | null>(null);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);

  const resetToFirstStep = () => {
    clearError();
    setAwaitingMfa(false);
    setCode("");
    setPendingUser(null);
    setMfaMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoadingLogin(true);
    try {
      const result = await login(username, password);
      if (result.success && result.data?.requires2FA) {
        setAwaitingMfa(true);
        setPendingUser(result.data.user ?? null);
        setMfaMessage(result.data.message ?? "CÃ³digo enviado por SMS.");
        setCode("");
        return;
      }

      if (result.success && result.data?.token) {
        resetToFirstStep();
        navigate("/dashboard");
      }
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoadingVerify(true);
    try {
      const result = await verifyMfa(username, code);
      if (result.success && result.data?.token) {
        resetToFirstStep();
        navigate("/dashboard");
      }
    } finally {
      setLoadingVerify(false);
    }
  };

  return (
    <AuthLayout>
      <h2>Login</h2>
      {!awaitingMfa ? (
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Usuario"
            value={username}
            onChange={(e) => {
              clearError();
              setUsername(e.target.value);
            }}
          />
          <PasswordInput
            placeholder="Senha"
            value={password}
            onChange={(e) => {
              clearError();
              setPassword(e.target.value);
            }}
          />
          <button type="submit" disabled={loadingLogin}>
            {loadingLogin ? "Verificando..." : "Entrar"}
          </button>
        </form>
      ) : (
        <>
          <p>
            {mfaMessage || "Informe o cÃ³digo recebido."}
            {pendingUser?.phone ? ` NÃºmero: ${pendingUser.phone}` : ""}
          </p>
          <form onSubmit={handleVerifyMfa}>
            <input
              placeholder="CÃ³digo"
              value={code}
              inputMode="numeric"
              pattern="[0-9]{3}"
              maxLength={3}
              onChange={(e) => {
                clearError();
                setCode(e.target.value.replace(/[^0-9]/g, ""));
              }}
            />
            <button type="submit" disabled={loadingVerify || code.length !== 3}>
              {loadingVerify ? "Validando..." : "Confirmar"}
            </button>
          </form>
          <button type="button" onClick={resetToFirstStep}>
            Voltar ao login
          </button>
        </>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!awaitingMfa && (
        <p>
          Nao tem conta? <Link to="/register">Registrar</Link>
        </p>
      )}
    </AuthLayout>
  );
};

export default LoginPage;
