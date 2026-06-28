import { MOODS, type MoodId } from "@/lib/sleepData";
import type { MoodEntry } from "@/lib/userData";

const SCORES: Record<MoodId, number> = {
  happy: 5,
  calm: 4,
  neutral: 3,
  tired: 2,
  sad: 2,
  angry: 1,
};

export function MoodGraph({ moods }: { moods: MoodEntry[] }) {
  // Build last 14 days timeline
  const days = 14;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const points: { date: Date; key: string; entry?: MoodEntry }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    points.push({ date: d, key, entry: moods.find((m) => m.date === key) });
  }

  const W = 600;
  const H = 200;
  const padX = 28;
  const padY = 28;
  const stepX = (W - padX * 2) / (days - 1);
  const yFor = (score: number) => H - padY - ((score - 1) / 4) * (H - padY * 2);

  const coords = points
    .map((p, i) => ({ x: padX + i * stepX, y: p.entry ? yFor(SCORES[p.entry.mood as MoodId] ?? 3) : null, p }));

  // Path through known points
  const knownCoords = coords.filter((c) => c.y !== null) as { x: number; y: number; p: typeof coords[number]["p"] }[];
  const pathD = knownCoords.length
    ? knownCoords
        .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y!.toFixed(1)}`)
        .join(" ")
    : "";

  const areaD = knownCoords.length
    ? `${pathD} L ${knownCoords[knownCoords.length - 1].x} ${H - padY} L ${knownCoords[0].x} ${H - padY} Z`
    : "";

  return (
    <div className="aura-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Mood — Last 14 days</h2>
        <span className="text-xs text-slate-400">{knownCoords.length} logged</span>
      </div>

      {knownCoords.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Log a mood to start your graph.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full">
          <defs>
            <linearGradient id="moodArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(48 96% 54%)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="hsl(48 96% 54%)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* gridlines */}
          {[1, 2, 3, 4, 5].map((s) => (
            <line
              key={s}
              x1={padX}
              x2={W - padX}
              y1={yFor(s)}
              y2={yFor(s)}
              stroke="hsl(215 16% 63% / 0.12)"
              strokeDasharray="3 4"
            />
          ))}

          {areaD && <path d={areaD} fill="url(#moodArea)" />}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="hsl(48 96% 54%)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 0 6px hsl(48 96% 54% / 0.6))" }}
            />
          )}

          {/* points + emojis */}
          {coords.map((c, i) => {
            if (c.y === null) return null;
            const mood = MOODS.find((m) => m.id === c.p.entry!.mood);
            return (
              <g key={i}>
                <circle cx={c.x} cy={c.y} r={4} fill="hsl(240 45% 9%)" stroke="hsl(48 96% 54%)" strokeWidth="2" />
                <text x={c.x} y={c.y - 10} textAnchor="middle" fontSize="14">
                  {mood?.emoji}
                </text>
              </g>
            );
          })}

          {/* x-axis day labels (every 2 days) */}
          {coords.map((c, i) =>
            i % 2 === 0 ? (
              <text
                key={`d${i}`}
                x={c.x}
                y={H - 8}
                textAnchor="middle"
                fontSize="10"
                fill="hsl(215 16% 63%)"
              >
                {c.p.date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
              </text>
            ) : null,
          )}
        </svg>
      )}
    </div>
  );
}
