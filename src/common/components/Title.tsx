import React from "react";
import { useNavigate } from "react-router";
import { Twirl as Hamburger } from "hamburger-react";
import { FaUserCircle, FaSignOutAlt } from "react-icons/fa";

export const Title = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Extract User ID from JWT Payload
  const userId = (() => {
    if (!token) return "GUEST";
    try {
      const payload = JSON.parse(
        window.atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      return payload.user_id || "GUEST";
    } catch {
      return "ERR";
    }
  })();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  
  const baseButtonStyle: React.CSSProperties = {
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.7rem",
    fontWeight: 700,
    transition: "all 0.2s ease",
    letterSpacing: "0.5px",
    fontFamily: "'Inter', sans-serif", 
    textTransform: "uppercase",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  };

  return (
    <div
      className="title-container"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        display: "flex",
        width: "100%",
        height: "60px",
        backgroundColor: "#111318", // Matching your Sidebar bg
        color: "#e3e6eb",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 20px",
        zIndex: 1000,
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
      }}
    >
      {/* LEFT: BRANDING */}
      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
        <Hamburger
          toggled={isOpen}
          toggle={setIsOpen}
          size={20}
          color="#9ba1ad"
        />
        <h1
          style={{
            fontSize: "1.1rem",
            margin: 0,
            letterSpacing: "3px",
            fontWeight: 800,
            color: "#ffffff",
          }}
        >
          ARTHABODH
        </h1>
      </div>

      {/* RIGHT: ACTIONS */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Subdued User Indicator */}
        <button
          onClick={() => navigate("/settings")}
          style={{
            ...baseButtonStyle,
            background: "rgba(255, 255, 255, 0.03)",
            color: "#9ba1ad",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.color = "#ffffff";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
            e.currentTarget.style.color = "#9ba1ad";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
          }}
        >
          <FaUserCircle size={14} style={{ opacity: 0.7 }} />
          <span style={{ opacity: 0.8 }}>ID: {userId}</span>
        </button>

        {/* Muted Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            ...baseButtonStyle,
            background: "transparent",
            color: "#6a717d",
            padding: "6px 10px",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = "#ff4444";
            e.currentTarget.style.background = "rgba(255, 68, 68, 0.05)";
            e.currentTarget.style.borderColor = "rgba(255, 68, 68, 0.2)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = "#6a717d";
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
          }}
        >
          <FaSignOutAlt size={14} />
        </button>
      </div>
    </div>
  );
};
