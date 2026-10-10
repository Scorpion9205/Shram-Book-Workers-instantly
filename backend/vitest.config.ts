import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // *.local.test.ts needs a real Postgres + real Redis reachable (CI mocks both away) —
    // run those deliberately via their own npm script (e.g. `npm run test:race`), not here.
    exclude: ["**/node_modules/**", "**/*.local.test.ts"],
  },
});
