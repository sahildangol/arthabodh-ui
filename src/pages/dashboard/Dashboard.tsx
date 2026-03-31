import { useEffect, useMemo, useState } from "react";
import { BiLoaderAlt } from "react-icons/bi";
import { MdInfoOutline } from "react-icons/md";
import { MarketPreferenceService } from "../../services/marketPreferenceService";
import "./Dashboard.css";

const LIVE_WINDOW_NOTICE = "Live feed updates 11:00-15:00 NPT on trading days.";
const DEFAULT_VISIBLE_MOVERS = 5;

type LiveIndexEntry = {
  name: string;
  close: number | null;
  change: number | null;
  perChange: number | null;
  high?: number | null;
  low?: number | null;
  previousClose?: number | null;
};

type LiveMover = {
  symbol: string;
  ltp: number | null;
  pointChange: number | null;
  percentageChange: number | null;
  securityName?: string;
};

type MarketSummaryItem = {
  label: string;
  value: string;
};

type DashboardView = {
  indices: LiveIndexEntry[];
  topGainers: LiveMover[];
  topLosers: LiveMover[];
  generatedAt: string;
  isLive: boolean;
  gainersCount: number;
  losersCount: number;
  marketStatusText: string;
  marketStatusAsOf?: string;
  marketSummaryItems: MarketSummaryItem[];
};

type RibbonQuote = LiveMover;

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
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

const formatSignedPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
};

const formatPrice = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  if (value >= 1000) return value.toFixed(1);
  return value.toFixed(2);
};

const formatCurrency = (value: number) =>
  `NPR ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatSummaryValue = (label: string, value: unknown) => {
  const numeric = toNumber(value);
  if (numeric !== null) {
    if (label.toLowerCase().includes("turnover")) {
      return formatCurrency(numeric);
    }

    return numeric.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
  }

  if (typeof value === "string") return value;
  return "--";
};

const parseIndices = (raw: unknown): LiveIndexEntry[] => {
  if (!raw || typeof raw !== "object") return [];
  const payload = raw as Record<string, unknown>;
  const indexBlock = payload.index;
  if (!indexBlock || typeof indexBlock !== "object") return [];

  return Object.entries(indexBlock as Record<string, unknown>)
    .map(([name, value]) => {
      if (!value || typeof value !== "object") return null;
      const row = value as Record<string, unknown>;
      return {
        name,
        close: toNumber(row.close),
        change: toNumber(row.change),
        perChange: toNumber(row.perChange),
        high: toNumber(row.high),
        low: toNumber(row.low),
        previousClose: toNumber(row.previousClose),
      };
    })
    .filter(Boolean) as LiveIndexEntry[];
};

const parseMovers = (raw: unknown): LiveMover[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;

      const symbol = typeof row.symbol === "string" ? row.symbol.trim().toUpperCase() : null;
      if (!symbol) return null;

      const ltp =
        toNumber(row.ltp)
        ?? toNumber(row.cp)
        ?? toNumber(row.lastTradedPrice)
        ?? toNumber(row.close);
      const previousClose = toNumber(row.previousClose);
      const pointChange =
        toNumber(row.pointChange)
        ?? (ltp !== null && previousClose !== null ? ltp - previousClose : null);

      return {
        symbol,
        ltp,
        pointChange,
        percentageChange: toNumber(row.percentageChange),
        securityName: typeof row.securityName === "string" ? row.securityName : undefined,
      };
    })
    .filter(Boolean) as LiveMover[];
};

const parseMarketSummary = (raw: unknown): MarketSummaryItem[] => {
  if (typeof raw === "string") {
    return [{ label: "Market Summary", value: raw }];
  }

  if (!raw || typeof raw !== "object") return [];

  return Object.entries(raw as Record<string, unknown>).map(([label, value]) => ({
    label: label.replace(/:$/, ""),
    value: formatSummaryValue(label, value),
  }));
};

const parseMarketStatus = (
  raw: unknown,
): { text: string; isLive: boolean; asOf?: string } => {
  if (typeof raw === "string") {
    const normalized = raw.trim().toUpperCase();
    return {
      text: normalized || "UNKNOWN",
      isLive: normalized === "OPEN",
    };
  }

  if (!raw || typeof raw !== "object") {
    return {
      text: "UNKNOWN",
      isLive: false,
    };
  }

  const row = raw as Record<string, unknown>;
  const status =
    typeof row.isOpen === "string"
      ? row.isOpen
      : typeof row.status === "string"
        ? row.status
        : "UNKNOWN";

  return {
    text: status.toUpperCase(),
    isLive: status.toUpperCase() === "OPEN",
    asOf: typeof row.asOf === "string" ? row.asOf : undefined,
  };
};

const resolveMarketStatusClass = (statusText?: string) => {
  const normalized = statusText?.trim().toUpperCase();
  if (normalized === "OPEN") return "live";
  if (normalized === "CLOSE" || normalized === "CLOSED") return "closed";
  return "offline";
};

export default function Dashboard() {
  const [dashboardView, setDashboardView] = useState<DashboardView | null>(null);
  const [ribbonQuotes, setRibbonQuotes] = useState<RibbonQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAllGainers, setShowAllGainers] = useState(false);
  const [showAllLosers, setShowAllLosers] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      setLoading(true);
      try {
        const [payload, liveFull, marketSummary, marketStatus] = await Promise.all([
          MarketPreferenceService.getLiveOverview(),
          MarketPreferenceService.getLiveFull().catch(() => []),
          MarketPreferenceService.getMarketSummary().catch(() => null),
          MarketPreferenceService.getIsNepseOpen().catch(() => null),
        ]);

        const parsedStatus = parseMarketStatus(marketStatus);
        const marketSummaryItems = parseMarketSummary(marketSummary);
        const isOverviewEmpty = Array.isArray(payload) && payload.length === 0;

        let indices: LiveIndexEntry[] = [];
        let allGainers: LiveMover[] = [];
        let allLosers: LiveMover[] = [];
        let isLive = parsedStatus.isLive;

        if (isOverviewEmpty) {
          const fullQuotes = parseMovers(liveFull);
          const sortedByPct = fullQuotes
            .filter((quote) => typeof quote.percentageChange === "number")
            .sort((left, right) => (right.percentageChange ?? 0) - (left.percentageChange ?? 0));
          allGainers = sortedByPct.filter((quote) => (quote.percentageChange ?? 0) >= 0);
          allLosers = sortedByPct.slice().reverse().filter((quote) => (quote.percentageChange ?? 0) < 0);
        } else {
          const resolvedPayload = payload as Record<string, unknown>;
          indices = parseIndices(resolvedPayload);
          allGainers = parseMovers(resolvedPayload.TopGainers);
          allLosers = parseMovers(resolvedPayload.TopLosers);

          if (!isLive) {
            const nepse = indices.find((idx) => idx.name === "NEPSE Index");
            isLive = typeof nepse?.perChange === "number"
              ? nepse.perChange !== 0
              : Boolean(allGainers.length);
          }
        }

        if (!cancelled) {
          setDashboardView({
            indices,
            topGainers: allGainers,
            topLosers: allLosers,
            generatedAt: new Date().toISOString(),
            isLive,
            gainersCount: allGainers.length,
            losersCount: allLosers.length,
            marketStatusText: parsedStatus.text,
            marketStatusAsOf: parsedStatus.asOf,
            marketSummaryItems,
          });

          const ribbon = parseMovers(liveFull);
          setRibbonQuotes(ribbon.length ? ribbon : [...allGainers, ...allLosers].slice(0, 30));
        }
      } catch (error) {
        console.warn("Unable to load live overview:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadOverview();
    const interval = setInterval(loadOverview, 120000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const isBusy = loading || !dashboardView;

  const nepseIndex = useMemo(
    () => dashboardView?.indices.find((idx) => idx.name === "NEPSE Index"),
    [dashboardView],
  );

  const sensitiveIndex = useMemo(
    () => dashboardView?.indices.find((idx) => idx.name === "Sensitive Index"),
    [dashboardView],
  );

  const breadth = useMemo(() => {
    const gainers = dashboardView?.gainersCount ?? 0;
    const losers = dashboardView?.losersCount ?? 0;
    const total = gainers + losers || 1;
    const ratio = gainers / total;
    const tone = gainers === losers ? "neu" : gainers > losers ? "pos" : "neg";
    return { gainers, losers, ratio, tone };
  }, [dashboardView]);

  if (isBusy) {
    return (
      <div className="d2-loader">
        <BiLoaderAlt className="spin-icon" />
        <p>Loading live market overview...</p>
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
        <div className="d2-header-left">
          <div>
            <h1>NEPSE Overview</h1>
            {!dashboardView.isLive && (
              <p className="d2-header-note">{LIVE_WINDOW_NOTICE}</p>
            )}
          </div>
        </div>
      </header>

      {ribbonQuotes.length > 0 && (
        <div className="d2-ribbon">
          <div className="d2-ribbon-track">
            {[...ribbonQuotes, ...ribbonQuotes].map((item, idx) => (
              <div key={`${item.symbol}-${idx}`} className="d2-ribbon-item">
                <span className="sym">{item.symbol}</span>
                <span className="ltp">{formatPrice(item.ltp)}</span>
                <span className={`chg ${(item.percentageChange ?? 0) >= 0 ? "pos" : "neg"}`}>
                  {formatSignedPercent(item.percentageChange ?? item.pointChange ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <section className="d2-kpi-grid">
        <div className="d2-kpi-card">
          <span>NEPSE Index</span>
          <strong className={nepseIndex && (nepseIndex.perChange ?? 0) >= 0 ? "pos" : "neg"}>
            {formatPrice(nepseIndex?.close ?? null)}
            <small>{formatSignedPercent(nepseIndex?.perChange ?? null)}</small>
          </strong>
        </div>

        <div className="d2-kpi-card">
          <span>Sensitive Index</span>
          <strong className={sensitiveIndex && (sensitiveIndex.perChange ?? 0) >= 0 ? "pos" : "neg"}>
            {formatPrice(sensitiveIndex?.close ?? null)}
            <small>{formatSignedPercent(sensitiveIndex?.perChange ?? null)}</small>
          </strong>
        </div>

        <div className="d2-kpi-card">
          <span>Gainers / Losers</span>
          <strong className={breadth.tone}>
            {breadth.gainers}:{breadth.losers}
          </strong>
        </div>

        <div className="d2-kpi-card">
          <h3>NEPSE Status</h3>
          <div
            className={`d2-market-status ${resolveMarketStatusClass(dashboardView.marketStatusText)}`}
          >
            {dashboardView.marketStatusText}
          </div>
          <p className="d2-kpi-note">As of {formatDateTime(dashboardView.marketStatusAsOf)}</p>
        </div>
      </section>

      <section className="d2-market-grid">
        <article className="d2-market-card">
          <h3>Market Summary</h3>
          {dashboardView.marketSummaryItems.length ? (
            <div className="d2-market-summary">
              {dashboardView.marketSummaryItems.map((item) => (
                <div key={item.label} className="d2-market-row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="d2-market-empty">Market summary is unavailable right now.</p>
          )}
        </article>
      </section>

      <section className="d2-columns">
        <article className="d2-list-card">
          <div className="d2-card-head inline">
            <h3>Top Gainers</h3>
            {dashboardView.topGainers.length > DEFAULT_VISIBLE_MOVERS && (
              <button
                type="button"
                className="d2-expand"
                onClick={() => setShowAllGainers((prev) => !prev)}
              >
                {showAllGainers ? "Show less" : "Show all"}
              </button>
            )}
          </div>
          {dashboardView.topGainers.length ? (
            <div className="d2-list">
              {(showAllGainers
                ? dashboardView.topGainers
                : dashboardView.topGainers.slice(0, DEFAULT_VISIBLE_MOVERS)).map((item) => (
                <div key={item.symbol} className="d2-list-item">
                  <div>
                    <div className="d2-symbol">{item.symbol}</div>
                    <div className="d2-company">{item.securityName || "Listed Company"}</div>
                  </div>
                  <div className="d2-right">
                    <div className="pos">{formatPrice(item.ltp)}</div>
                    <div className="d2-sub">{formatSignedPercent(item.percentageChange)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="d2-empty">
              <MdInfoOutline /> No gainers right now. {LIVE_WINDOW_NOTICE}
            </div>
          )}
        </article>

        <article className="d2-list-card">
          <div className="d2-card-head inline">
            <h3>Top Losers</h3>
            {dashboardView.topLosers.length > DEFAULT_VISIBLE_MOVERS && (
              <button
                type="button"
                className="d2-expand"
                onClick={() => setShowAllLosers((prev) => !prev)}
              >
                {showAllLosers ? "Show less" : "Show all"}
              </button>
            )}
          </div>
          {dashboardView.topLosers.length ? (
            <div className="d2-list">
              {(showAllLosers
                ? dashboardView.topLosers
                : dashboardView.topLosers.slice(0, DEFAULT_VISIBLE_MOVERS)).map((item) => (
                <div key={item.symbol} className="d2-list-item">
                  <div>
                    <div className="d2-symbol">{item.symbol}</div>
                    <div className="d2-company">{item.securityName || "Listed Company"}</div>
                  </div>
                  <div className="d2-right">
                    <div className="neg">{formatPrice(item.ltp)}</div>
                    <div className="d2-sub">{formatSignedPercent(item.percentageChange)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="d2-empty">
              <MdInfoOutline /> No losers right now. {LIVE_WINDOW_NOTICE}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
