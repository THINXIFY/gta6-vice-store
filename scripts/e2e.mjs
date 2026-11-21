/**
 * End-to-end tests against an isolated, test-mode production build: checkout off (test orders,
 * sample wallets, fake inbox), built into .next-e2e so the real (live) .next build is untouched.
 * Extra arguments go to Playwright, e.g. `npm run test:e2e -- tests/e2e/checkout.spec.ts`.
 */
import { spawnSync } from "node:child_process";

const env = { ...process.env, NEXT_PUBLIC_CHECKOUT_TEST_MODE: "1", NEXT_DIST_DIR: ".next-e2e" };

// One command line through the shell (Windows needs it to find npx); every argument is quoted.
const quote = (arg) => (/^[\w@%+=:,./-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '\\"')}"`);
const run = (cmd, args) => {
  const r = spawnSync([cmd, ...args].map(quote).join(" "), { stdio: "inherit", env, shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run("node", ["scripts/sync-preview-media.mjs"]);
run("npx", ["next", "build"]);
run("npx", ["playwright", "test", ...process.argv.slice(2)]);
