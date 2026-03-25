import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { ApexOptions } from "apexcharts";
import { IoIosArrowDropdown } from "react-icons/io";
import { generateFakeForecast } from "../../common/utils/fakeForecast";
import "./Forecasting.css";

const API_BASE = "http://localhost:8001";
// Placeholder for future live line endpoint
const LINE_API = "";

type Company = {
  company_id: number;
  symbol: string;
  company_name?: string;
};

type LinePoint = {
  x: string | number | Date;
  y: number;
  is_predicted?: boolean;
};

const SAMPLE_COMPANIES: Company[] = [
  {
    company_id: 1,
    symbol: "NABIL",
    company_name: "Nabil Bank",
  },
];

const SAMPLE_LINE_DATA: Record<string, LinePoint[]> = {
  NABIL: [
    { x: "2026-03-20", y: 450.5, is_predicted: false },
    { x: "2026-03-21", y: 455.2, is_predicted: false },
    { x: "2026-03-22", y: 448.0, is_predicted: false },
    { x: "2026-03-23", y: 462.1, is_predicted: true },
    { x: "2026-03-24", y: 459.8, is_predicted: true },
  ],
};

const normalizeLinePayload = (raw: unknown): LinePoint[] => {
  if (Array.isArray(raw)) {
    const first = raw[0] as any;
    if (first && Array.isArray(first.data)) {
      return (first.data as LinePoint[]) || [];
    }
    // Already an array of points
    if (raw.every((p: any) => p && p.x !== undefined && p.y !== undefined)) {
      return raw as LinePoint[];
    }
  }
  return [];
};

const buildFallbackSeries = (symbol: string, days: number): LinePoint[] => {
  if (SAMPLE_LINE_DATA[symbol]) {
    const sample = SAMPLE_LINE_DATA[symbol];
    if (days >= sample.length) return sample;
    const actual = sample.filter((p) => !p.is_predicted).slice(-(days - 2));
    const predicted = sample.filter((p) => p.is_predicted);
    return [...actual, ...predicted];
  }
  return generateFakeForecast(symbol || "SAMPLE", days);
};

const Forecasting = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [lineSeries, setLineSeries] = useState<{ name: string; data: LinePoint[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [recent, setRecent] = useState<Company[]>([]);
  const [timeframe, setTimeframe] = useState(7);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await fetch(`${API_BASE}/company/`);
        const data: Company[] = await res.json();
        const list = data.length ? data : SAMPLE_COMPANIES;
        setCompanies(list);
        if (list.length > 0) setSelectedCompany(list[0]);
      } catch (err) {
        console.error("Init Error:", err);
        setCompanies(SAMPLE_COMPANIES);
        setSelectedCompany(SAMPLE_COMPANIES[0]);
      }
    };
    loadCompanies();
  }, []);

  const companyListWithWatchlistFirst = useMemo(
    () => companies,
    [companies],
  );

  useEffect(() => {
    if (!selectedCompany) return;
    const updateGraph = async () => {
      setLoading(true);
      let usedMock = false;

      const lineData = await (async () => {
        try {
          if (!LINE_API) throw new Error("No line API path set");
          const res = await fetch(
            `${LINE_API}/${selectedCompany.company_id}?window=${timeframe}`,
          );
          if (!res.ok) throw new Error("Bad line response");
          const raw = await res.json();
          const parsed = normalizeLinePayload(raw);
          if (!parsed.length) throw new Error("Empty line data");
          return parsed;
        } catch {
          usedMock = true;
          return buildFallbackSeries(selectedCompany.symbol, timeframe);
        }
      })();
      const actualPoints = lineData
        .filter((p) => !p.is_predicted)
        .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());
      const predictedPoints = lineData
        .filter((p) => p.is_predicted)
        .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());

      if (predictedPoints.length) {
        const stitchedPredicted = [
          actualPoints[actualPoints.length - 1],
          ...predictedPoints,
        ];
        setLineSeries([
          { name: "Actual", data: actualPoints },
          { name: "Predicted", data: stitchedPredicted },
        ]);
      } else {
        setLineSeries([{ name: "Price", data: actualPoints }]);
      }

      setIsMock(usedMock);
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

  const fmtDate = (value?: string | number | Date) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const { displaySeries, displayOptions, range } = useMemo(() => {
    const series = lineSeries;

    const firstActual = series[0]?.data.find((p) => !p.is_predicted);
    const lastActual = [...(series[0]?.data || [])]
      .filter((p) => !p.is_predicted)
      .slice(-1)[0];
    const lastPredicted = [...(series[1]?.data || [])].slice(-1)[0];

    const base: ApexOptions = {
      chart: {
        background: "#0f1626",
        toolbar: { show: false },
        animations: { enabled: false },
        foreColor: "#e6edf7",
        parentHeightOffset: 0,
      },
      xaxis: {
        type: "datetime",
        labels: {
          style: {
            colors: "#e6edf7",
            fontSize: "11px",
            fontWeight: 700,
          },
          offsetY: 16,
        },
        title: {
          text: "Date",
          offsetY: 34,
          style: { fontSize: "12px", fontWeight: 800 },
        },
        axisBorder: { show: true, color: "#233149", height: 1 },
        axisTicks: { show: true, color: "#233149" },
      },
      yaxis: {
        opposite: false,
        title: {
          text: "Price",
          offsetX: -6,
          style: { fontSize: "12px", fontWeight: 800 },
        },
        labels: {
          style: { colors: "#e6edf7", fontSize: "11px", fontWeight: 700 },
        },
        axisBorder: { show: true, color: "#233149" },
        axisTicks: { show: true, color: "#233149" },
      },
      grid: {
        borderColor: "rgba(255,255,255,0.08)",
        strokeDashArray: 4,
        padding: { left: 12, right: 12, top: 12, bottom: 16 },
      },
      theme: { mode: "dark" },
    };

    const lineOptions: ApexOptions = {
      ...base,
      chart: { ...base.chart, type: "line" },
      stroke: {
        width: series.length > 1 ? [3, 3] : 3,
        curve: "smooth" as const,
        dashArray: series.length > 1 ? [0, 6] : 0,
      },
      markers: { size: 4, strokeWidth: 2, strokeColors: "#0c1f36" },
      colors: ["#1f6bff", "#f6ad55"],
      tooltip: {
        shared: true,
        intersect: false,
        theme: "light",
        marker: { show: false },
        style: { fontSize: "12px", color: "#0f172a" },
        fillSeriesColor: false,
      },
      legend: { show: false },
    };

    return {
      displaySeries: series,
      displayOptions: lineOptions,
      range: {
        start: firstActual?.x,
        actualEnd: lastActual?.x,
        forecastEnd: lastPredicted?.x || lastActual?.x,
      },
    };
  }, [lineSeries]);

  return (
    <div className="f-container">
      <main className="f-main">
        <header className="f-header">
          <div className="f-title-group">
            <h2>FORECASTING ANALYSIS</h2>
            <p>Short-term price path with live and projected points.</p>
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
                PRICE GRAPH
              </div>
              <div className="f-actions">
                <div className="f-segment">
                  {[7, 30].map((d) => (
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
            </div>
            <div className="f-chart-wrapper">
              {loading ? (
                <div className="f-loader">Loading...</div>
              ) : (
                <Chart
                  key={`${selectedCompany?.company_id}-${timeframe}`}
                  options={displayOptions}
                  series={displaySeries}
                  type="line"
                  height={300}
                  width="100%"
                />
              )}
            </div>
            <div className="f-chart-foot">
              <span className="accent">{selectedCompany?.symbol || "---"}</span>:{" "}
              {fmtDate(range.start)} → {fmtDate(range.forecastEnd)}
            </div>
          </section>

          {/* Sidebar Controls */}
          <aside className="f-controls">
            <div className="f-card">
              <div className="f-field-label-row">
                <label className="f-field-label">SELECT STOCK</label>
                <span className="f-field-hint">Pick any listed company</span>
              </div>
              <div
                className="f-dropdown-trigger"
                onClick={() => setIsOpen(!isOpen)}
              >
                <span>{selectedCompany?.symbol || "CHOOSE"}</span>
                <IoIosArrowDropdown className={isOpen ? "rotate" : ""} />
              </div>
              {isOpen && (
                <ul className="f-dropdown-list">
                  {companyListWithWatchlistFirst.map((comp) => (
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
