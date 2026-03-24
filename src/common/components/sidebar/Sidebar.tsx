import { NavLink } from "react-router";
import { IoIosSettings } from "react-icons/io";
import { IoStatsChartSharp } from "react-icons/io5";
import { FaGaugeSimple } from "react-icons/fa6";
import { MdDashboard } from "react-icons/md";
import { HiCode } from "react-icons/hi"; // For Style Guide
import "./Sidebar.css";

const Sidebar = ({ isOpen }) => {
  return (
    <div className={`sidebar ${isOpen ? "open" : "collapsed"}`}>
      <div className="sidebar-label">NAVIGATION MENU</div>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <MdDashboard className="icon" />
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/forecasting"
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <IoStatsChartSharp className="icon" />
              <span>Forecasting</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/momentum"
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <FaGaugeSimple className="icon" />
              <span>Momentum</span>
            </NavLink>
          </li>
          <div className="sidebar-divider" />
          <li>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <IoIosSettings className="icon settings-icon" />
              <span>Settings</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/style-guide"
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <HiCode className="icon" />
              <span>Style Guide</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
