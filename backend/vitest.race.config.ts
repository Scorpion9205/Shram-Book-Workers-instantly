import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config();

// Separate config for the real-DB/real-Redis concurrency test, which the default
// vitest.config.ts deliberately excludes from `npm test` (see its comment). This config has
// no such exclusion, so `vitest run --config vitest.race.config.ts` picks it up.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/tests/integration/instant-request-race.local.test.ts"],
  },
});
