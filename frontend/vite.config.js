import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    minify: "esbuild",
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.{js,jsx}"],
      exclude: ["src/main.jsx"],
    },
  },
  css: {
    postcss: "./postcss.config.js",
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      "/api": { target: "https://miron22.onrender.com", changeOrigin: true, secure: true },
      "/admin": { target: "https://miron22.onrender.com", changeOrigin: true, secure: true },
      "/cases": { target: "https://miron22.onrender.com", changeOrigin: true, secure: true },
      "/reports": { target: "https://miron22.onrender.com", changeOrigin: true, secure: true },
      "/writer": { target: "https://miron22.onrender.com", changeOrigin: true, secure: true },
      "/assistant-chat": { target: "https://miron22.onrender.com", changeOrigin: true, secure: true },
      "/assistant": { target: "https://miron22.onrender.com", changeOrigin: true, secure: true },
      "/analyze": { target: "https://miron22.onrender.com", changeOrigin: true, secure: true },
      "/billing": { target: "https://miron22.onrender.com", changeOrigin: true, secure: true },
      "/health": { target: "https://miron22.onrender.com", changeOrigin: true, secure: true },
    },
  },
});
