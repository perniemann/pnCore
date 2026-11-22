import { defineConfig } from "vitest/config";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    setupFiles: [join(__dirname, "src", "vitest-zod-setup.ts")],
    include: ["src/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        // Two-line bin entry; index.smoke.test.ts spawns it from dist over stdio.
        "src/index.ts",
      ],
      // Global floor only. autoUpdate ratchets thresholds up on local runs
      // when coverage exceeds them; disabled in CI so config is never
      // mutated mid-run on the build server.
      thresholds: {
        autoUpdate: !process.env.CI,
        statements: 98.5,
        branches: 95.0,
        functions: 100,
        lines: 99.3,
      },
    },
  },
  resolve: {
    alias: {
      "@": join(__dirname, "src"),
    },
  },
});
