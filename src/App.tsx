import {Route,Routes,Navigate} from 'react-router';
import MainLayout from './common/layouts/MainLayout';
import StyleGuide from './pages/StyleGuide';
import NotFound from './pages/NotFound';
import Dashboard from './pages/Dashboard';
import Forecasting from './pages/Forecasting';
import Momentum from './pages/Momentum';
import Settings from './pages/Settings';

const AppRoutes = () => {
  return (
      <Routes>
        
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/Dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/forecasting" element={<Forecasting />} />
          <Route path="/momentum" element={<Momentum />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

          <Route path="/style-guide" element={<StyleGuide />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
  );
};

export default AppRoutes;