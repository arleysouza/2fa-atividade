import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import useAuth from "../contexts/useAuth";

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
`;

const UserInfo = styled.div`
  font-weight: bold;
`;

const LogoutButton = styled.button`
  background: ${({ theme }) => theme.colors.error};
  color: #fff;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <HeaderContainer>
      <UserInfo>Olá, {user?.username}</UserInfo>
      <LogoutButton onClick={handleLogout}>Sair</LogoutButton>
    </HeaderContainer>
  );
};

export default Header;
