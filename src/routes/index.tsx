import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useLocationSettings } from "@/context/location";
import { usePrayerTimes, useHijriDate } from "@/hooks/usePrayerTimes";
import { LocationDialog } from "@/components/LocationDialog";
import {
  PRAYER_LABELS,
  PRAYER_ORDER,
  formatCountdown,
  formatTime,
  prayerBasis,
  type PrayerKey,
} from "@/lib/prayer-times";
import { qiblaBearing } from "@/lib/qibla";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Faiz — Accurate Shafiʿī Prayer Times for Your Exact Place" },
      {
        name: "description",
        content:
          "Prayer times computed live from your coordinates and elevation: Fajr at true dawn (20°), Isha at 18°, and Maghrib held until the whole solar disc is below the visible horizon.",
      },
      { property: "og:title", content: "Faiz — Accurate Shafiʿī Prayer Times" },
      {
        property: "og:description",
        content:
          "Location-aware azan times on the traditional Shafiʿī reckoning, with Quran, Qibla compass and dhikr counter.",
      },
    ],
  }),
  component: Home,
});

const ICONS: Record<PrayerKey, string> = {
  fajr: "🌘",
  sunrise: "🌅",
  dhuhr: "☀️",
  asr: "🌤️",
  maghrib: "🌇",
  isha: "🌙",
};

function Home() {
  const { location, settings, isDefault } = useLocationSettings();
  const { result, next, now } = usePrayerTimes();
  const hijri = useHijriDate(now);
  const [dialog, setDialog] = useState(false);
  const bearing = qiblaBearing(location.latitude, location.longitude);

  return (
    <main className="max-w-7xl mx-auto px-6">
      <section className="pt-10 pb-16 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 bg-white/50 backdrop-blur-md border border-hairline rounded-full px-4 py-1.5 self-start">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-xs font-medium text-deep/80">
              Computed on the traditional Shafiʿī reckoning
            </span>
          </div>

          <h1 className="mt-6 text-5xl lg:text-6xl font-semibold text-deep leading-[1.05] tracking-tight">
            Your prayer,
            <br />
            <span className="text-brand">precisely</span> timed.
          </h1>

          <p className="mt-5 text-deep/60 text-base leading-relaxed max-w-sm">
            Faiz reads your coordinates and elevation, then computes each azan on the Shafiʿī
            reckoning — Maghrib held past true sunset, Fajr set at true dawn.
          </p>

          <div className="mt-8 glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-brand/70 font-semibold">
                  Next Prayer
                </p>
                <p className="text-3xl font-semibold text-deep mt-1 font-display">
                  {next ? PRAYER_LABELS[next.key] : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold text-deep font-display tabular-nums">
                  {next ? formatTime(next.at) : "--:--"}
                </p>
                <p className="text-xs text-gold font-medium mt-0.5 tabular-nums">
                  {next ? `in ${formatCountdown(next.msRemaining)}` : "calculating…"}
                </p>
              </div>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-mist overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand to-gold rounded-full transition-[width] duration-1000"
                style={{ width: `${Math.round((next?.progress ?? 0) * 100)}%` }}
              />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-deep/50">
              <span className="w-1.5 h-1.5 rounded-full bg-brand" />
              Fajr {settings.fajrAngle}° · Isha {settings.ishaAngle}° · true-sunset Maghrib
            </div>
          </div>

          {isDefault && (
            <button
              onClick={() => setDialog(true)}
              className="mt-4 text-xs font-semibold text-brand hover:text-deep transition self-start"
            >
              Showing Kozhikode by default — set your own location →
            </button>
          )}
        </div>

        <div className="lg:col-span-7">
          <div className="glass-panel rounded-3xl overflow-hidden">
            <div className="px-7 py-5 border-b border-hairline flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-brand/70 font-semibold">
                  {hijri || "Today"}
                </p>
                <p className="text-lg font-semibold text-deep font-display">
                  {location.name}
                  {location.region ? `, ${location.region}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-mist/60 px-3 py-1.5 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-brand" />
                <span className="text-xs font-medium text-deep/70">
                  Elevation {Math.round(location.elevation)} m
                </span>
              </div>
            </div>

            <div className="divide-y divide-hairline">
              {PRAYER_ORDER.map((key) => {
                const isNext = next?.key === key;
                return (
                  <div
                    key={key}
                    className={`px-7 py-4 flex items-center gap-4 ${
                      key === "maghrib" ? "bg-brand/[0.06]" : ""
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl grid place-items-center text-base ${
                        key === "maghrib" ? "bg-brand/15" : "bg-mist"
                      }`}
                    >
                      {ICONS[key]}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-deep flex items-center gap-2">
                        {PRAYER_LABELS[key]}
                        {isNext && (
                          <span className="text-[10px] font-semibold bg-brand/15 text-brand px-2 py-0.5 rounded-full">
                            Next
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-deep/50">{prayerBasis(key, settings)}</p>
                    </div>
                    <p
                      className={`text-lg font-semibold font-display tabular-nums ${
                        key === "maghrib" ? "text-brand" : "text-deep"
                      }`}
                    >
                      {result ? formatTime(result.times[key]) : "--:--"}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="px-7 py-4 bg-white/40 border-t border-hairline flex items-center justify-between gap-3">
              <p className="text-xs text-deep/50">
                Horizon dip {result ? result.horizonDipDegrees.toFixed(2) : "0.00"}° · Maghrib at{" "}
                {result ? result.maghribAngle.toFixed(2) : "1.00"}° below the astronomical horizon
              </p>
              <Link
                to="/methodology"
                className="text-xs font-semibold text-brand hover:text-deep transition whitespace-nowrap"
              >
                View methodology →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="grid md:grid-cols-3 gap-5">
          <Link to="/qibla" className="glass-panel rounded-3xl p-6 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🧭</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-brand/60">
                AR · Compass
              </span>
            </div>
            <p className="mt-4 text-xl font-semibold text-deep font-display">Qibla Finder</p>
            <p className="mt-2 text-sm text-deep/60 leading-relaxed">
              Rotate your device to face the Kaʿbah with augmented-reality overlay, magnetic or
              manual compass.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex-1 h-24 rounded-2xl bg-mist/70 border border-hairline grid place-items-center">
                <span className="text-sm font-semibold text-deep/70 tabular-nums">
                  {bearing.toFixed(1)}°
                </span>
              </div>
              <div className="flex-1 h-24 rounded-2xl bg-brand/10 border border-brand/20 grid place-items-center">
                <span className="text-[10px] uppercase tracking-[0.15em] text-brand/60">
                  AR View
                </span>
              </div>
            </div>
          </Link>

          <Link to="/quran" className="glass-panel rounded-3xl p-6 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <span className="text-2xl">📖</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-brand/60">
                Arabic · Recitation
              </span>
            </div>
            <p className="mt-4 text-xl font-semibold text-deep font-display">Quran Reader</p>
            <p className="mt-2 text-sm text-deep/60 leading-relaxed">
              All 114 surahs in Arabic, arranged by Mushaf page or ayah with full recitation.
            </p>
            <div className="mt-5 rounded-2xl bg-white/50 border border-hairline p-4">
              <p className="text-xs text-deep/50">سورة الفاتحة · ١:٥</p>
              <p dir="rtl" lang="ar" className="mt-1 font-arabic text-lg text-deep">
                إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ
              </p>
            </div>
          </Link>

          <Link to="/dhikr" className="glass-panel rounded-3xl p-6 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <span className="text-2xl">📿</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-brand/60">
                Tally · Streaks
              </span>
            </div>
            <p className="mt-4 text-xl font-semibold text-deep font-display">Dhikr Counter</p>
            <p className="mt-2 text-sm text-deep/60 leading-relaxed">
              Tap-friendly beading with progress rings, saved phrases and daily totals.
            </p>
            <div className="mt-5 flex items-center gap-4">
              <div className="relative w-24 h-24 rounded-full grid place-items-center">
                <div className="absolute inset-0 rounded-full bg-mist" />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "conic-gradient(var(--gold) 0deg, var(--gold) 252deg, transparent 252deg)",
                  }}
                />
                <div className="relative w-[74px] h-[74px] rounded-full bg-white grid place-items-center">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-deep font-display">33</p>
                    <p className="text-[9px] uppercase tracking-widest text-deep/50">/ 33</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-deep">SubḥānAllāh</p>
                <p className="text-xs text-deep/50 mt-1">after every prayer</p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <LocationDialog open={dialog} onClose={() => setDialog(false)} />
    </main>
  );
}
