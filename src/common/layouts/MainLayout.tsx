import { useState } from "react";
import { Outlet } from "react-router";
import Sidebar from "../components/sidebar/Sidebar";
import { Title } from "../components/Title";
import "./MainLayout.css";

const MainLayout = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="layout-shell">
      <Title isOpen={isOpen} setIsOpen={setIsOpen} />

      <div className="layout-body">
        <Sidebar isOpen={isOpen} />

        <main
          className="layout-main"
          style={{
            marginLeft: isOpen ? "240px" : "0px",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
