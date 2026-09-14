import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLocationSettings } from "@/context/location";
import { useNow } from "@/hooks/usePrayerTimes";
import {
  PRAYER_LABELS,
  PRAYER_ORDER,
  computePrayerTimes,
  formatTime,
} from "@/lib/prayer-times";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Monthly Prayer Timetable for Your Location | Faiz" },
      {
        name: "description",
        content:
          "A full month of Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha times computed from your own coordinates and elevation on the Shafiʿī reckoning.",
      },
      { property: "og:title", content: "Monthly Prayer Timetable | Faiz" },
      {
        property: "og:description",
        content: "Print-friendly month view of accurate azan times for your exact place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { location, settings } = useLocationSettings();
  const now = useNow(60_000);
  const [offset, setOffset] = useState(0);

  const base = useMemo(() => {
    if (!now) return null;
    return new Date(now.getFullYear(), now.getMonth() + offset, 1);
  }, [now ? `${now.getFullYear()}-${now.getMonth()}` : null, offset]);

  const rows = useMemo(() => {
    if (!base) return [];
    const days = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const point = {
      latitude: location.latitude,
      longitude: location.longitude,
      elevation: location.elevation,
    };
    return Array.from({ length: days }, (_, i) => {
      const day = new Date(base.getFullYear(), base.getMonth(), i + 1);
      return { day, times: computePrayerTimes(day, point, settings).times };
    });
  }, [base, location, settings]);

  const todayKey = now ? now.toDateString() : "";

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold text-deep font-display tracking-tight">
            Monthly timetable
          </h1>
          <p className="mt-2 text-sm text-deep/60">
            {location.name}
            {location.region ? `, ${location.region}` : ""} · elevation{" "}
            {Math.round(location.elevation)} m
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="px-4 py-2 rounded-xl bg-mist text-sm font-semibold text-deep/70 hover:text-deep transition"
          >
            ←
          </button>
          <span className="min-w-[11rem] text-center text-sm font-semibold text-deep">
            {base
              ? base.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
              : "…"}
          </span>
          <button
            onClick={() => setOffset((o) => o + 1)}
            className="px-4 py-2 rounded-xl bg-mist text-sm font-semibold text-deep/70 hover:text-deep transition"
          >
            →
          </button>
        </div>
      </header>

      <div className="mt-8 glass-panel rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/50 border-b border-hairline text-deep/60">
                <th className="text-left font-semibold px-5 py-3">Date</th>
                {PRAYER_ORDER.map((k) => (
                  <th key={k} className="text-right font-semibold px-5 py-3">
                    {PRAYER_LABELS[k]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map(({ day, times }) => {
                const isToday = day.toDateString() === todayKey;
                return (
                  <tr key={day.toDateString()} className={isToday ? "bg-brand/[0.07]" : ""}>
                    <td className="px-5 py-2.5 font-medium text-deep whitespace-nowrap">
                      {day.toLocaleDateString("en-GB", { day: "2-digit", weekday: "short" })}
                    </td>
                    {PRAYER_ORDER.map((k) => (
                      <td
                        key={k}
                        className="px-5 py-2.5 text-right tabular-nums text-deep/80"
                      >
                        {formatTime(times[k])}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-deep/50" colSpan={7}>
                    Preparing the timetable…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
