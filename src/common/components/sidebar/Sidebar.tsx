import { NavLink } from 'react-router';
import Button from '../Button';
import './Sidebar.css';
import { IoIosSettings } from "react-icons/io";
import { IoStatsChartSharp } from "react-icons/io5";
import { FaGaugeSimple } from "react-icons/fa6";
import { MdDashboard } from "react-icons/md";



const Sidebar = ({ isOpen }) => {
 
  return (
    <div className={`sidebar ${isOpen ? "open" : "collapsed"}`}>
      <nav>
        <ul>
          <li>
            <Button className="Button">
              <NavLink to="/dashboard">
                <MdDashboard className="icon" />
                Dashboard
              </NavLink>
            </Button>
          </li>
          <li>
            <Button className="Button">
              <NavLink to="/forecasting">
                <IoStatsChartSharp className="icon" />
                Forecasting
              </NavLink>
            </Button>
          </li>
          <li>
            <Button className="Button">
              <NavLink to="/momentum">
                <FaGaugeSimple className="icon" />
                Momentum
              </NavLink>
            </Button>
          </li>
          <li>
            <Button className="Button">
              <NavLink to="/settings">
                <IoIosSettings className='icon' />
                Settings
              </NavLink>
            </Button>
          </li>
          <li>
            <Button className="Button">
              <NavLink to="/style-guide">Style Guide</NavLink>
            </Button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;