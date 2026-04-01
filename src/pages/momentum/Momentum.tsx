import { useEffect, useMemo, useState } from "react";
import { IoIosArrowDropdown } from "react-icons/io";
import { BiLoaderAlt } from "react-icons/bi";
import { useCompanyWatchlist } from "../../common/hooks/useCompanyWatchlist";
import { MarketPreferenceService } from "../../services/marketPreferenceService";
import MomentumGauge from "../../common/components/MomentumGauge";
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
  car?: number | string | null;
  npl?: number | string | null;
};

type MomentumResponse = {
  symbol?: string;
  prediction_date?: string;
  generated_at?: string;
  timeframe?: string;
  from_cache?: boolean;
  model_type?: string;
  lookback_days?: number;
  rows_ohlcv?: number;
  rows_nepse?: number;
  decision_threshold?: number | string;
  selected_signal?: SignalPayload | null;
  past_5_days?: Array<{
    date?: string;
    open?: number | string | null;
    high?: number | string | null;
    low?: number | string | null;
    close?: number | string | null;
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
  confidenceTone: "low" | "medium" | "high";
  strengthLabel?: string;
  strengthTone: "weak" | "medium" | "strong";
  modelScorePct?: number;
  probUpPct?: number;
  probDownPct?: number;
  predictedMovePct?: number;
  moveLabel?: string;
  predictionDate?: string;
  price?: number;
  volume?: number;
  generatedAt?: string;
  timeframe?: string;
  fromCache: boolean;
  pastFiveDays: MomentumResponse["past_5_days"];
  fundamentals: {
    car?: number | null;
    npl?: number | null;
    closePrice?: number | null;
  };
  technical: {
    modelType?: string;
    lookbackDays?: number | null;
    rows?: number | null;
    decisionThreshold?: number | null;
  };
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

const formatTime = (value?: string) => {
  if (!value) return "--";
  let parsed = new Date(value);

  // Handle time-only strings like "03:06:37" by anchoring to today.
  if (Number.isNaN(parsed.getTime()) && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const today = new Date();
    const isoDate = today.toISOString().split("T")[0];
    parsed = new Date(`${isoDate}T${value}`);
  }

  if (Number.isNaN(parsed.getTime())) return "--";
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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

const formatPrice = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return value.toFixed(2);
};

const formatPercent = (value?: number, digits = 1) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
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
  const probUpPct = clamp(probUp * 100, 0, 100);
  const probDownPct = clamp(probDown * 100, 0, 100);

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
  const modelScorePct =
    typeof modelScoreValue === "number"
      ? clamp(modelScoreValue <= 1 ? modelScoreValue * 100 : modelScoreValue, 0, 100)
      : undefined;

  const returnMagPct = (() => {
    if (typeof signal.return_magnitude_pct === "string") {
      const numeric = Number(signal.return_magnitude_pct.replace("%", ""));
      if (Number.isFinite(numeric)) return numeric;
    }
    const alt = toNumber(signal.return_magnitude);
    if (typeof alt === "number") return alt * 100;
    return undefined;
  })();

  const strengthLabel = signal.signal_strength?.toUpperCase() || "UNSPECIFIED";
  const confidenceLabel = signal.confidence?.toUpperCase() || "UNSPECIFIED";

  const confidenceTone =
    confidenceLabel.includes("LOW") ? "low"
      : confidenceLabel.includes("HIGH") ? "high"
        : "medium";

  const strengthTone =
    strengthLabel.includes("WEAK") ? "weak"
      : strengthLabel.includes("STRONG") ? "strong"
        : "medium";

  const moveLabel = (() => {
    if (typeof returnMagPct !== "number") return undefined;
    const abs = Math.abs(returnMagPct);
    if (abs < 0.5) return returnMagPct >= 0 ? "Minimal Gain" : "Minimal Loss";
    if (abs < 2) return returnMagPct >= 0 ? "Modest Gain" : "Modest Loss";
    return returnMagPct >= 0 ? "Gain" : "Loss";
  })();

  return {
    symbol: payload.symbol || fallbackSymbol,
    direction,
    label,
    tone: toneFromLabel(label),
    score,
    probabilityPct,
    modelConfidencePct,
    confidenceLabel,
    confidenceTone,
    strengthLabel,
    strengthTone,
    modelScorePct,
    probUpPct,
    probDownPct,
    predictedMovePct: returnMagPct,
    moveLabel,
    predictionDate: payload.prediction_date,
    price: toNumber(signal.close) ?? undefined,
    volume,
    generatedAt: payload.generated_at || payload.prediction_date,
    timeframe: payload.timeframe || "1W",
    fromCache: Boolean(payload.from_cache),
    pastFiveDays: payload.past_5_days ?? [],
    fundamentals: {
      closePrice: toNumber(signal.close),
      car: toNumber(signal.car),
      npl: toNumber(signal.npl),
    },
    technical: {
      modelType: payload.model_type,
      lookbackDays: payload.lookback_days ?? null,
      rows: payload.rows_ohlcv ?? payload.rows_nepse ?? null,
      decisionThreshold: toNumber(payload.decision_threshold),
    },
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
  confidenceTone: "high",
  strengthLabel: "STRONG",
  strengthTone: "strong",
  modelScorePct: 95,
  probUpPct: 83.5,
  probDownPct: 16.5,
  predictedMovePct: 0.85,
  moveLabel: "Gain",
  predictionDate: new Date().toISOString(),
  price: 854.5,
  volume: 125430,
  generatedAt: new Date().toISOString(),
  timeframe: "1W",
  fromCache: false,
  pastFiveDays: [],
  fundamentals: { closePrice: 854.5, car: 12, npl: 2 },
  technical: { modelType: "Ensemble", lookbackDays: 520, rows: 221, decisionThreshold: 0.5 },
  features: [
    { label: "Price Momentum (14d)", scoreText: "28.0%", status: "POSITIVE" },
    { label: "Volume Trend", scoreText: "22.0%", status: "POSITIVE" },
  ],
});

export default function Momentum() {
  const {
    companyOptions,
    defaultCompany,
  } = useCompanyWatchlist();

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loadingSignal, setLoadingSignal] = useState(false);
  const [signalView, setSignalView] = useState<MomentumView | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [showTech, setShowTech] = useState(false);

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
          setPredictionError(
            `Prediction is unavailable for ${selectedCompany.symbol} right now.`,
          );
          setLoadingSignal(false);
          return;
        }

        console.warn("Falling back to simulated momentum view:", error);
        setPredictionError("Live prediction failed. Showing simulated signal.");
        setSignalView(buildMockMomentum(selectedCompany.symbol));
      }

      setLoadingSignal(false);
    };

    fetchSignal();

    return () => {
      cancelled = true;
    };
  }, [selectedCompany]);

  const tone: SignalTone = signalView?.tone ?? "neutral";
  const gaugeValue = useMemo(() => {
    if (!signalView) return 0.5;
    switch (signalView.strengthTone) {
      case "strong":
        return 0.9;
      case "medium":
        return 0.55;
      default:
        return 0.25;
    }
  }, [signalView]);

  return (
    <div className="m2-page">
      <header className="m2-header">
        <div className="m2-title-wrap">
          <h2>{signalView?.symbol || selectedCompany?.symbol || "Symbol"}</h2>
          <p>Prediction Date: {formatDate(signalView?.predictionDate)}</p>
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
          <section className="m2-hero">
            <div className={`m2-card m2-hero-card tone-${tone}`}>
              <div className="m2-card-head">
                <h3>Signal Overview</h3>
              </div>
              <div className="m2-stat-table">
                <div className="m2-stat-row">
                  <span className="label">Probability</span>
                  <div className="m2-stat-values m2-prob-inline">
                    <div className="prob up">
                      <span className="prob-arrow">▲</span>
                      <span>{formatPercent(signalView?.probUpPct)}</span>
                    </div>
                    <div className="prob down">
                      <span className="prob-arrow">▼</span>
                      <span>{formatPercent(signalView?.probDownPct)}</span>
                    </div>
                  </div>
                </div>
                <div className="m2-stat-row">
                  <span className="label">Confidence</span>
                  <span className="m2-stat-text">
                    {signalView?.confidenceLabel || "--"}
                  </span>
                </div>
                <div className="m2-stat-row">
                  <span className="label">Latest Close Price</span>
                  <span className="m2-stat-number neutral">
                    {formatCurrency(signalView?.fundamentals.closePrice ?? undefined)}
                  </span>
                </div>
                <div className="m2-stat-row">
                  <span className="label">Model Score</span>
                  <span className="m2-stat-number neutral">
                    {signalView?.modelScorePct ? `${signalView.modelScorePct.toFixed(1)}%` : "--"}
                  </span>
                </div>
              </div>

            </div>

            <div className="m2-card m2-gauge-card">
              <div className="m2-gauge-title">Signal Strength</div>
              <MomentumGauge
                value={gaugeValue}
                direction={signalView?.direction ?? "NEUTRAL"}
              />
            </div>
          </section>

          <section className="m2-card m2-table-card">
            <div className="m2-card-head">
              <div>
                <h3>Past 5 Days</h3>
              </div>
            </div>
            <div className="m2-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Open</th>
                    <th>High</th>
                    <th>Low</th>
                    <th>Close</th>
                    <th>Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {(signalView?.pastFiveDays ?? []).map((row, idx) => (
                    <tr key={`${row.date}-${idx}`}>
                      <td>{formatDate(row.date)}</td>
                      <td>{formatPrice(toNumber(row.open))}</td>
                      <td>{formatPrice(toNumber(row.high))}</td>
                      <td>{formatPrice(toNumber(row.low))}</td>
                      <td>{formatPrice(toNumber(row.close))}</td>
                      <td>{formatVolume(toNumber(row.volume) ?? undefined)}</td>
                    </tr>
                  ))}
                  {(!signalView?.pastFiveDays || !signalView.pastFiveDays.length) && (
                    <tr>
                      <td colSpan={6} className="m2-empty">No history available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="m2-card m2-tech-card">
            <button
              type="button"
              className="m2-tech-toggle"
              onClick={() => setShowTech((prev) => !prev)}
            >
              Technical Details
              <IoIosArrowDropdown className={showTech ? "rotate" : ""} />
            </button>
            {showTech && (
              <div className="m2-tech-grid">
                <div>
                  <span>Status</span>
                  <strong>{signalView?.fromCache ? "Cached Result" : "Live"}</strong>
                </div>
                <div>
                  <span>Timeframe</span>
                  <strong>{signalView?.timeframe || "1W"}</strong>
                </div>
                <div>
                  <span>Updated</span>
                  <strong>{formatTime(signalView?.generatedAt)}</strong>
                </div>
                <div>
                  <span>Model Type</span>
                  <strong>{signalView?.technical.modelType || "--"}</strong>
                </div>
                <div>
                  <span>Lookback Days</span>
                  <strong>{signalView?.technical.lookbackDays ?? "--"}</strong>
                </div>
                <div>
                  <span>Data Rows</span>
                  <strong>{signalView?.technical.rows ?? "--"}</strong>
                </div>
                <div>
                  <span>Probability Split</span>
                  <strong>
                    Up: {formatPercent(signalView?.probUpPct)} | Down: {formatPercent(signalView?.probDownPct)}
                  </strong>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
