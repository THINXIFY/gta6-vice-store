/**
 * Single-process guard for the embedded PGlite database. PGlite is not multi-process safe:
 * two processes opening the same folder (e.g. `next build` while `next dev` runs) can corrupt it.
 * A sibling `<dir>.lock` file holds the owner's PID; a live owner blocks others, a stale lock
 * (process gone) is replaced. Shared by src/server/db.ts and the scripts.
 */
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
};

export function acquirePgliteLock(dir) {
  const file = `${dir.replace(/[\/]+$/, "")}.lock`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      writeFileSync(file, String(process.pid), { flag: "wx" });
      const release = () => {
        try {
          if (readFileSync(file, "utf8") === String(process.pid)) unlinkSync(file);
        } catch {}
      };
      process.once("exit", release);
      return release;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      let pid = 0;
      try {
        pid = Number(readFileSync(file, "utf8"));
      } catch {}
      if (pid === process.pid) return () => {};
      if (pid && alive(pid)) {
        throw new Error(
          `The embedded database at ${dir} is in use by process ${pid} (for example a running dev server). ` +
            "Stop that process first, or set PGLITE_DIR to a different folder. Opening it twice can corrupt it.",
        );
      }
      try {
        unlinkSync(file); // stale lock from a process that no longer exists
      } catch {}
    }
  }
  throw new Error(`Could not lock the embedded database at ${dir}.`);
}
