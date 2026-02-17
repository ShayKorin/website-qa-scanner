import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "./", // Use relative paths for Chrome extension
  build: {
    outDir: "dist",
    minify: false, // Easier debugging
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, "index.html"),
      },
    },
  },
});
