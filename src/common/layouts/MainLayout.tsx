import { useState } from "react";
import { Outlet } from "react-router";
import Sidebar from "../components/sidebar/Sidebar";
import {Title} from "../components/Title";

const MainLayout = () => {
  const [isOpen, setIsOpen] = useState(true); // Control the global navigation state

  return (
    <div className="layout-container">
      <Title isOpen={isOpen} setIsOpen={setIsOpen} />

      <div style={{ display: 'flex', marginTop: '60px' }}> 
        <Sidebar isOpen={isOpen} />

        <main style={{ 
            flex: 1, 
            padding: '20px',
            marginLeft: isOpen ? '250px' : '0px', 
            transition: 'margin-left 0.3s ease' 
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;