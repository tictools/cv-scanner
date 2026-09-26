import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@feed": fileURLToPath(new URL("./src/feed", import.meta.url)),
      "@rag": fileURLToPath(new URL("./src/rag", import.meta.url)),
      "@agent": fileURLToPath(new URL("./src/agent", import.meta.url)),
      "@app": fileURLToPath(new URL("./src/app", import.meta.url)),
      "@data": fileURLToPath(new URL("./data", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
