import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/lib": path.resolve(__dirname, "./lib"),
      "@common": path.resolve(__dirname, "./common"),
      "@features": path.resolve(__dirname, "./features"),
      "@pages": path.resolve(__dirname, "./pages"),
      "@stores": path.resolve(__dirname, "./stores"),
      "@configs": path.resolve(__dirname, "./configs"),
    },
  },
});