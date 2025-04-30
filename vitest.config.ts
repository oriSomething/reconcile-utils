import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    browser: {
      screenshotFailures: false,
      enabled: true,
      headless: true,
      provider: "playwright",
      instances: [{ browser: "chromium", headless: true }],
    },
  },
});
