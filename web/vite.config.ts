import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.resolve(__dirname, "..");
const appVersion = fs.readFileSync(path.join(rootDir, "VERSION"), "utf8").trim();

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __DESKTOP_BUILD__: JSON.stringify(process.env.VITE_DESKTOP_BUILD === "1"),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8080", changeOrigin: true },
      "/health": { target: "http://localhost:8080", changeOrigin: true },
      "/ping": { target: "http://localhost:8080", changeOrigin: true },
      "/query": { target: "http://localhost:8080", changeOrigin: true },
      "/version": { target: "http://localhost:8080", changeOrigin: true },
    },
  },
});
