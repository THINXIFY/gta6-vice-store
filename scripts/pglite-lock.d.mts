/** Returns a release function; throws if another live process holds the database. */
export function acquirePgliteLock(dir: string): () => void;
