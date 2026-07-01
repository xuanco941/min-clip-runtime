import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: ".",
  base: "./",
  publicDir: "assets",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  plugins: [react()],
  build: {
    outDir: "dist/renderer",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
    },
  },
  server: {
    // Bind IPv4 rõ ràng để dev.mjs waitForPort(127.0.0.1) kết nối được
    // (mặc định "localhost" hay ra ::1 trên Windows → ECONNREFUSED IPv4).
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});