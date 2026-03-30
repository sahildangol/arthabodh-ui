import { useEffect, useMemo, useState } from "react";
import { BiLoaderAlt } from "react-icons/bi";
import { MdInfoOutline } from "react-icons/md";
import { MarketPreferenceService } from "../../services/marketPreferenceService";
import "./Dashboard.css";

const LIVE_WINDOW_NOTICE = "Live feed updates 11:00–15:00 NPT on trading days.";

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

type DashboardView = {
  indices: LiveIndexEntry[];
  topGainers: LiveMover[];
  topLosers: LiveMover[];
  generatedAt: string;
  isLive: boolean;
  gainersCount: number;
  losersCount: number;
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

      return {
        symbol,
        ltp: toNumber(row.ltp) ?? toNumber(row.cp),
        pointChange: toNumber(row.pointChange),
        percentageChange: toNumber(row.percentageChange),
        securityName: typeof row.securityName === "string" ? row.securityName : undefined,
      };
    })
    .filter(Boolean) as LiveMover[];
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
        const [payload, liveFull] = await Promise.all([
          MarketPreferenceService.getLiveOverview(),
          MarketPreferenceService.getLiveFull().catch(() => []),
        ]);

        const isOverviewEmpty = Array.isArray(payload) && payload.length === 0;

        // When overview is empty, build gainers/losers from live-full and mark as closed.
        let indices: LiveIndexEntry[] = [];
        let allGainers: LiveMover[] = [];
        let allLosers: LiveMover[] = [];
        let isLive = false;

        if (isOverviewEmpty) {
          const fullQuotes = parseMovers(liveFull);
          const sortedByPct = fullQuotes
            .filter((q) => typeof q.percentageChange === "number")
            .sort((a, b) => (b.percentageChange ?? 0) - (a.percentageChange ?? 0));
          allGainers = sortedByPct.filter((q) => (q.percentageChange ?? 0) >= 0);
          allLosers = sortedByPct.slice().reverse().filter((q) => (q.percentageChange ?? 0) < 0);
        } else {
          const resolvedPayload = payload;
          indices = parseIndices(resolvedPayload);
          allGainers = parseMovers((resolvedPayload as Record<string, unknown>).TopGainers);
          allLosers = parseMovers((resolvedPayload as Record<string, unknown>).TopLosers);

          const nepse = indices.find((idx) => idx.name === "NEPSE Index");
          isLive = typeof nepse?.perChange === "number" ? nepse.perChange !== 0 : Boolean(allGainers.length);
        }

        const topGainers = allGainers.slice(0, 10);
        const topLosers = allLosers.slice(0, 10);

        if (!cancelled) {
          setDashboardView({
            indices,
            topGainers,
            topLosers,
            generatedAt: new Date().toISOString(),
            isLive,
            gainersCount: allGainers.length,
            losersCount: allLosers.length,
          });
          const ribbon = parseMovers(liveFull);
          setRibbonQuotes(ribbon.length ? ribbon : [...topGainers, ...topLosers].slice(0, 30));
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
        <div className="d2-header-left with-meta">
          <div>
            <h1>NEPSE Overview</h1>
          </div>
          <div className="d2-meta inline prominent">
            <span className={`tag ${dashboardView.isLive ? "live" : "offline"}`}>
              {dashboardView.isLive ? "Live" : "Closed"}
            </span>
            <span className="tag tag-strong">Updated: {formatDateTime(dashboardView.generatedAt)}</span>
            {!dashboardView.isLive && (
              <span className="tag muted">{LIVE_WINDOW_NOTICE}</span>
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
                <span className={`chg ${((item.percentageChange ?? 0) >= 0) ? "pos" : "neg"}`}>
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
      </section>

      <section className="d2-columns">
        <article className="d2-list-card">
          <div className="d2-card-head inline">
            <h3>Top Gainers</h3>
            {dashboardView.topGainers.length > 6 && (
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
              {(showAllGainers ? dashboardView.topGainers : dashboardView.topGainers.slice(0, 6)).map((item) => (
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
            {dashboardView.topLosers.length > 6 && (
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
              {(showAllLosers ? dashboardView.topLosers : dashboardView.topLosers.slice(0, 6)).map((item) => (
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
