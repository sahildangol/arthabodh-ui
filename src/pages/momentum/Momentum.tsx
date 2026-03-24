import React, { useState, useEffect } from "react";
import { FaPlus, FaTrashAlt, FaExclamationTriangle } from "react-icons/fa";
import { BiLoaderAlt } from "react-icons/bi";
import { HiOutlineDocumentSearch } from "react-icons/hi";
import MomentumGauge from "../../common/components/MomentumGauge";
import "./Momentum.css";

const API_BASE = "http://localhost:8001/inference";
const MAX_SIGNALS = 4;

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
      setAllSymbols(Array.isArray(data) ? data : []);
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
            {isProcessing ? (
              <BiLoaderAlt className="spin-icon" />
            ) : isLimitReached ? (
              <FaExclamationTriangle />
            ) : (
              <FaPlus />
            )}
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
              const isBull = sig.direction === "UP";
              return (
                <div key={data.symbol} className="m-signal-card">
                  <div className="m-card-header">
                    <span className="m-symbol">{data.symbol}</span>
                    <div className="m-actions">
                      <div
                        className={`m-direction-tag ${isBull ? "up" : "down"}`}
                      >
                        {sig.direction}
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
                        value={sig.prob_momentum}
                        strength={sig.signal_strength}
                        direction={sig.direction}
                      />
                    </div>

                    <div className="m-data-table">
                      <div className="m-row">
                        <label>Ensemble</label>
                        <span className="val-blue">
                          {sig.ensemble_score.toFixed(4)}
                        </span>
                      </div>
                      <div className="m-row">
                        <label>Exp. Return</label>
                        <span className={isBull ? "val-up" : "val-down"}>
                          {sig.return_magnitude_pct}%
                        </span>
                      </div>
                      <div className="m-row">
                        <label>LTP (NPR)</label>
                        <span className="val-bold">{sig.close}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Momentum;
