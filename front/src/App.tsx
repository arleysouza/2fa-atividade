import { Routes, Route, Navigate } from "react-router-dom";
import useAuth from "./contexts/useAuth";
import type { JSX } from "react";

// Layouts
import AuthLayout from "./layouts/AuthLayout";
import AppLayout from "./layouts/AppLayout";

// Páginas
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ChangePasswordPage from "./pages/auth/ChangePasswordPage";
import DashboardPage from "./pages/DashboardPage";

// Rota protegida
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Wrapper de layout para rotas públicas
const PublicRoute = ({ element }: { element: JSX.Element }) => {
  return <AuthLayout>{element}</AuthLayout>;
};

// Wrapper de layout para rotas privadas
const ProtectedRoute = ({ element }: { element: JSX.Element }) => {
  return (
    <PrivateRoute>
      <AppLayout>{element}</AppLayout>
    </PrivateRoute>
  );
};

const App = () => {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login" element={<PublicRoute element={<LoginPage />} />} />
      <Route
        path="/register"
        element={<PublicRoute element={<RegisterPage />} />}
      />

      {/* Rotas privadas */}
      <Route
        path="/change-password"
        element={<ProtectedRoute element={<ChangePasswordPage />} />}
      />
      <Route
        path="/dashboard"
        element={<ProtectedRoute element={<DashboardPage />} />}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
