import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck2 } from "lucide-react";
import { listMood } from "@/features/mood/lib/mood.functions";

/**
 * Lightweight weekly review. Renders on Sundays only. Uses existing
 * mood/check-in logs (no new server fn) to highlight qualitative wins:
 *   - number of days a check-in / mood was logged this week
 *   - one rescued "menang" (latest [malam] menang: … note) if any
 * Tone: supportive, no shaming.
 */
function startOfWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // ISO Monday start
  d.setDate(d.getDate() + diff);
  return d;
}

export function WeeklyReviewCard() {
  const fetchMood = useServerFn(listMood);
  const { data: moods = [] } = useQuery({
    queryKey: ["mood"],
    queryFn: () => fetchMood(),
    staleTime: 1000 * 60 * 10,
  });

  // Only render on Sunday
  const today = new Date();
  if (today.getDay() !== 0) return null;

  const since = startOfWeek().getTime();
  const thisWeek = moods.filter((m) => new Date(m.logged_at).getTime() >= since);
  const daysWithCheckIn = new Set(
    thisWeek.map((m) => new Date(m.logged_at).toISOString().slice(0, 10)),
  ).size;
  const lastWin = thisWeek
    .find((m) => m.note?.startsWith("[malam] menang:"))
    ?.note?.replace("[malam] menang:", "")
    .trim();

  // Hide if no signal at all — empty review feels worse than nothing.
  if (daysWithCheckIn === 0 && !lastWin) return null;

  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 space-y-2 animate-fade-up">
      <div className="flex items-center gap-2">
        <span
          className="size-8 rounded-xl bg-primary/10 text-primary grid place-items-center"
          aria-hidden
        >
          <CalendarCheck2 className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">Tinjauan mingguan</p>
          <p className="text-[11px] text-muted-foreground">Rekap halus, bukan rapor.</p>
        </div>
      </div>
      <ul className="text-xs text-muted-foreground space-y-1 pl-1">
        <li>
          Check-in tercatat:{" "}
          <span className="font-semibold text-foreground tabular-nums">{daysWithCheckIn} hari</span>{" "}
          minggu ini.
        </li>
        {lastWin && (
          <li>
            Kemenangan terbaru: <span className="text-foreground">“{lastWin}”</span>
          </li>
        )}
        <li className="pt-1 text-[11px]">
          Fokus minggu depan: 1 kebiasaan kecil yang bisa diulang setiap hari.
        </li>
      </ul>
    </section>
  );
}
