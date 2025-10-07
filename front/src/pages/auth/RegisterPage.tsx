import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../../contexts/useAuth";
import styled from "styled-components";
import PasswordInput from "../../components/PasswordInput";
import PasswordRequirements from "../../components/PasswordRequirements";
import { isPasswordCompliant } from "../../utils/passwordRules";

const Container = styled.div`
  max-width: 400px;
  margin: 80px auto;
  padding: 2rem;
  background: #fff;
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const RegisterPage = () => {
  const { register, error } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const passwordValid = isPasswordCompliant(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) {
      return;
    }
    const result = await register(username, password, phone);
    if (result.success) navigate("/login");
  };

  return (
    <Container>
      <h2>Registrar</h2>
      <form onSubmit={handleSubmit} noValidate>
        <input
          placeholder="UsuÃ¡rio"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          placeholder="Telefone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <PasswordInput
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordRequirements password={password} />
        <button type="submit" disabled={!passwordValid}>
          Criar conta
        </button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <p>
        JÃ¡ tem conta? <Link to="/login">Login</Link>
      </p>
    </Container>
  );
};

export default RegisterPage;
