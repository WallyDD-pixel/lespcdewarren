type Entry = { last: number; userId?: number | null };

const entries = new Map<string, Entry>();

const ONLINE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes considered "online"
const VISIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h for visitors count
const PRUNE_AFTER_MS = 48 * 60 * 60 * 1000; // keep at most 48h to limit memory

function now() { return Date.now(); }

function prune() {
  const cutoff = now() - PRUNE_AFTER_MS;
  for (const [k, v] of entries) {
    if (v.last < cutoff) entries.delete(k);
  }
}

export function beat(key: string, userId?: number | null) {
  const e = entries.get(key);
  const n = now();
  if (!e) entries.set(key, { last: n, userId: userId ?? null });
  else {
    e.last = n;
    if (userId) e.userId = userId;
  }
  // opportunistic prune
  if (Math.random() < 0.05) prune();
}

export function snapshot() {
  const n = now();
  let online = 0;
  let onlineLoggedIn = 0;
  let visitors24h = 0;
  for (const v of entries.values()) {
    if (v.last >= n - ONLINE_WINDOW_MS) {
      online++;
      if (v.userId) onlineLoggedIn++;
    }
    if (v.last >= n - VISIT_WINDOW_MS) visitors24h++;
  }
  return { online, onlineLoggedIn, visitors24h };
}
