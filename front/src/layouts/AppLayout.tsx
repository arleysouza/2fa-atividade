import type { ReactNode } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import Header from "../components/Header";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
`;

const ContentWrapper = styled.div`
  display: flex;
  flex: 1;
`;

const Sidebar = styled.aside`
  width: 220px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  nav {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  a {
    color: #fff;
    font-weight: bold;
    &:hover {
      color: #eb5757;
    }
  }
`;

const Main = styled.main`
  flex: 1;
  padding: 2rem;
`;

interface Props {
  children: ReactNode;
}

const AppLayout = ({ children }: Props) => {
  return (
    <Container>
      <Header />
      <ContentWrapper>
        <Sidebar>
          <h3>Teste de Frontend</h3>
          <nav>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/change-password">Alterar Senha</Link>
          </nav>
        </Sidebar>
        <Main>{children}</Main>
      </ContentWrapper>
    </Container>
  );
};

export default AppLayout;
