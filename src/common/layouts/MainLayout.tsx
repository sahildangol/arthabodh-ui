import { useState } from "react";
import { Outlet } from "react-router";
import Sidebar from "../components/sidebar/Sidebar";
import { Title } from "../components/Title";

const MainLayout = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className="layout-container"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Title isOpen={isOpen} setIsOpen={setIsOpen} />

      <div
        style={{
          display: "flex",
          flex: 1, 
          marginTop: "60px",
          width: "100%",
        }}
      >
        <Sidebar isOpen={isOpen} />

        <main
          style={{
            flex: 1,
            padding: "20px",
            marginLeft: isOpen ? "250px" : "0px",
            transition: "margin-left 0.3s ease",
            display: "flex", 
            flexDirection: "column",
            minWidth: 0, 
            background: "var(--primary)", 
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
