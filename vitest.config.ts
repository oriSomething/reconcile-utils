import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["vitest.setup.ts"],
    browser: {
      enabled: true,
      headless: true,
      provider: "playwright",
      instances: [{ browser: "chromium", headless: true }],
    },
  },
});
