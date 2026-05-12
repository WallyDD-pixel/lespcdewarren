type Listener = (payload: any) => void;

const channels = new Map<number, Set<Listener>>();

export function subscribeToUser(userId: number, cb: Listener) {
  let set = channels.get(userId);
  if (!set) { set = new Set(); channels.set(userId, set); }
  set.add(cb);
  return () => {
    const s = channels.get(userId);
    if (s) {
      s.delete(cb);
      if (s.size === 0) channels.delete(userId);
    }
  };
}

export function emitToUser(userId: number, payload: any) {
  const set = channels.get(userId);
  if (!set) return;
  for (const cb of set) {
    try { cb(payload); } catch {}
  }
}
