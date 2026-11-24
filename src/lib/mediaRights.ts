/**
 * Supplied files cleared for the live site. Everything not listed stays local-only preview.
 * "original": artwork the store owner created (owner statement 2026-11-24: AI-generated for this
 * store; reviewed, no logos or game artwork). "licensed": written commercial-use permission on file.
 * `npm run media:package` reads this list (between the markers) to pack the files for the server.
 */
// rights:start
const cleared: Record<string, "original" | "licensed"> = {
  "vice-city-aerial.png": "original",
  "helicopter.gif": "original",
  "region-leonida-keys.png": "original",
  "region-grassrivers.png": "original",
  "region-port-gellhorn.png": "original",
  "region-ambrosia.png": "original",
  "region-mount-kalaga.png": "original",
};
// rights:end

/**
 * `src` + `license` for a supplied file: cleared files are served from /media (packaged by
 * `npm run media:package`), everything else from the local-only /preview-media.
 */
export function asset(file: string): { src: string; license: "pending" | "licensed" | "original" } {
  const license = cleared[file] ?? "pending";
  return { src: (license === "pending" ? "/preview-media/" : "/media/") + file, license };
}
