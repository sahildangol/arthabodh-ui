import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { IoIosArrowDropdown } from "react-icons/io";
import { FaChartLine, FaHistory } from "react-icons/fa";
import { getStockData } from "../../services/stockService";
import { generateMockCandlestickData } from "../../common/utils/chartUtils";
import "./Forecasting.css";

const API_BASE = "http://localhost:8001";

const Forecasting = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState(15);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await fetch(`${API_BASE}/company/`);
        const data = await res.json();
        setCompanies(data);
        if (data.length > 0) setSelectedCompany(data[0]);
      } catch (err) {
        console.error("Init Error:", err);
      }
    };
    loadCompanies();
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    const updateGraph = async () => {
      setLoading(true);
      const realData = await getStockData(selectedCompany.company_id);
      if (realData && realData.length > 0) {
        setSeries([{ data: realData.slice(-timeframe) }]);
        setIsMock(false);
      } else {
        setSeries([
          {
            data: generateMockCandlestickData(
              selectedCompany.company_id,
              timeframe,
            ),
          },
        ]);
        setIsMock(true);
      }
      setRecent((prev) => {
        const filtered = prev.filter(
          (c) => c.symbol !== selectedCompany.symbol,
        );
        return [selectedCompany, ...filtered].slice(0, 3);
      });
      setLoading(false);
    };
    updateGraph();
  }, [selectedCompany, timeframe]);

  const chartOptions: any = {
    chart: {
      type: "candlestick",
      background: "transparent",
      toolbar: { show: false },
      animations: { enabled: false },
    },
    xaxis: {
      type: "datetime",
      labels: { style: { colors: "#9ba1ad", fontSize: "10px" } },
      axisBorder: { show: false },
    },
    yaxis: {
      opposite: true,
      labels: { style: { colors: "#9ba1ad", fontSize: "10px" } },
    },
    plotOptions: {
      candlestick: { colors: { upward: "#00ffbd", downward: "#ff3b69" } },
    },
    grid: { borderColor: "rgba(255,255,255,0.05)", strokeDashArray: 4 },
    theme: { mode: "dark" },
  };

  return (
    <div className="f-container">
      <main className="f-main">
        <header className="f-header">
          <div className="f-title-group">
            <h2>FORECASTING ANALYSIS</h2>
            <p>
              Showing:{" "}
              <span>{selectedCompany?.company_name || "---"}</span>
            </p>
          </div>
          <div className={`f-status-badge ${isMock ? "warning" : "live"}`}>
            {isMock ? "SIMULATED_DATA" : "LIVE_MARKET"}
          </div>
        </header>

        <div className="f-grid">
          {/* Main Chart Section */}
          <section className="f-card f-chart-area">
            <div className="f-card-header">
              <div className="f-label">
                CANDLESTICK GRAPH
              </div>
              <div className="f-actions">
                {[7, 15, 30].map((d) => (
                  <button
                    key={d}
                    className={`f-tab ${timeframe === d ? "active" : ""}`}
                    onClick={() => setTimeframe(d)}
                  >
                    {d}D
                  </button>
                ))}
              </div>
            </div>
            <div className="f-chart-wrapper">
              {loading ? (
                <div className="f-loader">Loading...</div>
              ) : (
                <Chart
                  options={chartOptions}
                  series={series}
                  type="candlestick"
                  height="100%"
                />
              )}
            </div>
          </section>

          {/* Sidebar Controls */}
          <aside className="f-controls">
            <div className="f-card">
              <label className="f-field-label">SELECT STOCK</label>
              <div
                className="f-dropdown-trigger"
                onClick={() => setIsOpen(!isOpen)}
              >
                <span>{selectedCompany?.symbol || "CHOOSE"}</span>
                <IoIosArrowDropdown className={isOpen ? "rotate" : ""} />
              </div>
              {isOpen && (
                <ul className="f-dropdown-list">
                  {companies.map((comp) => (
                    <li
                      key={comp.company_id}
                      onClick={() => {
                        setSelectedCompany(comp);
                        setIsOpen(false);
                      }}
                    >
                      {comp.symbol}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="f-card">
              <label className="f-field-label">
                RECENTLY VIEWED
              </label>
              <div className="f-history-list">
                {recent.map((r) => (
                  <div
                    key={r.symbol}
                    className={`f-history-item ${r.symbol === selectedCompany?.symbol ? "active" : ""}`}
                    onClick={() => setSelectedCompany(r)}
                  >
                    <span className="dot" /> {r.symbol}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Forecasting;
