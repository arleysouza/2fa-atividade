import { useState } from "react";
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

const ChangePasswordPage = () => {
  const { changePassword, error } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const newPasswordValid = isPasswordCompliant(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newPasswordValid) {
        setSuccess(false);
        return;
      }
      await changePassword(oldPassword, newPassword);
      setSuccess(true);
    } catch {
      setSuccess(false);
    }
  };

  return (
    <Container>
      <h2>Alterar senha</h2>
      <form onSubmit={handleSubmit} noValidate>
        <PasswordInput
          placeholder="Senha atual"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <PasswordInput
          placeholder="Nova senha"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <PasswordRequirements password={newPassword} />
        <button type="submit" disabled={!newPasswordValid}>
          Alterar senha
        </button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!error && success && (
        <p style={{ color: "green" }}>Senha alterada com sucesso!</p>
      )}
    </Container>
  );
};

export default ChangePasswordPage;
