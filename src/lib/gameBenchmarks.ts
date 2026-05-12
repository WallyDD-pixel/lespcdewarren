export type GameBenchmarkRow = {
  game: string;
  resolution?: string;
  preset?: string;
  fpsAvg?: number;
  fps1Low?: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Lit `specs.gameBenchmarks` (tableau d’objets) depuis le JSON produit. */
export function parseGameBenchmarks(specs: unknown): GameBenchmarkRow[] | null {
  if (!isRecord(specs)) return null;
  const raw = specs.gameBenchmarks;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const rows: GameBenchmarkRow[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const game = typeof item.game === "string" ? item.game.trim() : "";
    if (!game) continue;
    rows.push({
      game,
      resolution: typeof item.resolution === "string" ? item.resolution : undefined,
      preset: typeof item.preset === "string" ? item.preset : undefined,
      fpsAvg: typeof item.fpsAvg === "number" && Number.isFinite(item.fpsAvg) ? item.fpsAvg : undefined,
      fps1Low: typeof item.fps1Low === "number" && Number.isFinite(item.fps1Low) ? item.fps1Low : undefined,
    });
  }
  return rows.length ? rows : null;
}

export function maxBenchmarkFpsAvg(rows: GameBenchmarkRow[]): number {
  let m = 0;
  for (const r of rows) {
    if (r.fpsAvg != null && r.fpsAvg > m) m = r.fpsAvg;
  }
  return m > 0 ? m : 1;
}

/** Phrase courte pour cartes (accueil, listes). */
export function teaserBenchmarkCards(specs: unknown, limit = 2): { label: string; sub: string }[] | undefined {
  const rows = parseGameBenchmarks(specs);
  if (!rows?.length) return undefined;
  const sorted = [...rows].filter((r) => r.fpsAvg != null).sort((a, b) => (b.fpsAvg ?? 0) - (a.fpsAvg ?? 0));
  const pick = sorted.length ? sorted : rows;
  return pick.slice(0, limit).map((r) => {
    const short =
      r.game.length > 24 ? `${r.game.slice(0, 22).trim()}…` : r.game;
    const parts = [
      r.fpsAvg != null ? `${Math.round(r.fpsAvg)} FPS` : null,
      r.resolution,
      r.preset,
    ].filter(Boolean);
    return { label: short, sub: parts.join(" · ") };
  });
}

export function readBenchmarkDisclaimer(specs: unknown): string | null {
  if (!isRecord(specs)) return null;
  const d = specs.benchmarkDisclaimer;
  return typeof d === "string" && d.trim() ? d.trim() : null;
}

/** Lignes valides (nom de jeu non vide) pour persistance dans `specs`. */
export function normalizeBenchmarkRows(rows: GameBenchmarkRow[]): GameBenchmarkRow[] {
  return rows
    .filter((r) => r.game.trim())
    .map((r) => ({
      game: r.game.trim(),
      resolution: r.resolution?.trim() || undefined,
      preset: r.preset?.trim() || undefined,
      fpsAvg: r.fpsAvg,
      fps1Low: r.fps1Low,
    }));
}

/** Fusionne `gameBenchmarks` et `benchmarkDisclaimer` dans un objet specs (copie). */
export function mergeGameBenchmarksIntoSpecs(
  base: Record<string, unknown>,
  rows: GameBenchmarkRow[],
  disclaimer: string
): Record<string, unknown> {
  const out = { ...base };
  const cleaned = normalizeBenchmarkRows(rows);
  if (cleaned.length) out.gameBenchmarks = cleaned;
  else delete out.gameBenchmarks;
  const d = disclaimer.trim();
  if (d) out.benchmarkDisclaimer = d;
  else delete out.benchmarkDisclaimer;
  return out;
}
