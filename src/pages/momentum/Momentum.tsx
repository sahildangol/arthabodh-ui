import { useEffect, useMemo, useState } from "react";
import { IoIosArrowDropdown } from "react-icons/io";
import { BiLoaderAlt } from "react-icons/bi";
import MomentumGauge from "../../common/components/MomentumGauge";
import { useCompanyWatchlist } from "../../common/hooks/useCompanyWatchlist";
import { MarketPreferenceService } from "../../services/marketPreferenceService";
import "./Momentum.css";

type SignalPayload = {
  signal?: string;
  direction?: string;
  signal_strength?: string;
  confidence?: string;
  model_score?: number | string | null;
  prob_up?: number | string | null;
  prob_down?: number | string | null;
  prob_momentum?: number | string | null;
  prob_direction?: number | string | null;
  close?: number | string | null;
  volume?: number | string | null;
  predicted_mag?: number | string | null;
  return_magnitude?: number | string | null;
  return_magnitude_pct?: string;
  timeline_10d?: Array<{
    point_type?: string;
    volume?: number | string | null;
  }>;
};

type MomentumResponse = {
  symbol?: string;
  prediction_date?: string;
  generated_at?: string;
  timeframe?: string;
  from_cache?: boolean;
  selected_signal?: SignalPayload | null;
  past_5_days?: Array<{
    volume?: number | string | null;
  }>;
};

type FeatureEntry = {
  label: string;
  scoreText: string;
  status: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
};

type SignalTone = "buy" | "neutral" | "sell";

type MomentumView = {
  symbol: string;
  direction: "UP" | "DOWN" | "NEUTRAL";
  label: string;
  tone: SignalTone;
  score: number;
  probabilityPct: number;
  modelConfidencePct: number;
  confidenceLabel: string;
  price?: number;
  volume?: number;
  generatedAt?: string;
  timeframe?: string;
  fromCache: boolean;
  features: FeatureEntry[];
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

const formatDate = (value?: string) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";

  return new Intl.DateTimeFormat("en", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
};

const formatCurrency = (value?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `NPR ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatVolume = (value?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return value.toLocaleString("en-US");
};

const deriveSignalLabel = (score: number) => {
  if (score >= 60) return "Strong Buy";
  if (score >= 20) return "Buy";
  if (score > -20) return "Neutral";
  if (score > -60) return "Sell";
  return "Strong Sell";
};

const toneFromLabel = (label: string): SignalTone => {
  const upper = label.toUpperCase();
  if (upper.includes("BUY")) return "buy";
  if (upper.includes("SELL")) return "sell";
  return "neutral";
};

const parseMomentumResponse = (
  raw: unknown,
  fallbackSymbol: string,
): MomentumView | null => {
  if (!raw || typeof raw !== "object") return null;
  const payload = raw as MomentumResponse;
  const signal = payload.selected_signal;
  if (!signal) return null;

  const rawProbUp =
    toNumber(signal.prob_up)
    ?? toNumber(signal.prob_direction)
    ?? toNumber(signal.prob_momentum)
    ?? 0.5;

  const rawProbDown =
    toNumber(signal.prob_down)
    ?? (1 - rawProbUp);

  const probUp = clamp(rawProbUp, 0, 1);
  const probDown = clamp(rawProbDown, 0, 1);
  const probabilityPct = clamp(Math.max(probUp, probDown) * 100, 0, 100);

  const score = Math.round(clamp((probUp - probDown) * 100, -100, 100));
  const inferredDirection =
    score > 5 ? "UP" : score < -5 ? "DOWN" : "NEUTRAL";

  const rawDirection = (signal.direction || signal.signal || inferredDirection)
    .toUpperCase()
    .trim();

  const direction: MomentumView["direction"] =
    rawDirection === "UP"
      ? "UP"
      : rawDirection === "DOWN"
        ? "DOWN"
        : inferredDirection;

  const modelScoreValue = toNumber(signal.model_score);
  const modelConfidencePct =
    typeof modelScoreValue === "number"
      ? clamp(
        modelScoreValue <= 1 ? modelScoreValue * 100 : modelScoreValue,
        0,
        100,
      )
      : probabilityPct;

  const momentum14d = clamp(
    (
      toNumber(signal.prob_momentum)
      ?? toNumber(signal.predicted_mag)
      ?? Math.max(probUp, probDown)
    ) * 100,
    0,
    100,
  );

  const volumeTrend = clamp(
    (
      toNumber(signal.prob_direction)
      ?? toNumber(signal.return_magnitude)
      ?? Math.max(probUp, probDown)
    ) * 100,
    0,
    100,
  );

  const featureStatus: FeatureEntry["status"] =
    direction === "UP"
      ? "POSITIVE"
      : direction === "DOWN"
        ? "NEGATIVE"
        : "NEUTRAL";

  const volumeFromTimeline = signal.timeline_10d
    ?.slice()
    .reverse()
    .find((point) => point.point_type === "history" && toNumber(point.volume) !== null);

  const volumeFromPast = payload.past_5_days
    ?.slice()
    .reverse()
    .find((point) => toNumber(point.volume) !== null);

  const volume =
    toNumber(signal.volume)
    ?? toNumber(volumeFromTimeline?.volume)
    ?? toNumber(volumeFromPast?.volume)
    ?? undefined;

  const label = deriveSignalLabel(score);

  return {
    symbol: payload.symbol || fallbackSymbol,
    direction,
    label,
    tone: toneFromLabel(label),
    score,
    probabilityPct,
    modelConfidencePct,
    confidenceLabel: signal.confidence?.toUpperCase() || "UNSPECIFIED",
    price: toNumber(signal.close) ?? undefined,
    volume,
    generatedAt: payload.generated_at || payload.prediction_date,
    timeframe: payload.timeframe || "1W",
    fromCache: Boolean(payload.from_cache),
    features: [
      {
        label: "Price Momentum (14d)",
        scoreText: `${momentum14d.toFixed(1)}%`,
        status: featureStatus,
      },
      {
        label: "Volume Trend",
        scoreText: `${volumeTrend.toFixed(1)}%`,
        status: featureStatus,
      },
    ],
  };
};

const buildMockMomentum = (symbol: string): MomentumView => ({
  symbol,
  direction: "UP",
  label: "Strong Buy",
  tone: "buy",
  score: 67,
  probabilityPct: 83.5,
  modelConfidencePct: 95,
  confidenceLabel: "HIGH",
  price: 854.5,
  volume: 125430,
  generatedAt: new Date().toISOString(),
  timeframe: "1W",
  fromCache: false,
  features: [
    { label: "Price Momentum (14d)", scoreText: "28.0%", status: "POSITIVE" },
    { label: "Volume Trend", scoreText: "22.0%", status: "POSITIVE" },
  ],
});

const Momentum = () => {
  const {
    companyOptions,
    defaultCompany,
  } = useCompanyWatchlist();

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loadingSignal, setLoadingSignal] = useState(false);
  const [signalView, setSignalView] = useState<MomentumView | null>(null);
  const [isMock, setIsMock] = useState(false);
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

    let cancelled = false;

    const fetchSignal = async () => {
      setLoadingSignal(true);
      setPredictionError(null);
      let useMock = false;

      try {
        let payload: unknown;

        try {
          payload = await MarketPreferenceService.getMomentumPrediction(
            selectedCompany.symbol,
          );
        } catch {
          payload = await MarketPreferenceService.getAdvancedPrediction(
            selectedCompany.symbol,
          );
        }

        if (cancelled) return;
        const parsed = parseMomentumResponse(payload, selectedCompany.symbol);
        if (!parsed) {
          setSignalView(null);
          setIsMock(false);
          setPredictionError(
            `Prediction data is not available for ${selectedCompany.symbol} yet.`,
          );
          setLoadingSignal(false);
          return;
        }
        setSignalView(parsed);
      } catch (error) {
        if (cancelled) return;
        if (MarketPreferenceService.isPredictionUnavailableError(error)) {
          setSignalView(null);
          setIsMock(false);
          setPredictionError(
            `Prediction is unavailable for ${selectedCompany.symbol} right now.`,
          );
          setLoadingSignal(false);
          return;
        }

        console.warn("Falling back to simulated momentum view:", error);
        useMock = true;
        setPredictionError("Live prediction failed. Showing simulated signal.");
        setSignalView(buildMockMomentum(selectedCompany.symbol));
      }

      setIsMock(useMock);
      setLoadingSignal(false);
    };

    fetchSignal();

    return () => {
      cancelled = true;
    };
  }, [selectedCompany]);

  const gaugeValue = useMemo(() => {
    if (!signalView) return 0.5;
    return clamp(signalView.probabilityPct / 100, 0, 1);
  }, [signalView]);

  const tone: SignalTone = signalView?.tone ?? "neutral";
  const gaugeDirection =
    tone === "buy" ? "UP" : tone === "sell" ? "DOWN" : "NEUTRAL";

  return (
    <div className="m2-page">
      <header className="m2-header">
        <div className="m2-title-wrap">
          <h2>Momentum Engine</h2>
          <p>Next-week directional prediction with AI-powered signals</p>
        </div>

        <div className="m2-select-wrap">
          <span className="m2-kicker">Select Asset</span>
          <button
            type="button"
            className="m2-select-trigger"
            onClick={() => setIsDropdownOpen((open) => !open)}
          >
            <span>{selectedCompany?.symbol || "CHOOSE"}</span>
            <IoIosArrowDropdown className={isDropdownOpen ? "rotate" : ""} />
          </button>

          {isDropdownOpen && (
            <ul className="m2-select-list">
              {companyOptions.map((company) => (
                <li
                  key={company.company_id}
                  onClick={() => {
                    setSelectedSymbol(company.symbol);
                    setIsDropdownOpen(false);
                  }}
                >
                  <strong>{company.symbol}</strong>
                  <span>{company.company_name || "Listed Company"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <div className="m2-grid">
        <section className={`m2-card m2-signal-card tone-${tone}`}>
          <p className="m2-kicker">Directional Signal</p>

          {loadingSignal ? (
            <div className="m2-loader">
              <BiLoaderAlt className="spin-icon" />
              <span>Loading momentum signal...</span>
            </div>
          ) : predictionError && !signalView ? (
            <div className="m2-error">
              <strong>Prediction Unavailable</strong>
              <span>{predictionError}</span>
            </div>
          ) : (
            <>
              <MomentumGauge
                value={gaugeValue}
                direction={gaugeDirection}
              />

              <div className="m2-score-block">
                <h3 className={tone}>
                  {signalView?.score && signalView.score > 0 ? "+" : ""}
                  {signalView?.score ?? 0}
                </h3>
                <p>Momentum Score</p>
                <div className={`m2-badge ${tone}`}>
                  {signalView?.label || "Neutral"}
                </div>
              </div>
            </>
          )}
        </section>

        <aside className={`m2-card m2-metrics-card tone-${tone}`}>
          <p className="m2-kicker">Model Metrics</p>

          <div className="m2-metric-row">
            <span>Prediction Probability</span>
            <strong>{signalView ? `${signalView.probabilityPct.toFixed(1)}%` : "--"}</strong>
          </div>

          <div className="m2-metric-row">
            <span>Model Confidence</span>
            <strong>{signalView ? `${signalView.modelConfidencePct.toFixed(1)}%` : "--"}</strong>
          </div>

          <div className="m2-confidence-track">
            <div
              className="m2-confidence-fill"
              style={{ width: `${signalView?.modelConfidencePct ?? 0}%` }}
            />
          </div>

          <div className="m2-state-block">
            <div className="m2-state-row">
              <span>Price</span>
              <strong>{formatCurrency(signalView?.price)}</strong>
            </div>
            <div className="m2-state-row">
              <span>Volume</span>
              <strong>{formatVolume(signalView?.volume)}</strong>
            </div>
            <div className="m2-state-row">
              <span>Confidence</span>
              <strong>{signalView?.confidenceLabel || "--"}</strong>
            </div>
          </div>

          <div className="m2-meta">
            <span>Generated: {formatDate(signalView?.generatedAt)}</span>
            <span>Timeframe: {signalView?.timeframe || "--"}</span>
            <span>
              {predictionError && signalView
                ? predictionError
                : isMock
                  ? "Simulated signal"
                  : signalView?.fromCache
                    ? "Loaded from cache"
                    : "Fresh signal"}
            </span>
          </div>
        </aside>
      </div>

      <section className="m2-card m2-features-card">
        <p className="m2-kicker">Top Influencing Features</p>

        <div className="m2-feature-grid">
          {(signalView?.features || []).map((feature) => (
            <div
              key={feature.label}
              className={`m2-feature-item ${feature.status.toLowerCase()}`}
            >
              <div className="m2-feature-head">
                <span>{feature.label}</span>
                <span>{feature.scoreText}</span>
              </div>
              <div className="m2-feature-line" />
              <div className={`m2-feature-status ${feature.status.toLowerCase()}`}>
                {feature.status}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Momentum;
