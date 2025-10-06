import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../../contexts/useAuth";
import styled from "styled-components";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await register(username, password, phone);
    if (result.success) navigate("/login");
  };

  return (
    <Container>
      <h2>Registrar</h2>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          placeholder="Telefone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Criar conta</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <p>
        Já tem conta? <Link to="/login">Login</Link>
      </p>
    </Container>
  );
};

export default RegisterPage;
