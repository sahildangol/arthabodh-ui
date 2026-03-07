import { useNavigate } from "react-router"; // Import this
import { Twirl as Hamburger } from "hamburger-react";

export const Title = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate(); // Initialize the navigate function

  return (
    <div
      className="title-container"
      style={{
        position: "fixed",
        top: 0,
        display: "flex",
        width: "100%",
        height: "60px",
        backgroundColor: "var(--navbar-bg)",
        color: "var(--navbar-text)",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
        <Hamburger
          toggled={isOpen}
          toggle={setIsOpen}
          size={25}
          color="var(--navbar-text)"
        />
        <h1 style={{ fontSize: "2rem" }}>ArthaBodh</h1>
      </div>

      <div className="nav-actions">
        <button
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/login");
          }}
          style={{
            background: "transparent",
            color: "var(--navbar-text)",
            padding: "5px 15px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};
