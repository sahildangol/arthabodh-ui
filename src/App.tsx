import {Route,Routes,Navigate} from 'react-router';
import StyleGuide from './pages/StyleGuide';
import NotFound from './pages/NotFound';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/style-guide" />} />
      
      <Route path="/style-guide" element={<StyleGuide />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;