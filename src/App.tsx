import {Route,Routes,Navigate} from 'react-router';
import MainLayout from './common/layouts/MainLayout';
import NotFound from './pages/NotFound';
import Dashboard from './pages/dashboard/Dashboard';
import Momentum from './pages/momentum/Momentum';
import Settings from './pages/Settings';
import { Login } from './pages/loginSignup/Login';
import { Signup } from './pages/loginSignup/Signup';
import ProtectedRoute from './common/components/ProtectedRoutes';
import Forecasting from './pages/forecasting/Forecasting';

const AppRoutes = () => {
  return (
      <Routes>

        {/* public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<NotFound />} />
        
        {/* protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />             
            <Route path="/forecasting" element={<Forecasting/>}/> 
            <Route path="/momentum" element={<Momentum />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

      </Routes>
  );
};

export default AppRoutes;
