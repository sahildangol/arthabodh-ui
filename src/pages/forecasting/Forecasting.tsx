import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { IoIosArrowDropdown } from "react-icons/io";
import { generateFakeForecast } from "../../common/utils/fakeForecast";
import { useCompanyWatchlist } from "../../common/hooks/useCompanyWatchlist";
import {
  MarketPreferenceService,
  type Company,
} from "../../services/marketPreferenceService";
import "./Forecasting.css";

const HISTORY_WINDOW = 10;

type LinePoint = {
  x: string;
  y: number;
};

type TimelinePoint = {
  date?: string;
  point_type?: string;
  close?: number | string | null;
};

type ForecastPoint = {
  horizon_day?: number;
  forecast_date?: string;
  predicted_close?: number | string | null;
  predicted_return?: number | null;
};

type PastDayPoint = {
  date?: string;
  close?: number | string | null;
};

type Signal = {
  date?: string;
  close?: number | string | null;
  confidence?: string;
  model_score?: number | null;
  prob_up?: number | null;
  prob_down?: number | null;
  return_magnitude_pct?: string;
  timeline_10d?: TimelinePoint[] | null;
  forecast_next_5d?: ForecastPoint[] | null;
};

type AdvancedPredictionResponse = {
  symbol?: string;
  generated_at?: string;
  prediction_date?: string;
  from_cache?: boolean;
  selected_signal?: Signal | null;
  all_signals?: Signal[] | null;
  past_5_days?: PastDayPoint[] | null;
};

type ForecastRow = {
  day: number;
  date: string;
  close: number;
  changePct?: number;
};

type SignalTone = "buy" | "neutral" | "sell";
type ChartSeries = {
  name: string;
  type: "line" | "scatter" | "area";
  data: LinePoint[];
};

type ForecastViewData = {
  symbol: string;
  history: LinePoint[];
  current: LinePoint | null;
  forecast: LinePoint[];
  rows: ForecastRow[];
  generatedAt?: string;
  predictionDate?: string;
  fromCache: boolean;
  confidenceLabel: string;
  modelConfidencePct?: number;
  changePct?: number;
  currentPrice?: number;
  day5Price?: number;
  rangeLow?: number;
  rangeHigh?: number;
};

const isPresent = <T,>(value: T | null): value is T => value !== null;

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const toIsoDate = (value: unknown): string | null => {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const byDateAsc = (a: LinePoint, b: LinePoint) => {
  const left = new Date(a.x).getTime();
  const right = new Date(b.x).getTime();
  return left - right;
};

const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const parseTimelinePoints = (
  points: TimelinePoint[] | null | undefined,
  pointType: "history" | "forecast",
): LinePoint[] => {
  if (!Array.isArray(points)) return [];

  return points
    .map((point) => {
      if (point.point_type !== pointType) return null;
      const x = toIsoDate(point.date);
      const y = toNumber(point.close);
      if (!x || y === null) return null;

      return { x, y };
    })
    .filter(isPresent)
    .sort(byDateAsc);
};

const parsePastSeries = (points: PastDayPoint[] | null | undefined): LinePoint[] => {
  if (!Array.isArray(points)) return [];

  return points
    .map((point) => {
      const x = toIsoDate(point.date);
      const y = toNumber(point.close);
      if (!x || y === null) return null;
      return { x, y };
    })
    .filter(isPresent)
    .sort(byDateAsc);
};

const parseForecastRows = (
  points: ForecastPoint[] | null | undefined,
): ForecastRow[] => {
  if (!Array.isArray(points)) return [];

  return points
    .map((point, idx) => {
      const date = toIsoDate(point.forecast_date);
      const close = toNumber(point.predicted_close);
      if (!date || close === null) return null;

      const row: ForecastRow = {
        day: point.horizon_day ?? idx + 1,
        date,
        close,
      };

      if (typeof point.predicted_return === "number" && Number.isFinite(point.predicted_return)) {
        row.changePct = point.predicted_return * 100;
      }

      return row;
    })
    .filter((row): row is ForecastRow => Boolean(row))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

const parseForecastLine = (
  points: ForecastPoint[] | null | undefined,
): LinePoint[] => {
  if (!Array.isArray(points)) return [];

  return points
    .map((point) => {
      const x = toIsoDate(point.forecast_date);
      const y = toNumber(point.predicted_close);
      if (!x || y === null) return null;

      return { x, y };
    })
    .filter(isPresent)
    .sort(byDateAsc);
};

const parseCurrentPoint = (signal: Signal | null): LinePoint | null => {
  if (!signal) return null;

  const x = toIsoDate(signal.date);
  const y = toNumber(signal.close);

  if (!x || y === null) return null;

  return { x, y };
};

const mergeCurrentIntoHistory = (
  history: LinePoint[],
  current: LinePoint | null,
  historyWindow: number,
): LinePoint[] => {
  if (!current) {
    return history.slice(-historyWindow);
  }

  return [...history.filter((point) => point.x !== current.x), current]
    .sort(byDateAsc)
    .slice(-historyWindow);
};

const parseModelConfidence = (signal: Signal | null): number | undefined => {
  if (!signal) return undefined;

  if (typeof signal.model_score === "number" && Number.isFinite(signal.model_score)) {
    const normalized = signal.model_score <= 1 ? signal.model_score * 100 : signal.model_score;
    return clamp(normalized, 0, 100);
  }
  // If the backend does not supply a model_score, leave confidence undefined
  // instead of inferring from class probabilities. The UI will render "--".
  return undefined;
};

const parsePredictionResponse = (
  raw: unknown,
  symbol: string,
  historyWindow: number,
): ForecastViewData | null => {
  if (!raw || typeof raw !== "object") return null;

  const payload = raw as AdvancedPredictionResponse;
  const signal = payload.selected_signal ?? payload.all_signals?.[0] ?? null;

  let history = parseTimelinePoints(signal?.timeline_10d, "history");
  const currentFromSignal = parseCurrentPoint(signal);
  const timelineForecast = parseTimelinePoints(signal?.timeline_10d, "forecast");
  const forecastFromResponse = parseForecastLine(signal?.forecast_next_5d);

  if (!history.length) {
    history = parsePastSeries(payload.past_5_days);
  }

  history = mergeCurrentIntoHistory(history, currentFromSignal, historyWindow);

  const current = currentFromSignal ?? history[history.length - 1] ?? null;
  const forecastOnly = forecastFromResponse.length ? forecastFromResponse : timelineForecast;
  const forecast = current
    ? [current, ...forecastOnly.filter((point) => point.x !== current.x)]
    : [...forecastOnly];

  const rows = parseForecastRows(signal?.forecast_next_5d);
  const fallbackRows = !rows.length
    ? forecastOnly.map((point, idx) => ({
      day: idx + 1,
      date: String(point.x),
      close: point.y,
    }))
    : rows;

  const currentPrice = current?.y;
  const day5Price = fallbackRows[fallbackRows.length - 1]?.close;

  let changePct: number | undefined;
  if (
    typeof currentPrice === "number"
    && Number.isFinite(currentPrice)
    && currentPrice !== 0
    && typeof day5Price === "number"
    && Number.isFinite(day5Price)
  ) {
    changePct = ((day5Price - currentPrice) / currentPrice) * 100;
  } else if (signal?.return_magnitude_pct) {
    const numeric = Number(signal.return_magnitude_pct.replace("%", ""));
    if (Number.isFinite(numeric)) {
      changePct = numeric;
    }
  }

  const closesForRange = fallbackRows.map((row) => row.close);
  const rangeLow = closesForRange.length ? Math.min(...closesForRange) : undefined;
  const rangeHigh = closesForRange.length ? Math.max(...closesForRange) : undefined;

  if (!history.length && !current && !forecastOnly.length) {
    return null;
  }

  return {
    symbol: payload.symbol || symbol,
    history,
    current,
    forecast,
    rows: fallbackRows,
    generatedAt: payload.generated_at,
    predictionDate: payload.prediction_date,
    fromCache: Boolean(payload.from_cache),
    confidenceLabel: signal?.confidence?.toUpperCase() || "UNSPECIFIED",
    modelConfidencePct: parseModelConfidence(signal),
    changePct,
    currentPrice,
    day5Price,
    rangeLow,
    rangeHigh,
  };
};

const buildMockViewData = (symbol: string, historyWindow: number): ForecastViewData => {
  const seeded = generateFakeForecast(symbol, Math.max(historyWindow, 10), 0.35);
  const history = seeded
    .filter((point) => !point.is_predicted)
    .map((point) => ({ x: point.x, y: point.y }))
    .slice(-historyWindow);

  const forecastOnly = seeded
    .filter((point) => point.is_predicted)
    .map((point) => ({ x: point.x, y: point.y }));

  const current = history[history.length - 1] ?? null;
  const forecast = current ? [current, ...forecastOnly] : [...forecastOnly];

  const rows = forecastOnly.map((point, idx) => {
    const previous = idx === 0 ? current?.y : forecastOnly[idx - 1]?.y;
    const row: ForecastRow = {
      day: idx + 1,
      date: String(point.x),
      close: point.y,
    };

    if (typeof previous === "number" && previous !== 0) {
      row.changePct = ((point.y - previous) / previous) * 100;
    }

    return row;
  });

  const currentPrice = current?.y;
  const day5Price = rows[rows.length - 1]?.close;

  const changePct =
    typeof currentPrice === "number"
    && currentPrice !== 0
    && typeof day5Price === "number"
      ? ((day5Price - currentPrice) / currentPrice) * 100
      : undefined;

  const rangeLow = rows.length ? Math.min(...rows.map((row) => row.close)) : undefined;
  const rangeHigh = rows.length ? Math.max(...rows.map((row) => row.close)) : undefined;

  return {
    symbol,
    history,
    current,
    forecast,
    rows,
    predictionDate: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
    fromCache: false,
    confidenceLabel: "SIMULATED",
    modelConfidencePct: 67,
    changePct,
    currentPrice,
    day5Price,
    rangeLow,
    rangeHigh,
  };
};

const formatDate = (value?: string | number | Date) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatAxisDate = (value: string | number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en", {
    month: "numeric",
    day: "numeric",
  }).format(date);
};

const formatCurrency = (value?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `NPR ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPercent = (value?: number, digits = 2) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
};

const resolveSignalTone = (changePct?: number): SignalTone => {
  if (typeof changePct !== "number" || !Number.isFinite(changePct)) {
    return "neutral";
  }
  if (changePct > 0.05) return "buy";
  if (changePct < -0.05) return "sell";
  return "neutral";
};

const resolveRowClass = (changePct?: number) => {
  if (typeof changePct !== "number" || !Number.isFinite(changePct)) {
    return "";
  }
  if (changePct > 0.01) return "cell-pos";
  if (changePct < -0.01) return "cell-neg";
  return "cell-flat";
};

const Forecasting = () => {
  const {
    companyOptions,
    defaultCompany,
  } = useCompanyWatchlist();

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [recent, setRecent] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [viewData, setViewData] = useState<ForecastViewData | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  const selectedCompany = useMemo(() => {
    if (selectedSymbol) {
      const matched = companyOptions.find((company) => company.symbol === selectedSymbol);
      if (matched) return matched;
    }

    return defaultCompany ?? companyOptions[0] ?? null;
  }, [selectedSymbol, companyOptions, defaultCompany]);

  useEffect(() => {
    if (!selectedCompany) return;

    const controller = new AbortController();

    const loadPrediction = async () => {
      setLoading(true);
      setPredictionError(null);
      let usedMock = false;

      try {
        const payload = await MarketPreferenceService.getAdvancedPrediction(
          selectedCompany.symbol,
        );
        const parsed = parsePredictionResponse(payload, selectedCompany.symbol, HISTORY_WINDOW);

        if (!parsed) {
          setViewData(null);
          setIsMock(false);
          setPredictionError(
            `Prediction data is not available for ${selectedCompany.symbol} yet.`,
          );
          setLoading(false);
          return;
        }

        setViewData(parsed);
      } catch (error) {
        if (controller.signal.aborted) return;

        if (MarketPreferenceService.isPredictionUnavailableError(error)) {
          setViewData(null);
          setIsMock(false);
          setPredictionError(
            `Prediction is unavailable for ${selectedCompany.symbol} right now.`,
          );
          setLoading(false);
          return;
        }

        console.warn("Falling back to simulated forecast:", error);
        usedMock = true;
        setPredictionError("Live prediction failed. Showing simulated forecast.");
        setViewData(buildMockViewData(selectedCompany.symbol, HISTORY_WINDOW));
      }

      setIsMock(usedMock);
      setRecent((previous) => {
        const filtered = previous.filter((item) => item.symbol !== selectedCompany.symbol);
        return [selectedCompany, ...filtered].slice(0, 4);
      });
      setLoading(false);
    };

    loadPrediction();

    return () => {
      controller.abort();
    };
  }, [selectedCompany]);

  const series = (() => {
    if (!viewData) return [] as ChartSeries[];

    const output: ChartSeries[] = [];

    if (viewData.history.length) {
      output.push({ name: "Past Trend", type: "line", data: viewData.history });
    }

    if (viewData.current) {
      output.push({ name: "Current Price", type: "scatter", data: [viewData.current] });
    }

    if (viewData.forecast.length > 1) {
      output.push({ name: "Predicted Path", type: "line", data: viewData.forecast });
    }

    return output;
  })();

  const chartOptions = useMemo((): ApexOptions => {
    const historyColor = "#000000";
    const currentColor = "#2563eb";
    const forecastColor = "#ff0000";

    return {
      chart: {
        type: "line",
        background: "transparent",
        toolbar: { show: false },
        zoom: { enabled: false },
        parentHeightOffset: 0,
        animations: {
          enabled: true,
          speed: 380,
        },
        dropShadow: {
          enabled: false,
        },
      },
      colors: [historyColor, currentColor, forecastColor],
      stroke: {
        width: [3.5, 0, 4],
        curve: "smooth",
        lineCap: "butt",
        dashArray: [0, 0, 6],
      },
      fill: {
        type: ["solid", "solid", "solid"],
        opacity: [1, 1, 1],
      },
      markers: {
        size: [5.1, 8.5, 5.1],
        colors: [historyColor, currentColor, forecastColor],
        strokeColors: [historyColor, currentColor, forecastColor],
        strokeWidth: [0, 0, 0],
        hover: { sizeOffset: 4.25 },
      },
      xaxis: {
        type: "datetime",
        tickAmount: 6,
        labels: {
          style: {
            colors: "#0f172a",
            fontSize: "11px",
            fontWeight: 700,
          },
          formatter(value) {
            return formatAxisDate(value);
          },
        },
        axisBorder: {
          show: true,
          color: "#0f172a",
          height: 2,
        },
        axisTicks: {
          show: true,
          color: "#0f172a",
          height: 8,
        },
        crosshairs: {
          show: true,
          position: "back",
          stroke: {
            color: "#475569",
            width: 1,
            dashArray: 0,
          },
        },
      },
      yaxis: {
        tickAmount: 6,
        labels: {
          style: {
            colors: "#0f172a",
            fontSize: "11px",
            fontWeight: 700,
          },
          formatter(value) {
            return `NPR ${value.toFixed(0)}`;
          },
        },
      },
      grid: {
        borderColor: "#94a3b8",
        strokeDashArray: 2,
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: true,
          },
        },
        padding: {
          left: 12,
          right: 12,
          top: 12,
          bottom: 6,
        },
      },
      legend: {
        show: true,
        position: "bottom",
        horizontalAlign: "center",
        labels: { colors: "#334155" },
      },
      tooltip: {
        shared: false,
        intersect: false,
        followCursor: false,
        fixed: {
          enabled: false,
        },
        marker: {
          show: true,
        },
        x: {
          format: "dd MMM yyyy",
        },
        y: {
          formatter(value) {
            return `${value.toFixed(2)} NPR`;
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
    };
  }, [viewData]);

  const confidencePct = viewData?.modelConfidencePct;
  const confidenceWidth =
    typeof confidencePct === "number" && Number.isFinite(confidencePct)
      ? clamp(confidencePct, 0, 100)
      : 0;

  const signalTone = resolveSignalTone(viewData?.changePct);
  const changeClass =
    signalTone === "buy"
      ? "pos"
      : signalTone === "sell"
        ? "neg"
        : "flat";
  const signalLabel =
    signalTone === "buy"
      ? "Buy Zone"
      : signalTone === "sell"
        ? "Sell Zone"
        : "Neutral Zone";
  const feedBadgeClass =
    predictionError && !viewData ? "warning" : isMock ? "warning" : "live";
  const feedBadgeText =
    predictionError && !viewData
      ? "PREDICTION UNAVAILABLE"
      : isMock
        ? "SIMULATED FEED"
        : "LIVE FEED";

  return (
    <div className="f-container">
      <main className="f-main">
        <header className="f-header">
          <div className="f-title-group">
            <h2>Forecasting Engine</h2>
            <p>5-day price trajectory predictions powered by AutoTFT</p>
          </div>

          <div className="f-header-controls">
            <div className={`f-status-badge ${feedBadgeClass}`}>
              {feedBadgeText}
            </div>

            <div className="f-select-wrap">
              <span className="f-field-label">Select Asset</span>
              <button
                type="button"
                className="f-dropdown-trigger"
                onClick={() => setIsOpen((open) => !open)}
              >
                <span>{selectedCompany?.symbol || "CHOOSE"}</span>
                <IoIosArrowDropdown className={isOpen ? "rotate" : ""} />
              </button>

              {isOpen && (
                <ul className="f-dropdown-list">
                  {companyOptions.map((company) => (
                    <li
                      key={company.company_id}
                      onClick={() => {
                        setSelectedSymbol(company.symbol);
                        setIsOpen(false);
                      }}
                    >
                      <strong>{company.symbol}</strong>
                      <span>{company.company_name || "Listed Company"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </header>

        <div className="f-grid">
          <section className={`f-card f-chart-card tone-${signalTone}`}>
            <div className="f-card-header">
              <div>
                <p className="f-section-kicker">Trajectory & Signal Split</p>
                <p className="f-section-subtext">
                  Past 10 trading days, current spot, and upcoming predicted path.
                </p>
              </div>
            </div>

            <div className="f-legend-row">
              <div className={`f-signal-strip tone-${signalTone}`}>
                <span>Signal Bias</span>
                <strong>{signalLabel}</strong>
              </div>
              <span className="f-pill history">Past Trend</span>
              <span className="f-pill current">Current Price</span>
              <span className={`f-pill forecast forecast-${signalTone}`}>Predicted Path</span>
            </div>

            <div className={`f-chart-wrapper tone-${signalTone}`}>
              {loading ? (
                <div className="f-loader">Loading prediction graph...</div>
              ) : predictionError && !viewData ? (
                <div className="f-error">
                  <strong>Prediction Unavailable</strong>
                  <span>{predictionError}</span>
                </div>
              ) : (
                <Chart
                  key={`${selectedCompany?.symbol}-${HISTORY_WINDOW}`}
                  options={chartOptions}
                  series={series}
                  type="line"
                  height={370}
                  width="100%"
                />
              )}
            </div>

            <div className="f-chart-foot">
              <span>
                <strong>{viewData?.symbol || selectedCompany?.symbol || "---"}</strong>
              </span>
              <span>{formatDate(viewData?.history[0]?.x)}</span>
              <span>to</span>
              <span>{formatDate(viewData?.forecast[viewData?.forecast.length ? viewData.forecast.length - 1 : 0]?.x)}</span>
            </div>
          </section>

          <aside className="f-sidebar-stack">
            <section className={`f-card f-outlook-card tone-${signalTone}`}>
              <p className="f-section-kicker">5-Day Outlook</p>

              <div className={`f-change-value ${changeClass}`}>
                {formatPercent(viewData?.changePct)}
              </div>

              <div className="f-metric-block">
                <div className="f-metric-label">Model Confidence</div>
                <div className="f-metric-value">
                  {typeof confidencePct === "number" ? `${confidencePct.toFixed(1)}%` : "--"}
                </div>
                <div className="f-confidence-track">
                  <div
                    className="f-confidence-fill"
                    style={{ width: `${confidenceWidth}%` }}
                  />
                </div>
              </div>

              <div className="f-targets">
                <div className="f-target-row">
                  <span>Current</span>
                  <strong>{formatCurrency(viewData?.currentPrice)}</strong>
                </div>
                <div className="f-target-row">
                  <span>Day 5</span>
                  <strong>{formatCurrency(viewData?.day5Price)}</strong>
                </div>
                <div className="f-target-row">
                  <span>Range</span>
                  <strong>
                    {formatCurrency(viewData?.rangeLow)} - {formatCurrency(viewData?.rangeHigh)}
                  </strong>
                </div>
              </div>

              <div className="f-model-meta">
                <span>Prediction date: {formatDate(viewData?.predictionDate)}</span>
                <span>Model updated: {formatDate(viewData?.generatedAt)}</span>
                <span>
                  {predictionError && viewData
                    ? predictionError
                    : viewData?.fromCache
                      ? "Loaded from cache"
                      : "Fresh prediction"}
                </span>
              </div>
            </section>

            <section className="f-card">
              <label className="f-field-label">Recently Viewed</label>
              <div className="f-history-list">
                {recent.map((item) => (
                  <button
                    key={item.symbol}
                    type="button"
                    className={`f-history-item ${item.symbol === selectedCompany?.symbol ? "active" : ""}`}
                    onClick={() => setSelectedSymbol(item.symbol)}
                  >
                    <span className="dot" />
                    <span>{item.symbol}</span>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <section className="f-card f-table-card">
          <div className="f-table-title">Detailed Forecast</div>
          <div className="f-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Date</th>
                  <th>Forecast</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {viewData?.rows.length ? (
                  viewData.rows.map((row) => (
                    <tr key={`${row.day}-${row.date}`}>
                      <td>Day {row.day}</td>
                      <td>{formatDate(row.date)}</td>
                      <td>{formatCurrency(row.close)}</td>
                      <td className={resolveRowClass(row.changePct)}>
                        {formatPercent(row.changePct)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="f-empty-cell">No forecast rows available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Forecasting;
