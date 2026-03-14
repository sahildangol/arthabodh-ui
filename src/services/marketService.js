import { authClient as api } from "../api/client";


export const MarketService = {
  
  getLiveOverview: async () => {
    try {
      const response = await api.get("/market-data/live-overview");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch live overview:", error);
      throw error;
    }
  },

 
  getFullLiveMarket: async () => {
    try {
      const response = await api.get("/market-data/live-full");
      return response.data; 
    } catch (error) {
      console.error("Failed to fetch full live market:", error);
      return [];
    }
  },
};
