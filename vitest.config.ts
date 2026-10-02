import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = {
  "@feed": fileURLToPath(new URL("./src/feed", import.meta.url)),
  "@rag": fileURLToPath(new URL("./src/rag", import.meta.url)),
  "@agent": fileURLToPath(new URL("./src/agent", import.meta.url)),
  "@app": fileURLToPath(new URL("./src/app", import.meta.url)),
  "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
  "@data": fileURLToPath(new URL("./data", import.meta.url)),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "node",
          include: ["src/{feed,rag,agent,shared}/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "app",
          include: ["src/app/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
