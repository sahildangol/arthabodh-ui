import type { Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router";
import { Twirl as Hamburger } from "hamburger-react";
import { FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import "./Title.css";

type TitleProps = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

export const Title = ({ isOpen, setIsOpen }: TitleProps) => {
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

  return (
    <div className="title-bar">
      <div className="brand">
        <Hamburger
          toggled={isOpen}
          toggle={setIsOpen}
          size={20}
          color="var(--text-secondary)"
        />
        <h1 className="brand-title">ARTHABODH</h1>
      </div>

      <div className="title-actions">
        <button
          className="title-btn"
          onClick={() => navigate("/settings")}
        >
          <FaUserCircle size={14} style={{ opacity: 0.7 }} />
          <span style={{ opacity: 0.8 }}>ID: {userId}</span>
        </button>

        <button
          onClick={handleLogout}
          className="title-btn danger"
        >
          <FaSignOutAlt size={14} />
        </button>
      </div>
    </div>
  );
};
