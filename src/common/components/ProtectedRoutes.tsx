import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = () => {
  const { token, loading } = useAuth();

  if (loading) return <div>Loading ArthaBodh...</div>;

  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;