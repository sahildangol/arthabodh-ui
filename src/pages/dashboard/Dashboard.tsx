import React, { useEffect, useState } from "react";
import { useMarketDashboard } from "../../hooks/useMarketDashboard";
import { MarketService } from "../../services/marketService";
import { UserService } from "../../services/userService";
import "./Dashboard.css";

const Dashboard: React.FC = () => {
  const { index, isOpen, gainers, losers, watchlist, loading, refresh } =
    useMarketDashboard();
  const [tickerData, setTickerData] = useState<any[]>([]);

  // Fetch the full market data for the ticker tape separately
  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const data = await MarketService.getFullLiveMarket();
        setTickerData(data);
      } catch (err) {
        console.error("Ticker fetch failed");
      }
    };
    fetchTicker();
  }, []);

  const handleAddStock = async () => {
    const cid = prompt("Enter NEPSE Company ID:");
    if (cid) {
      try {
        await UserService.addToWatchlist(Number(cid));
        refresh();
      } catch (e) {
        alert("Stock already tracked or invalid ID.");
      }
    }
  };

  const handleRemove = async (id: number) => {
    if (window.confirm("Remove from watchlist?")) {
      await UserService.removeFromWatchlist(id);
      refresh();
    }
  };

  if (loading)
    return (
      <div className="ab-loader-container">
        <div className="ab-spinner"></div>
        <p>Syncing Terminal Data...</p>
      </div>
    );

  return (
    <div className="ab-dashboard">
      {/* LIVE TICKER TAPE */}
      <div className="ab-ticker-wrap">
        <div className="ab-ticker">
          {tickerData.concat(tickerData.slice(0, 10)).map((stock, i) => (
            <div key={`${stock.symbol}-${i}`} className="ab-ticker-item">
              <span className="ticker-symbol">{stock.symbol}</span>
              <span className="ticker-price">{stock.lastTradedPrice}</span>
              <span
                className={`ticker-change ${stock.percentageChange >= 0 ? "up" : "down"}`}
              >
                {stock.percentageChange >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(stock.percentageChange)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <header className="ab-header">
        
        <div className={`ab-status ${isOpen ? "is-live" : "is-closed"}`}>
          <span className="pulse-dot"></span>
          {isOpen ? "MARKET OPEN" : "MARKET CLOSED"}
        </div>
      </header>

      <section className="ab-hero-grid">
        <div className="ab-card ab-index-card">
          <label>NEPSE INDEX</label>
          <div className="ab-index-value">
            <h2>{index?.current_value?.toLocaleString()}</h2>
            <div className={`ab-badge ${index?.change >= 0 ? "up" : "down"}`}>
              {index?.change >= 0 ? "▲" : "▼"} {Math.abs(index?.change)} (
              {index?.percent_change}%)
            </div>
          </div>
        </div>

        <div className="ab-card ab-sentiment-card">
          <label>MARKET SENTIMENT</label>
          <div className="sentiment-meter">
            <div className="meter-bar">
              <div className="meter-fill" style={{ width: "68%" }}></div>
            </div>
            <span className="meter-label">model sentiment here</span>
          </div>
        </div>
      </section>

      <section className="ab-section">
        <div className="ab-section-header">
          <h3>Personal Watchlist</h3>
          <button className="ab-btn-add" onClick={handleAddStock}>
            + Add Ticker
          </button>
        </div>
        <div className="ab-watchlist-grid">
          {watchlist.length > 0 ? (
            watchlist.map((item: any) => (
              <div key={item.id} className="ab-ticker-card">
                <div className="ticker-header">
                  <span className="ticker-symbol">{item.symbol}</span>
                  <button
                    className="ticker-del"
                    onClick={() => handleRemove(item.id)}
                  >
                    ×
                  </button>
                </div>
                <div className="ticker-body">
                  <span className="ticker-price">Rs. {item.last_price}</span>
                  <span
                    className={`ticker-change ${item.percent_change >= 0 ? "up" : "down"}`}
                  >
                    {item.percent_change}%
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="ab-empty-state">
              No active tickers. Add a company ID to start tracking.
            </div>
          )}
        </div>
      </section>

      <section className="ab-movers-grid">
        <div className="ab-card ab-movers-card">
          <div className="card-header">Top Gainers</div>
          <div className="movers-list">
            {gainers.slice(0, 5).map((s: any) => (
              <div key={s.symbol} className="mover-item">
                <span className="mover-symbol">{s.symbol}</span>
                <span className="mover-val up">+{s.percentageChange}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ab-card ab-movers-card">
          <div className="card-header">Top Losers</div>
          <div className="movers-list">
            {losers.slice(0, 5).map((s: any) => (
              <div key={s.symbol} className="mover-item">
                <span className="mover-symbol">{s.symbol}</span>
                <span className="mover-val down">{s.percentageChange}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
