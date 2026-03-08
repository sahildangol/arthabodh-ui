import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { IoIosArrowDropdown } from "react-icons/io";
import { getStockData } from "../../services/stockService";
import "./Forecasting.css";

const Forecasting = () => {
  const [symbol, setSymbol] = useState("SBL");
  const [isOpen, setIsOpen] = useState(false);
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [predictionStart, setPredictionStart] = useState<string | null>(null);

  const bankOptions = [
    { id: "SBL", name: "Siddhartha Bank" },
    { id: "PRVU", name: "Prabhu Bank" },
    { id: "NABIL", name: "Nabil Bank" },
    { id: "NIMB", name: "Nepal Investment Mega Bank" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await getStockData(symbol);
      const firstPredicted = data.find((item: any) => item.is_predicted);
      setPredictionStart(firstPredicted ? firstPredicted.x : null);

      setSeries([{ name: "Price", data: data }]);
      setLoading(false);
    };
    fetchData();
  }, [symbol]);

  const chartOptions: any = {
    chart: {
      type: "candlestick",
      height: 400,
      toolbar: { show: true, tools: { download: false } },
      background: "transparent",
    },
    theme: { mode: "dark" },
    xaxis: {
      type: "category",
      labels: { style: { colors: "#888" } },
      crosshairs: { show: true },
    },
    yaxis: {
      opposite: true,
      labels: {
        style: { colors: "#888" },
        formatter: (val: number) => `Rs. ${val.toFixed(0)}`,
      },
    },
    annotations: {
      xaxis: [
        {
          x: predictionStart,
          x2: series[0]?.data[series[0].data.length - 1]?.x,
          fillColor: "#feb019",
          opacity: 0.15,
          position: "back",
          label: {
            text: "AI Forecast",
            borderWidth: 0,
            style: { color: "#fff", background: "#feb019" },
          },
        },
      ],
    },
    plotOptions: {
      candlestick: { colors: { upward: "#4ade80", downward: "#ef4444" } },
    },
    grid: { borderColor: "#222" },
    tooltip: { theme: "dark", shared: true },
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-title">
            <h1>Market Analysis</h1>
            <p>{symbol} Technical View</p>
          </div>
        </header>

        <section className="chart-card">
          {loading ? (
            <div className="loading-state">Loading {symbol} Data...</div>
          ) : (
            <div className="chart-wrapper">
              <Chart
                options={chartOptions}
                series={series}
                type="candlestick"
                height={500} 
              />
            </div>
          )}
        </section>
      </div>

      <div className="custom-dropdown-wrapper">
        <div className="dropdown-trigger" onClick={() => setIsOpen(!isOpen)}>
          <span>
            {bankOptions.find((b) => b.id === symbol)?.name || symbol}
          </span>
          <IoIosArrowDropdown
            className={`dropdown-icon ${isOpen ? "open" : ""}`}
          />
        </div>

        {isOpen && (
          <ul className="dropdown-menu">
            {bankOptions.map((bank) => (
              <li
                key={bank.id}
                className={`dropdown-item ${symbol === bank.id ? "selected" : ""}`}
                onClick={() => {
                  setSymbol(bank.id);
                  setIsOpen(false);
                }}
              >
                {bank.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Forecasting;
