import useAuth from "../contexts/useAuth";

const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <>
      <h2>Bem-vindo, {user?.username}!</h2>
      <p>ID: {user?.id}</p>
    </>
  );
};

export default DashboardPage;
