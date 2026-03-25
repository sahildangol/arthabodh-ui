import React, { useState, useEffect } from "react";
import { FaTrashAlt, FaExclamationTriangle } from "react-icons/fa";
import { BiLoaderAlt } from "react-icons/bi";
import { HiOutlineDocumentSearch } from "react-icons/hi";
import MomentumGauge from "../../common/components/MomentumGauge";
import "./Momentum.css";

const API_BASE = "http://localhost:8001/inference";
const MAX_SIGNALS = 5;

const Momentum: React.FC = () => {
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const isLimitReached = signals.length >= MAX_SIGNALS;

  const loadSymbols = async () => {
    try {
      const res = await fetch(`${API_BASE}/supported-symbols`);
      const data = await res.json();
      const symbols = Array.isArray(data) ? data : [];
      const unique = Array.from(new Set(symbols)).sort();
      setAllSymbols(unique);
    } catch (err) {
      console.error("Failed to load symbols:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSymbols();
  }, []);

  const handleTrack = async () => {
    if (!selectedSymbol || isProcessing || isLimitReached) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: selectedSymbol }),
      });
      if (!res.ok) throw new Error("Inference failed");
      const data = await res.json();
      setSignals((prev) => {
        const exists = prev.find((s) => s.symbol === data.symbol);
        return exists ? prev : [data, ...prev];
      });
      setSelectedSymbol("");
    } catch (err) {
      console.error("Tracking error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading)
    return (
      <div className="momentum-container center-loader">
        <BiLoaderAlt className="spin-icon large" />
        <p>INITIALIZING TERMINAL...</p>
      </div>
    );

  return (
    <div className="momentum-container">
      {/* SIDEBAR */}
      <aside className="m-sidebar">
        <div className="sidebar-header">SELECTION PANEL</div>

        <div className="sidebar-content">
          <div className="field-block">
            <label>STOCKS</label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="m-select"
              disabled={isLimitReached}
            >
              <option value="">-- Select Symbol --</option>
              {allSymbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <button
            className={`m-btn-primary ${isLimitReached ? "disabled" : ""}`}
            onClick={handleTrack}
            disabled={!selectedSymbol || isProcessing || isLimitReached}
          >
            {isProcessing && <BiLoaderAlt className="spin-icon" />}
            {!isProcessing && isLimitReached && <FaExclamationTriangle />}
            <span>{isLimitReached ? "LIMIT REACHED" : "START MONITORING"}</span>
          </button>

          {isLimitReached && (
            <div className="m-warning-box">
              <FaExclamationTriangle />
              <p>
                Tracker limit reached ({MAX_SIGNALS}). Remove an active signal
                to add more.
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="m-main">
        <header className="m-main-header">
          <div className="title-group">
            <h2>MOMENTUM MONITOR</h2>
            <div className="separator" />
          </div>
          <div className={`m-count-badge ${isLimitReached ? "warning" : ""}`}>
            {signals.length} / {MAX_SIGNALS} SLOTS ACTIVE
          </div>
        </header>

        {signals.length === 0 ? (
          <div className="m-empty-state">
            <div className="empty-content">
              <HiOutlineDocumentSearch className="empty-icon" />
              <h3>No Active Trackers</h3>
              <p>
                Select a symbol from the sidebar and click{" "}
                <strong>Start Monitoring</strong> to generate signals.
              </p>
            </div>
          </div>
        ) : (
          <div className="m-signal-grid">
            {signals.map((data) => {
              const sig = data.selected_signal;
              const parseNum = (v: any) => {
                const n = parseFloat(String(v).replace(/[^-0-9.]+/g, ""));
                return Number.isFinite(n) ? n : null;
              };
              const expReturnVal =
                parseNum(sig.return_magnitude_pct) ??
                parseNum(sig.return_magnitude);
              const expSignFromString = (() => {
                const raw = (sig.return_magnitude_pct || sig.return_magnitude || "").trim();
                if (raw.startsWith("+")) return 1;
                if (raw.startsWith("-")) return -1;
                return null;
              })();
              const ensemble = parseNum(sig.ensemble_score) ?? 0;
              const probRaw =
                parseNum(sig.prob_momentum) ?? parseNum(sig.prob_direction) ?? 0;
              const prob = Math.max(0, Math.min(1, probRaw));
              const directionLabel = (sig.direction || "").toUpperCase() || "N/A";
              const isBull = directionLabel === "UP";
              const expReturnDisplay =
                sig.return_magnitude_pct ??
                (expReturnVal !== null
                  ? `${expReturnVal >= 0 ? "+" : ""}${expReturnVal.toFixed(3)}%`
                  : "--");
              const expIsPositive =
                expReturnVal !== null
                  ? expReturnVal >= 0
                  : expSignFromString === 1;
              const probUp = parseNum(sig.prob_up);
              const probDown = parseNum(sig.prob_down);
              const predDate = data.prediction_date || sig.date || "--";
              const timeframe = data.timeframe || "—";
              const cached = data.from_cache ? "Yes" : "No";
              return (
                <div key={data.symbol} className="m-signal-card">
                  <div className="m-card-header">
                    <span className="m-symbol">{data.symbol}</span>
                    <div className="m-actions">
                      <div className={`m-direction-tag ${isBull ? "up" : "down"}`}>
                        {directionLabel}
                      </div>
                      <button
                        className="m-btn-delete"
                        onClick={() =>
                          setSignals(
                            signals.filter((s) => s.symbol !== data.symbol),
                          )
                        }
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  </div>

                    <div className="m-card-body">
                      <div className="m-gauge-section">
                        <MomentumGauge
                          value={prob}
                          strength={sig.signal_strength}
                          direction={directionLabel}
                        />
                      </div>

                      <div className="m-data-table subtle">
                        <div className="m-row">
                          <label>Ensemble</label>
                          <span className="val-white">{ensemble.toFixed(4)}</span>
                        </div>
                        <div className="m-row">
                          <label>Exp. Return</label>
                          <span className={expIsPositive ? "exp-pos" : "exp-neg"}>
                            {expReturnDisplay}
                          </span>
                        </div>
                        <div className="m-row">
                          <label>Close (NPR)</label>
                          <span className="val-white">{sig.close ?? "--"}</span>
                        </div>
                        <div className="m-row">
                          <label>Prob Up</label>
                          <span className="val-white">
                            {probUp !== null ? probUp.toFixed(4) : "--"}
                          </span>
                        </div>
                        <div className="m-row">
                          <label>Prob Down</label>
                          <span className="val-white">
                            {probDown !== null ? probDown.toFixed(4) : "--"}
                          </span>
                        </div>
                        <div className="m-row">
                          <label>Timeframe</label>
                          <span>{timeframe}</span>
                        </div>
                        <div className="m-row">
                          <label>Date</label>
                          <span>{predDate}</span>
                        </div>
                        <div className="m-row">
                          <label>From Cache</label>
                          <span>{cached}</span>
                        </div>
                      </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {signals.length > 0 && (
          <div className="m-detail-notes global">
            <h3>Signal Guide</h3>
            <div><strong>Ensemble</strong> — blended model agreement for the call.</div>
            <div><strong>Exp. Return</strong> — projected % move over the selected timeframe.</div>
            <div><strong>Prob Up / Prob Down</strong> — directional likelihoods informing the label.</div>
            <div><strong>Intensity</strong> — gauge percentage of momentum confidence.</div>
            <div><strong>Close</strong> — last traded price used as baseline.</div>
            <div><strong>Timeframe</strong> — horizon used for the prediction.</div>
            <div><strong>Date</strong> — when the signal was generated.</div>
            <div><strong>Cache</strong> — whether this signal was pulled from stored results.</div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Momentum;
