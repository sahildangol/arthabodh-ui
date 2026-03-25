import axios from "axios";

const API_BASE_URL = "http://localhost:8001";
const USE_MOCK = true;

export const getStockData = async (symbol) => {
  if (USE_MOCK) {
    console.log("Using Apex-formatted mock data for: ", symbol);
    return generateMockData(symbol);
  }
  //cant test unless backend is up, so using mock data for now, will remove this when backend is up and running
  try {
    const response = await axios.get(`${API_BASE_URL}/api/stocks/${symbol}`);
    return response.data.map((item) => ({
      x: item.date,
      y: [item.open, item.high, item.low, item.close],
      is_predicted: item.is_predicted,
    }));
  } catch (error) {
    console.warn("API Offline,using Mock.");
    return generateMockData(symbol);
  }
};

const generateMockData = (symbol) => {
  const data = [];
  const base = symbol === "SBL" ? 310 : 255;

  for (let i = 1; i <= 30; i++) {
    const open = base + Math.random() * 20 - 10;
    const close = open + (Math.random() * 16 - 8);
    const high = Math.max(open, close) + Math.random() * 5;
    const low = Math.min(open, close) - Math.random() * 5;

    data.push({
      x: `2026-02-${i < 10 ? "0" + i : i}`,
      y: [
        parseFloat(open.toFixed(2)),
        parseFloat(high.toFixed(2)),
        parseFloat(low.toFixed(2)),
        parseFloat(close.toFixed(2)),
      ],
      is_predicted: i > 23,
    });
  }
  return data;
};
