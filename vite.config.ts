import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/app",
  publicDir: fileURLToPath(new URL("./data", import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: {
      "@app": fileURLToPath(new URL("./src/app", import.meta.url)),
      "@agent": fileURLToPath(new URL("./src/agent", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/agents": {
        target: "http://localhost:8787",
        ws: true,
      },
    },
  },
});
