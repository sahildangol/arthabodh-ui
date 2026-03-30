import { useEffect, useMemo, useState } from "react";
import { BiLoaderAlt } from "react-icons/bi";
import { useCompanyWatchlist } from "../../common/hooks/useCompanyWatchlist";
import {
  MarketPreferenceService,
  type Company,
} from "../../services/marketPreferenceService";
import "./Dashboard.css";

type SignalPayload = {
  signal?: string;
  direction?: string;
  prob_up?: number | string | null;
  prob_down?: number | string | null;
  prob_momentum?: number | string | null;
  prob_direction?: number | string | null;
  model_score?: number | string | null;
  close?: number | string | null;
  return_magnitude?: number | string | null;
  return_magnitude_pct?: string;
  timeline_10d?: Array<{
    point_type?: string;
    volume?: number | string | null;
  }>;
  forecast_next_5d?: Array<{
    predicted_close?: number | string | null;
  }>;
};

type AdvancedPredictionResponse = {
  symbol?: string;
  generated_at?: string;
  prediction_date?: string;
  from_cache?: boolean;
  selected_signal?: SignalPayload | null;
  past_5_days?: Array<{
    close?: number | string | null;
    volume?: number | string | null;
  }>;
};

type PredictionSummary = {
  symbol: string;
  companyName: string;
  changePct: number;
  confidencePct: number;
  direction: "UP" | "DOWN" | "NEUTRAL";
  label: string;
  volume?: number;
};

type DashboardView = {
  avgReturnPct: number;
  positiveSignals: number;
  totalSignals: number;
  avgDailyVolume: number;
  sentiment: string;
  sentimentTone: "pos" | "neu" | "neg";
  topGainers: PredictionSummary[];
  topMomentum: PredictionSummary[];
  generatedAt: string;
  isLive: boolean;
  mockMode: boolean;
};

type WatchlistCompany = {
  symbol: string;
  companyName: string;
};

const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const toPercentNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = Number(value.replace("%", "").trim());
    if (Number.isFinite(normalized)) return normalized;
  }
  return null;
};

const formatDateTime = (value?: string) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return new Intl.DateTimeFormat("en", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
};

const formatSignedPercent = (value: number) => {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
};

const formatCompactVolume = (value: number) => {
  if (!Number.isFinite(value)) return "--";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
};

const deriveLabel = (direction: "UP" | "DOWN" | "NEUTRAL", confidencePct: number) => {
  if (direction === "UP" && confidencePct >= 82) return "Strong Buy";
  if (direction === "UP" && confidencePct >= 60) return "Buy";
  if (direction === "DOWN" && confidencePct >= 82) return "Strong Sell";
  if (direction === "DOWN" && confidencePct >= 60) return "Sell";
  return "Neutral";
};

const parsePredictionSummary = (
  raw: unknown,
  company: Company,
): PredictionSummary | null => {
  if (!raw || typeof raw !== "object") return null;
  const payload = raw as AdvancedPredictionResponse;
  const signal = payload.selected_signal;
  if (!signal) return null;

  const probUp =
    toNumber(signal.prob_up)
    ?? toNumber(signal.prob_direction)
    ?? toNumber(signal.prob_momentum)
    ?? 0.5;
  const probDown =
    toNumber(signal.prob_down)
    ?? (1 - probUp);

  const normalizedUp = clamp(probUp, 0, 1);
  const normalizedDown = clamp(probDown, 0, 1);
  const confidencePct = clamp(Math.max(normalizedUp, normalizedDown) * 100, 0, 100);

  const score = normalizedUp - normalizedDown;
  const inferredDirection: PredictionSummary["direction"] =
    score > 0.05 ? "UP" : score < -0.05 ? "DOWN" : "NEUTRAL";

  const rawDirection = (signal.direction || signal.signal || inferredDirection)
    .toUpperCase()
    .trim();

  const direction: PredictionSummary["direction"] =
    rawDirection === "UP"
      ? "UP"
      : rawDirection === "DOWN"
        ? "DOWN"
        : inferredDirection;

  let changePct = toPercentNumber(signal.return_magnitude_pct);
  if (changePct === null) {
    const returnMagnitude = toNumber(signal.return_magnitude);
    if (typeof returnMagnitude === "number") {
      changePct = returnMagnitude <= 1 ? returnMagnitude * 100 : returnMagnitude;
    }
  }

  if (changePct === null) {
    const latestClose = toNumber(signal.close) ?? toNumber(payload.past_5_days?.[4]?.close);
    const day5Close = toNumber(signal.forecast_next_5d?.[4]?.predicted_close);
    if (
      typeof latestClose === "number"
      && latestClose !== 0
      && typeof day5Close === "number"
    ) {
      changePct = ((day5Close - latestClose) / latestClose) * 100;
    }
  }

  const volumePoint = signal.timeline_10d
    ?.slice()
    .reverse()
    .find((point) => point.point_type === "history" && toNumber(point.volume) !== null);
  const latestVolume =
    toNumber(volumePoint?.volume)
    ?? toNumber(payload.past_5_days?.[payload.past_5_days.length - 1]?.volume)
    ?? undefined;

  const modelScore = toNumber(signal.model_score);
  const modelConfidencePct =
    typeof modelScore === "number"
      ? clamp(modelScore <= 1 ? modelScore * 100 : modelScore, 0, 100)
      : confidencePct;

  return {
    symbol: payload.symbol || company.symbol,
    companyName: company.company_name || "Listed Company",
    changePct: changePct ?? 0,
    confidencePct: modelConfidencePct,
    direction,
    label: deriveLabel(direction, modelConfidencePct),
    volume: latestVolume,
  };
};

const sentimentFromRatio = (ratio: number) => {
  if (ratio >= 0.72) return { text: "Strong Bullish", tone: "pos" as const };
  if (ratio >= 0.55) return { text: "Cautious Optimism", tone: "pos" as const };
  if (ratio >= 0.42) return { text: "Neutral", tone: "neu" as const };
  if (ratio >= 0.26) return { text: "Mild Caution", tone: "neg" as const };
  return { text: "Risk-Off", tone: "neg" as const };
};

const buildMockSummaries = (companies: Company[]): PredictionSummary[] =>
  companies.slice(0, 8).map((company, index) => ({
    symbol: company.symbol,
    companyName: company.company_name || "Listed Company",
    changePct: 5 - index * 0.8,
    confidencePct: 86 - index * 2.1,
    direction: index < 5 ? "UP" : "DOWN",
    label: index < 2 ? "Strong Buy" : index < 5 ? "Buy" : "Sell",
    volume: 85000 + index * 2200,
  }));

const Dashboard = () => {
  const {
    companyOptions,
    watchlist,
    loading: companyLoading,
    ensureInWatchlist,
  } = useCompanyWatchlist();
  const [dashboardView, setDashboardView] = useState<DashboardView | null>(null);
  const [loading, setLoading] = useState(false);
  const [watchQuery, setWatchQuery] = useState("");
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);

  const activeWatchSymbols = useMemo(
    () =>
      new Set(
        watchlist
          .filter((item) => item.is_active)
          .map((item) => item.symbol?.toUpperCase())
          .filter((symbol): symbol is string => Boolean(symbol)),
      ),
    [watchlist],
  );

  const watchlistCompanies = useMemo(() => {
    const bySymbol = new Map<string, WatchlistCompany>();

    for (const item of watchlist) {
      if (!item.is_active) continue;
      const symbol = item.symbol?.toUpperCase();
      if (!symbol) continue;

      bySymbol.set(symbol, {
        symbol,
        companyName: item.company_name || "Listed Company",
      });
    }

    for (const company of companyOptions) {
      if (!activeWatchSymbols.has(company.symbol)) continue;
      const existing = bySymbol.get(company.symbol);

      bySymbol.set(company.symbol, {
        symbol: company.symbol,
        companyName:
          company.company_name
          || existing?.companyName
          || "Listed Company",
      });
    }

    return [...bySymbol.values()].sort((left, right) =>
      left.symbol.localeCompare(right.symbol),
    );
  }, [watchlist, companyOptions, activeWatchSymbols]);

  const watchlistCandidates = useMemo(() => {
    const query = watchQuery.trim().toLowerCase();

    return companyOptions
      .filter((company) => !activeWatchSymbols.has(company.symbol))
      .filter((company) => {
        if (!query) return true;

        const companyName = company.company_name?.toLowerCase() || "";
        return (
          company.symbol.toLowerCase().includes(query)
          || companyName.includes(query)
        );
      });
  }, [companyOptions, activeWatchSymbols, watchQuery]);

  const targetCompanies = useMemo(() => {
    const prioritized = activeWatchSymbols.size
      ? companyOptions.filter((company) => activeWatchSymbols.has(company.symbol))
      : companyOptions;

    return prioritized.slice(0, 8);
  }, [companyOptions, activeWatchSymbols]);

  const targetKey = useMemo(
    () => targetCompanies.map((company) => company.symbol).join("|"),
    [targetCompanies],
  );

  useEffect(() => {
    if (!targetCompanies.length) return;
    let cancelled = false;

    const loadOverview = async () => {
      setLoading(true);
      let isLive = false;
      let mockMode = false;

      try {
        const liveOverview = await MarketPreferenceService.getLiveOverview();
        const rawIndex =
          liveOverview
          && typeof liveOverview === "object"
          && (liveOverview as Record<string, unknown>).index
            ? (liveOverview as Record<string, unknown>).index
            : null;

        const nepse =
          rawIndex && typeof rawIndex === "object"
            ? (rawIndex as Record<string, unknown>)["NEPSE Index"] as Record<string, unknown> | undefined
            : undefined;

        const perChange = toNumber(nepse?.perChange);
        isLive = typeof perChange === "number" ? perChange !== 0 : false;
      } catch {
        isLive = false;
      }

      const predictions = await Promise.all(
        targetCompanies.map(async (company) => {
          try {
            const payload = await MarketPreferenceService.getAdvancedPrediction(company.symbol);
            return parsePredictionSummary(payload, company);
          } catch {
            return null;
          }
        }),
      );

      let summaries = predictions.filter(
        (entry): entry is PredictionSummary => Boolean(entry),
      );

      if (!summaries.length) {
        summaries = buildMockSummaries(targetCompanies);
        mockMode = true;
      }

      if (cancelled) return;

      const avgReturnPct =
        summaries.reduce((sum, item) => sum + item.changePct, 0) / summaries.length;
      const positiveSignals = summaries.filter(
        (item) => item.direction === "UP" || item.changePct >= 0,
      ).length;
      const ratio = positiveSignals / summaries.length;
      const sentiment = sentimentFromRatio(ratio);
      const avgDailyVolume =
        summaries.reduce((sum, item) => sum + (item.volume ?? 0), 0) / summaries.length;

      const topGainers = [...summaries]
        .sort((left, right) => right.changePct - left.changePct)
        .slice(0, 3);

      const topMomentum = [...summaries]
        .sort((left, right) => right.confidencePct - left.confidencePct)
        .slice(0, 3);

      setDashboardView({
        avgReturnPct,
        positiveSignals,
        totalSignals: summaries.length,
        avgDailyVolume,
        sentiment: sentiment.text,
        sentimentTone: sentiment.tone,
        topGainers,
        topMomentum,
        generatedAt: new Date().toISOString(),
        isLive,
        mockMode,
      });
      setLoading(false);
    };

    loadOverview();
    const interval = setInterval(loadOverview, 120000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [targetKey, targetCompanies]);

  const isBusy = loading || (companyLoading && !dashboardView);

  const handleAddToWatchlist = async (company: Company) => {
    setAddingSymbol(company.symbol);

    try {
      await ensureInWatchlist(company, "Dashboard watchlist add");
      setWatchQuery("");
    } catch (error) {
      console.warn("Unable to add company to watchlist:", error);
    } finally {
      setAddingSymbol(null);
    }
  };

  if (isBusy) {
    return (
      <div className="d2-loader">
        <BiLoaderAlt className="spin-icon" />
        <p>Loading dashboard intelligence...</p>
      </div>
    );
  }

  if (!dashboardView) {
    return (
      <div className="d2-loader">
        <p>No dashboard data available right now.</p>
      </div>
    );
  }

  return (
    <div className="d2-page">
      <header className="d2-header">
        <h1>Overview</h1>
        <p>AI-powered intelligence for NEPSE commercial bank stocks</p>
        <div className="d2-meta">
          <span>Last Updated: {formatDateTime(dashboardView.generatedAt)}</span>
          <span className={dashboardView.isLive ? "live" : "offline"}>
            {dashboardView.mockMode ? "Simulated Feed" : dashboardView.isLive ? "Live Feed" : "Market Closed"}
          </span>
        </div>
      </header>

      <section className="d2-kpi-grid">
        <div className="d2-kpi-card">
          <span>Avg. Return (7D)</span>
          <strong className={dashboardView.avgReturnPct >= 0 ? "pos" : "neg"}>
            {formatSignedPercent(dashboardView.avgReturnPct)}
          </strong>
        </div>

        <div className="d2-kpi-card">
          <span>Positive Signals</span>
          <strong>
            {dashboardView.positiveSignals}
            <small> / {dashboardView.totalSignals}</small>
          </strong>
        </div>

        <div className="d2-kpi-card">
          <span>Avg. Daily Volume</span>
          <strong>{formatCompactVolume(dashboardView.avgDailyVolume)}</strong>
        </div>
      </section>

      <section className="d2-columns">
        <article className="d2-list-card">
          <h3>Top Predicted Gainers</h3>
          <div className="d2-list">
            {dashboardView.topGainers.map((item) => (
              <div key={item.symbol} className="d2-list-item">
                <div>
                  <div className="d2-symbol">{item.symbol}</div>
                  <div className="d2-company">{item.companyName}</div>
                </div>
                <div className="d2-right">
                  <div className={item.changePct >= 0 ? "pos" : "neg"}>
                    {formatSignedPercent(item.changePct)}
                  </div>
                  <div className="d2-sub">{item.confidencePct.toFixed(1)}% conf</div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="d2-list-card">
          <h3>Top Momentum Signals</h3>
          <div className="d2-list">
            {dashboardView.topMomentum.map((item) => (
              <div key={item.symbol} className="d2-list-item">
                <div>
                  <div className="d2-symbol">{item.symbol}</div>
                  <div className="d2-company">{item.companyName}</div>
                </div>
                <div className="d2-right">
                  <span className={`d2-pill ${item.direction === "DOWN" ? "sell" : "buy"}`}>
                    {item.label}
                  </span>
                  <div className="d2-sub">{item.confidencePct.toFixed(0)}% prob</div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="d2-watch-card">
        <div className="d2-watch-head">
          <div>
            <h3>Watchlist Manager</h3>
            <p>Add companies directly from dashboard.</p>
          </div>
          <span className="d2-watch-count">{watchlistCompanies.length} Active</span>
        </div>

        <div className="d2-watch-grid">
          <div className="d2-watch-panel">
            <label htmlFor="dashboard-watch-search">Add Company</label>
            <input
              id="dashboard-watch-search"
              type="text"
              value={watchQuery}
              onChange={(event) => setWatchQuery(event.target.value)}
              placeholder="Search by symbol or name"
            />

            <div className="d2-watch-list">
              {watchlistCandidates.length ? (
                watchlistCandidates.map((company) => (
                  <div key={company.company_id} className="d2-watch-row">
                    <div>
                      <strong>{company.symbol}</strong>
                      <span>{company.company_name || "Listed Company"}</span>
                    </div>
                    <button
                      type="button"
                      className="d2-add-btn"
                      disabled={addingSymbol === company.symbol}
                      onClick={() => {
                        void handleAddToWatchlist(company);
                      }}
                    >
                      {addingSymbol === company.symbol ? "Adding..." : "Add"}
                    </button>
                  </div>
                ))
              ) : (
                <p className="d2-watch-empty">No companies available to add.</p>
              )}
            </div>
          </div>

          <div className="d2-watch-panel">
            <label>Active Watchlist</label>
            <div className="d2-watch-list">
              {watchlistCompanies.length ? (
                watchlistCompanies.map((item) => (
                  <div key={item.symbol} className="d2-watch-row active">
                    <div>
                      <strong>{item.symbol}</strong>
                      <span>{item.companyName}</span>
                    </div>
                    <span className="d2-tag">Active</span>
                  </div>
                ))
              ) : (
                <p className="d2-watch-empty">No active watchlist companies yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
