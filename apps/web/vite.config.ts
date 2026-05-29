import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || "/",
  server: {
    host: "0.0.0.0",
    allowedHosts: [".trycloudflare.com"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      },
      "/uploads": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      }
    }
  }
});
