import register from "@/config/media-rights.json";

type Status = "pending" | "licensed" | "original";
type Entry = { file: string; origin: string; thirdPartyMarks: string[] | null; status: string; permission: string };

/**
 * Whether a supplied file may appear on the live site, from src/config/media-rights.json.
 * Same rule as scripts/media-rights.mjs (the packaging step): "licensed" needs recorded written
 * permission; "original" needs the owner's statement, no third-party marks and a non-Rockstar origin.
 */
export function rightsFor(file: string): Exclude<Status, "pending"> | "pending" {
  const e = (register.assets as Entry[]).find((a) => a.file === file);
  if (!e || !e.permission.trim()) return "pending";
  if (e.status === "licensed") return "licensed";
  if (e.status === "original" && Array.isArray(e.thirdPartyMarks) && e.thirdPartyMarks.length === 0 && !/rockstar/i.test(e.origin)) return "original";
  return "pending";
}

/**
 * `src` + `license` for a supplied file: authorised files are served from /media (packaged by
 * `npm run media:package`), everything else from the local-only /preview-media.
 */
export function asset(file: string): { src: string; license: "pending" | "licensed" | "original" } {
  const license = rightsFor(file);
  return { src: (license === "pending" ? "/preview-media/" : "/media/") + file, license };
}
