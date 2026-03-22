import React, { useState, useEffect } from "react";
import {
  Zap,
  Activity,
  Globe,
  Plus,
  Trash2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import MomentumGauge from "../../common/components/MomentumGauge";
import "./Momentum.css";

const API_BASE = "http://localhost:8001/inference";

const Momentum = () => {
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState("");

  const initTerminal = async () => {
    setLoading(true);
    try {
      const symRes = await fetch(`${API_BASE}/supported-symbols`);
      const symbols = await symRes.json();
      setAllSymbols(symbols);

      const fetched = [];
      // Sequential fetch to avoid 500 errors
      for (const symbol of symbols) {
        const res = await fetch(`${API_BASE}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol }),
        });
        if (res.ok) fetched.push(await res.json());
      }

      const sorted = [...fetched].sort(
        (a, b) =>
          b.selected_signal.ensemble_score - a.selected_signal.ensemble_score,
      );

      // Take top 2 and bottom 2
      setSignals(
        Array.from(new Set([...sorted.slice(0, 2), ...sorted.slice(-2)])),
      );
    } catch (err) {
      console.error("Terminal offline:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initTerminal();
  }, []);

  const addTrack = async () => {
    if (!selectedSymbol || signals.some((s) => s.symbol === selectedSymbol))
      return;
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: selectedSymbol }),
    });
    const data = await res.json();
    setSignals([data, ...signals]);
    setSelectedSymbol("");
  };

  if (loading)
    return (
      <div
        className="momentum-viewport"
        style={{ alignItems: "center", justifyContent: "center" }}
      >
        <div style={{ textAlign: "center" }}>
          <Loader2 className="animate-spin" color="#6366f1" size={40} />
          <p
            style={{
              color: "#94a3b8",
              marginTop: "1rem",
              letterSpacing: "2px",
            }}
          >
            LOADING MARKET PIPELINE...
          </p>
        </div>
      </div>
    );

  return (
    <div className="momentum-viewport">
      {/* LEFT SIDEBAR CONTROLS */}
      <aside className="terminal-sidebar">
        <div className="sidebar-label">Market Explorer</div>
        <select
          className="symbol-search-box"
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
        >
          <option value="">Search Instrument...</option>
          {allSymbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={addTrack}
          style={{
            background: "#6366f1",
            color: "white",
            border: "none",
            padding: "0.8rem",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Plus size={18} /> TRACK SIGNAL
        </button>

        <div
          style={{
            marginTop: "auto",
            padding: "1rem",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div className="sidebar-label" style={{ marginBottom: "0.5rem" }}>
            System Health
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#22c55e",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22c55e",
              }}
            />
            Port 8001: Operational
          </div>
        </div>
      </aside>

      {/* MAIN STAGE */}
      <main className="momentum-stage">
        <header className="stage-header">
          <div>
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>
              Momentum Monitor
            </h2>
            <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
              {signals.length} Active Tracks
            </span>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <Activity color="#6366f1" size={20} />
          </div>
        </header>

        <div className="cards-container">
          {signals.map((data) => {
            const sig = data.selected_signal;
            const isBull = sig.direction === "UP";

            return (
              <div key={data.symbol} className="terminal-card">
                <div className="card-top">
                  <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                    {data.symbol}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <button
                      onClick={() =>
                        setSignals(
                          signals.filter((s) => s.symbol !== data.symbol),
                        )
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "#475569",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                    <div
                      style={{
                        color: isBull ? "#22c55e" : "#ef4444",
                        fontSize: "0.7rem",
                        fontWeight: 900,
                        padding: "2px 6px",
                        border: "1px solid",
                        borderRadius: "4px",
                      }}
                    >
                      {sig.direction}
                    </div>
                  </div>
                </div>

                <div className="card-inner">
                  <div className="gauge-box">
                    <MomentumGauge
                      value={sig.prob_momentum}
                      strength={sig.signal_strength}
                      direction={sig.direction}
                    />
                  </div>

                  <div className="data-strip">
                    <div className="data-row">
                      <span>Ensemble</span>
                      <span style={{ color: "#818cf8" }}>
                        {sig.ensemble_score.toFixed(4)}
                      </span>
                    </div>
                    <div className="data-row">
                      <span>Volatility</span>
                      <span>{sig.confidence}</span>
                    </div>
                    <div className="data-row">
                      <span>Exp. Move</span>
                      <span style={{ color: isBull ? "#22c55e" : "#ef4444" }}>
                        {sig.return_magnitude_pct}
                      </span>
                    </div>
                    <div className="data-row">
                      <span>LTP</span>
                      <span>Rs. {sig.close}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Momentum;
