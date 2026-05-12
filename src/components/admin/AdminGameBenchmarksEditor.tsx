"use client";

import type { GameBenchmarkRow } from "@/lib/gameBenchmarks";

const emptyRow = (): GameBenchmarkRow => ({
  game: "",
  resolution: "",
  preset: "",
  fpsAvg: undefined,
  fps1Low: undefined,
});

type Props = {
  rows: GameBenchmarkRow[];
  disclaimer: string;
  onChange: (next: { rows: GameBenchmarkRow[]; disclaimer: string }) => void;
};

export default function AdminGameBenchmarksEditor({ rows, disclaimer, onChange }: Props) {
  const updateRow = (index: number, patch: Partial<GameBenchmarkRow>) => {
    const next = rows.map((r, j) => (j === index ? { ...r, ...patch } : r));
    onChange({ rows: next, disclaimer });
  };

  const addRow = () => onChange({ rows: [...rows, emptyRow()], disclaimer });

  const removeRow = (index: number) => onChange({ rows: rows.filter((_, j) => j !== index), disclaimer });

  const parseOptionalInt = (raw: string): number | undefined => {
    if (raw.trim() === "") return undefined;
    const n = Math.round(Number(raw));
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  return (
    <div className="mt-6 rounded-lg border border-[var(--accent)]/35 bg-[var(--accent)]/[0.06] p-4">
      <h4 className="font-semibold text-white">Performances en jeu</h4>
      <p className="mt-1 text-xs text-white/55">
        Ces données s’affichent sur la fiche produit (tableau FPS + aperçu sur l’accueil). Ignorez les lignes sans nom de jeu.
      </p>

      <div className="mt-4 space-y-3">
        {rows.length === 0 && (
          <p className="text-sm text-white/50">Aucun jeu renseigné — la section « Perf jeux » restera masquée sur le site.</p>
        )}
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid gap-2 rounded-md border border-white/10 bg-black/30 p-3 md:grid-cols-[1.4fr_0.7fr_0.9fr_0.55fr_0.55fr_auto] md:items-end"
          >
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-white/50">Jeu</label>
              <input
                className="w-full rounded-md border border-white/10 bg-black/25 px-2 py-2 text-sm"
                placeholder="ex. Cyberpunk 2077"
                value={row.game}
                onChange={(e) => updateRow(i, { game: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-white/50">Résolution</label>
              <input
                className="w-full rounded-md border border-white/10 bg-black/25 px-2 py-2 text-sm"
                placeholder="1080p"
                value={row.resolution ?? ""}
                onChange={(e) => updateRow(i, { resolution: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-white/50">Réglages</label>
              <input
                className="w-full rounded-md border border-white/10 bg-black/25 px-2 py-2 text-sm"
                placeholder="Ultra"
                value={row.preset ?? ""}
                onChange={(e) => updateRow(i, { preset: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-white/50">FPS moy.</label>
              <input
                type="number"
                min={0}
                step={1}
                className="w-full rounded-md border border-white/10 bg-black/25 px-2 py-2 text-sm tabular-nums"
                placeholder="—"
                value={row.fpsAvg ?? ""}
                onChange={(e) => updateRow(i, { fpsAvg: parseOptionalInt(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-white/50">1 % low</label>
              <input
                type="number"
                min={0}
                step={1}
                className="w-full rounded-md border border-white/10 bg-black/25 px-2 py-2 text-sm tabular-nums"
                placeholder="—"
                value={row.fps1Low ?? ""}
                onChange={(e) => updateRow(i, { fps1Low: parseOptionalInt(e.target.value) })}
              />
            </div>
            <div className="flex items-end justify-end md:pb-0.5">
              <button type="button" className="btn-ghost text-sm" onClick={() => removeRow(i)}>
                Retirer
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="mt-3 btn-ghost text-sm" onClick={addRow}>
        + Ajouter un jeu
      </button>

      <div className="mt-4">
        <label className="mb-1 block text-sm text-white/75">Texte légal / disclaimer (optionnel)</label>
        <textarea
          rows={2}
          className="w-full rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm"
          placeholder="Ex. : Mesures internes, non contractuelles…"
          value={disclaimer}
          onChange={(e) => onChange({ rows, disclaimer: e.target.value })}
        />
      </div>
    </div>
  );
}
