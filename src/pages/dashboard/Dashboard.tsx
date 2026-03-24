import React, { useEffect, useState } from "react";
import { useMarketDashboard } from "../../hooks/useMarketDashboard";
import { MarketService } from "../../services/marketService";
import { UserService } from "../../services/userService";
import { BiLoaderAlt } from "react-icons/bi";
import { FaPlus, FaTrash } from "react-icons/fa";
import "./Dashboard.css";

const Dashboard: React.FC = () => {
  const { index, gainers, losers, watchlist, loading, refresh } =
    useMarketDashboard();
  const [tickerData, setTickerData] = useState<any[]>([]);
  const [isMarketLive, setIsMarketLive] = useState(false);

  useEffect(() => {
    const syncMarketData = async () => {
      const data = await MarketService.getFullLiveMarket();

      if (data && data.length > 0) {
        setTickerData(data);
        setIsMarketLive(true);
      } else {
        setTickerData([]);
        setIsMarketLive(false);
      }
    };

    syncMarketData();
    const interval = setInterval(syncMarketData, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const handleAddStock = async () => {
    const cid = prompt("ENTER_NEPSE_ID:");
    if (cid) {
      try {
        await UserService.addToWatchlist(Number(cid));
        refresh();
      } catch (e) {
        alert("INVALID_OR_DUPLICATE_ID");
      }
    }
  };

  if (loading)
    return (
      <div className="ab-loader-container">
        <BiLoaderAlt className="ab-spin" />
        <p>LOADING...</p>
      </div>
    );

  return (
    <div className="ab-dashboard">
      {/* TICKER TAPE */}
      <div className="ab-ticker-wrap">
        {isMarketLive ? (
          <div className="ab-ticker">
            {tickerData.concat(tickerData.slice(0, 10)).map((stock, i) => (
              <div key={`${stock.symbol}-${i}`} className="ab-ticker-item">
                <span className="t-symbol">{stock.symbol}</span>
                <span className="t-price">{stock.lastTradedPrice}</span>
                <span
                  className={`t-change ${stock.percentageChange >= 0 ? "up" : "down"}`}
                >
                  {stock.percentageChange >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(stock.percentageChange)}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="ab-ticker-offline">
            <span className="offline-label">MARKET OFFLINE</span>
            <span className="offline-sub">LIVE FEED PAUSED</span>
          </div>
        )}
      </div>

      <header className="ab-header">
<<<<<<< Updated upstream
        <div className="ab-brand">
          <h1>
            ArthaBodh <span className="ab-version">v1.0</span>
          </h1>
          <p className="ab-subtitle">Financial Analysis Terminal</p>
        </div>
        <div className={`ab-status ${isOpen ? "is-live" : "is-closed"}`}>
          <span className="pulse-dot"></span>
          {isOpen ? "MARKET OPEN" : "MARKET CLOSED"}
=======
        <div className={`ab-status-pill ${isMarketLive ? "live" : "closed"}`}>
          <span className="dot"></span>
          {isMarketLive ? "LIVE MARKET |" : "MARKET CLOSED |"}
          {new Date().toLocaleDateString("en-GB")}
>>>>>>> Stashed changes
        </div>
      </header>

      <section className="ab-hero-compact">
        {/* Column 1: Index & Sentiment */}
        <div className="ab-stats-column">
          <div className="ab-card ab-compact-card">
            <label className="ab-label">NEPSE_INDEX</label>
            <div className="ab-index-mini">
              <h2>{index?.current_value?.toLocaleString() || "---"}</h2>
              <div
                className={`ab-badge-mini ${index?.change >= 0 ? "up" : "down"}`}
              >
                {index?.change >= 0 ? "▲" : "▼"} {Math.abs(index?.change || 0)}{" "}
                ({index?.percent_change || "0"}%)
              </div>
            </div>
          </div>

          <div className="ab-card ab-compact-card">
            <label className="ab-label">MARKET_SENTIMENT</label>
            <div className="sentiment-meter-mini">
              <div className="meter-bar-mini">
                <div className="meter-fill" style={{ width: "68%" }}></div>
              </div>
              <span className="meter-label-mini">NEED SENTIMENT HERE</span>
            </div>
          </div>
        </div>

        {/* Column 2: Top Gainers */}
        <div className="ab-card ab-movers-card-mini">
          <div className="card-header-mini">TOP_GAINERS</div>
          <div className="movers-list-mini">
            {gainers.length > 0 ? (
              gainers.slice(0, 4).map((s: any) => (
                <div key={s.symbol} className="mover-item-mini">
                  <span className="mover-symbol">{s.symbol}</span>
                  <span className="mover-val up">+{s.percentageChange}%</span>
                </div>
              ))
            ) : (
              <div className="ab-no-data">NO_ACTIVE_MOVERS</div>
            )}
          </div>
        </div>

        {/* Column 3: Top Losers */}
        <div className="ab-card ab-movers-card-mini">
          <div className="card-header-mini">TOP_LOSERS</div>
          <div className="movers-list-mini">
            {losers.length > 0 ? (
              losers.slice(0, 4).map((s: any) => (
                <div key={s.symbol} className="mover-item-mini">
                  <span className="mover-symbol">{s.symbol}</span>
                  <span className="mover-val down">{s.percentageChange}%</span>
                </div>
              ))
            ) : (
              <div className="ab-no-data">NO_ACTIVE_MOVERS</div>
            )}
          </div>
        </div>
      </section>

      {/* WATCHLIST SECTION */}
      <section className="ab-section">
        <div className="ab-section-header">
          <h3>PERSONAL WATCHLIST</h3>
          <button className="ab-btn-add" onClick={handleAddStock}>
            <FaPlus size={10} /> Stock
          </button>
        </div>
        <div className="ab-watchlist-grid">
          {watchlist.length > 0 ? (
            watchlist.map((item: any) => (
              <div key={item.id} className="ab-stock-card">
                <div className="stock-card-head">
                  <span className="stock-symbol">{item.symbol}</span>
                  <button
                    className="stock-del"
                    onClick={() =>
                      UserService.removeFromWatchlist(item.id).then(refresh)
                    }
                  >
                    <FaTrash size={10} />
                  </button>
                </div>
                <div className="stock-card-body">
                  <span className="stock-price">Rs. {item.last_price}</span>
                  <span
                    className={`stock-change ${item.percent_change >= 0 ? "up" : "down"}`}
                  >
                    {item.percent_change}%
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="ab-empty-state">Nothing in watchlist</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
