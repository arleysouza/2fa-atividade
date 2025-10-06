import { useState } from "react";
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

const ChangePasswordPage = () => {
  const { changePassword, error } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await changePassword(oldPassword, newPassword);
      setSuccess(true);
    } catch {
      setSuccess(false);
    }
  };

  return (
    <Container>
      <h2>Alterar Senha</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Senha atual"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="Nova senha"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button type="submit">Alterar</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!error && success && (
        <p style={{ color: "green" }}>Senha alterada com sucesso!</p>
      )}
    </Container>
  );
};

export default ChangePasswordPage;
