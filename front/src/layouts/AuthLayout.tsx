import type { ReactNode } from "react";
import styled from "styled-components";

const Wrapper = styled.div`
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.background};
`;

const Card = styled.div`
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  background: #fff;
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

interface Props {
  children: ReactNode;
}

const AuthLayout = ({ children }: Props) => {
  return (
    <Wrapper>
      <Card>{children}</Card>
    </Wrapper>
  );
};

export default AuthLayout;
