import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/quran")({
  head: () => ({
    meta: [
      { title: "Read the Quran — Arabic, Translation and Recitation | Faiz" },
      {
        name: "description",
        content:
          "All 114 surahs with the Uthmani Arabic text, clear English translation and full recitation audio by Mishary Alafasy.",
      },
      { property: "og:title", content: "Quran Reader — Arabic, Translation, Audio" },
      {
        property: "og:description",
        content: "Verse-by-verse Quran with English translation and recitation audio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuranPage,
});

interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface Ayah {
  numberInSurah: number;
  text: string;
  audio?: string;
}

const toArabicDigits = (n: number) =>
  String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]!);

function QuranPage() {
  const [list, setList] = useState<SurahMeta[]>([]);
  const [current, setCurrent] = useState(1);
  const [arabic, setArabic] = useState<Ayah[]>([]);
  const [english, setEnglish] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"page" | "verse">("page");
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetch("https://api.alquran.cloud/v1/surah")
      .then((r) => r.json())
      .then((d) => setList(d.data as SurahMeta[]))
      .catch(() => setError("Could not load the surah list. Check your connection."));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${current}/ar.alafasy`).then((r) => r.json()),
      fetch(`https://api.alquran.cloud/v1/surah/${current}/en.sahih`).then((r) => r.json()),
    ])
      .then(([a, e]) => {
        if (cancelled) return;
        setArabic(a.data.ayahs as Ayah[]);
        setEnglish(e.data.ayahs as Ayah[]);
      })
      .catch(() => !cancelled && setError("Could not load this surah. Try again."))
      .finally(() => !cancelled && setLoading(false));
    setPage(0);
    return () => {
      cancelled = true;
    };
  }, [current]);

  const PER_PAGE = 12;
  const totalPages = Math.ceil(arabic.length / PER_PAGE);
  const pageAyahs = arabic.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const meta = list.find((s) => s.number === current);
  const filtered = list.filter((s) =>
    `${s.number} ${s.englishName} ${s.name}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-semibold text-deep font-display tracking-tight">
        Quran
      </h1>
      <p className="mt-2 text-sm text-deep/60">
        Uthmani Arabic, English translation and verse recitation.
      </p>

      <div className="mt-8 grid lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 glass-panel rounded-3xl p-4 h-fit lg:sticky lg:top-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search surah…"
            className="w-full rounded-xl bg-mist px-4 py-2.5 text-sm text-deep placeholder:text-deep/40 outline-none"
          />
          <div className="mt-3 max-h-[28rem] overflow-y-auto divide-y divide-hairline">
            {filtered.map((s) => (
              <button
                key={s.number}
                onClick={() => setCurrent(s.number)}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-3 rounded-xl transition ${
                  s.number === current ? "bg-brand/10" : "hover:bg-mist/70"
                }`}
              >
                <span className="w-7 h-7 rounded-lg bg-mist grid place-items-center text-[11px] font-semibold text-deep/70">
                  {s.number}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-deep">
                    {s.englishName}
                  </span>
                  <span className="block text-[11px] text-deep/50">
                    {s.englishNameTranslation} · {s.numberOfAyahs} āyāt
                  </span>
                </span>
                <span className="text-sm text-deep/70">{s.name}</span>
              </button>
            ))}
            {list.length === 0 && !error && (
              <p className="px-3 py-4 text-sm text-deep/50">Loading surahs…</p>
            )}
          </div>
        </aside>

        <section className="lg:col-span-8 glass-panel rounded-3xl overflow-hidden">
          <div className="px-7 py-5 border-b border-hairline">
            <p className="text-xs uppercase tracking-[0.18em] text-brand/70 font-semibold">
              Surah {current}
              {meta ? ` · ${meta.revelationType}` : ""}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-2xl font-semibold text-deep font-display">
                {meta ? `${meta.englishName} — ${meta.name}` : "…"}
              </p>
              <div className="flex gap-1 bg-mist rounded-xl p-1">
                {(["page", "verse"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      mode === m ? "bg-white text-deep shadow-sm" : "text-deep/50"
                    }`}
                  >
                    {m === "page" ? "Page reading" : "Verse by verse"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="px-7 py-6 text-sm text-deep/60">{error}</p>}
          {loading && <p className="px-7 py-6 text-sm text-deep/50">Loading verses…</p>}

          {!loading && !error && mode === "verse" && (
            <div className="divide-y divide-hairline">
              {arabic.map((a, i) => (
                <article key={a.numberInSurah} className="px-7 py-6">
                  <div className="flex items-start justify-between gap-4">
                    <span className="w-8 h-8 shrink-0 rounded-full bg-mist grid place-items-center text-[11px] font-semibold text-deep/70">
                      {a.numberInSurah}
                    </span>
                    <p
                      dir="rtl"
                      lang="ar"
                      className="flex-1 text-right text-2xl leading-[2.2] text-deep"
                    >
                      {a.text}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-deep/70 leading-relaxed">
                    {english[i]?.text}
                  </p>
                  {a.audio && (
                    <audio controls preload="none" src={a.audio} className="mt-3 w-full h-9" />
                  )}
                </article>
              ))}
            </div>
          )}

          {!loading && !error && mode === "page" && (
            <div>
              <div className="px-8 sm:px-12 py-10 bg-[color-mix(in_srgb,var(--gold)_7%,white)] border-y border-hairline">
                <p
                  dir="rtl"
                  lang="ar"
                  className="text-right text-[1.7rem] leading-[2.6] text-deep"
                  style={{ textAlign: "justify", textAlignLast: "right" }}
                >
                  {pageAyahs.map((a) => (
                    <span key={a.numberInSurah}>
                      {a.text}{" "}
                      <span className="text-gold text-lg align-middle tabular-nums">
                        ﴿{toArabicDigits(a.numberInSurah)}﴾
                      </span>{" "}
                    </span>
                  ))}
                </p>
              </div>

              <div className="px-8 sm:px-12 py-8 space-y-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand/70 font-semibold">
                  Translation
                </p>
                {pageAyahs.map((a) => (
                  <p key={a.numberInSurah} className="text-sm text-deep/70 leading-relaxed">
                    <span className="font-semibold text-deep/50 mr-2 tabular-nums">
                      {a.numberInSurah}
                    </span>
                    {english[a.numberInSurah - 1]?.text}
                  </p>
                ))}
              </div>

              <div className="px-8 sm:px-12 py-4 border-t border-hairline flex items-center justify-between gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 0))}
                  disabled={page === 0}
                  className="px-4 py-2 rounded-xl bg-mist text-sm font-semibold text-deep/70 disabled:opacity-40"
                >
                  ← Previous page
                </button>
                <span className="text-xs text-deep/50 tabular-nums">
                  Page {page + 1} of {Math.max(totalPages, 1)}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 rounded-xl bg-mist text-sm font-semibold text-deep/70 disabled:opacity-40"
                >
                  Next page →
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
