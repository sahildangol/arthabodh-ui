import { useState, useEffect, useCallback } from "react";
import { MarketService } from "../services/marketService";
import { UserService } from "../services/userService";

export const useMarketDashboard = () => {
  const [data, setData] = useState({
    index: {},
    isOpen: false,
    gainers: [],
    losers: [],
    watchlist: [],
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    try {
      const [market, userWatchlist] = await Promise.all([
        MarketService.getLiveOverview().catch(() => ({})),
        UserService.getWatchlist().catch(() => []),
      ]);

      const rawNepse = market?.index?.["NEPSE Index"] || {};
      const allLiveStocks = [
        ...(Array.isArray(market?.TopGainers) ? market.TopGainers : []),
        ...(Array.isArray(market?.TopLosers) ? market.TopLosers : []),
      ];

      //Filter only is_active true flag and map to live market data
      const mappedWatchlist = (
        Array.isArray(userWatchlist) ? userWatchlist : []
      )
        .filter((item) => item.is_active === true)
        .map((item) => {
          const liveMatch = allLiveStocks.find(
            (s) => s.company_id === item.company_id,
          );
          return {
            id: item.id, 
            company_id: item.company_id,
            symbol: liveMatch?.symbol || `ID: ${item.company_id}`,
            last_price: liveMatch?.lastTradedPrice || "---",
            percent_change: liveMatch?.percentageChange || 0,
          };
        });

      setData({
        index: {
          current_value: rawNepse.close || 0,
          change: rawNepse.change || 0,
          percent_change: rawNepse.perChange || 0,
        },
        isOpen: rawNepse.perChange !== 0,
        gainers: market?.TopGainers || [],
        losers: market?.TopLosers || [],
        watchlist: mappedWatchlist,
        loading: false,
        error: null,
      });
    } catch (err) {
      setData((prev) => ({ ...prev, loading: false, error: "Sync failed" }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, refresh: fetchData };
};
