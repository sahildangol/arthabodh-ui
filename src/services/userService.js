import { authClient as api } from "../api/client";
import { jwtDecode } from "jwt-decode";

const getUserIdFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    return decoded.user_id || decoded.sub || null;
  } catch (error) {
    return null;
  }
};

export const UserService = {
  getWatchlist: async () => {
    const userId = getUserIdFromToken();
    const response = await api.get("/user-preference/watchlist", {
      params: { user_id: userId, is_active: true }, // Request ONLY active ones
    });
    return response.data;
  },

  addToWatchlist: async (companyId) => {
    const userId = getUserIdFromToken();
    const payload = {
      user_id: userId,
      company_id: Number(companyId),
      note: "Dashboard Add",
      is_active: true,
    };
    return await api.post("/user-preference/watchlist", payload);
  },

  removeFromWatchlist: async (watchlistId) => {
    return await api.delete(`/user-preference/watchlist/${watchlistId}`);
  },
};
