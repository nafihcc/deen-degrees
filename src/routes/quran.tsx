import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, List, Pause, Play, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/quran")({
  head: () => ({
    meta: [
      { title: "Read the Quran — Arabic Pages and Recitation | Faiz" },
      {
        name: "description",
        content: "Read the Holy Quran in Arabic by Mushaf page or verse, with Mishary Alafasy recitation.",
      },
      { property: "og:title", content: "Arabic Quran Reader and Recitation | Faiz" },
      {
        property: "og:description",
        content: "An Arabic-only Quran reader with 604 Mushaf pages and verse recitation.",
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
  numberOfAyahs: number;
}

interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
  audio?: string;
  surah: SurahMeta;
}

const toArabicDigits = (value: number) =>
  String(value).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)] ?? digit);

function QuranPage() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [mode, setMode] = useState<"page" | "ayah">("page");
  const [mushafPage, setMushafPage] = useState(1);
  const [surahNumber, setSurahNumber] = useState(1);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [playingAll, setPlayingAll] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetch("https://api.alquran.cloud/v1/surah")
      .then((response) => {
        if (!response.ok) throw new Error("Surah list request failed");
        return response.json();
      })
      .then((payload) => setSurahs(payload.data as SurahMeta[]))
      .catch(() => setError("The Quran could not be loaded. Please try again."));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPlayingIndex(null);
    setPlayingAll(false);
    audioRef.current?.pause();
    const endpoint =
      mode === "page"
        ? `https://api.alquran.cloud/v1/page/${mushafPage}/ar.alafasy`
        : `https://api.alquran.cloud/v1/surah/${surahNumber}/ar.alafasy`;

    fetch(endpoint)
      .then((response) => {
        if (!response.ok) throw new Error("Quran request failed");
        return response.json();
      })
      .then((payload) => {
        if (!cancelled) setAyahs(payload.data.ayahs as Ayah[]);
      })
      .catch(() => !cancelled && setError("This reading could not be loaded. Please try again."))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [mode, mushafPage, surahNumber]);

  const filteredSurahs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return surahs;
    return surahs.filter((surah) =>
      `${surah.number} ${surah.englishName} ${surah.name}`.toLowerCase().includes(term),
    );
  }, [query, surahs]);

  const currentSurah = surahs.find((surah) => surah.number === surahNumber);
  const pageSurahs = Array.from(new Map(ayahs.map((ayah) => [ayah.surah.number, ayah.surah])).values());

  const playAt = (index: number, continueAll = false) => {
    const audio = audioRef.current;
    const source = ayahs[index]?.audio;
    if (!audio || !source) return;
    audio.src = source;
    setPlayingIndex(index);
    setPlayingAll(continueAll);
    void audio.play();
  };

  const toggleAll = () => {
    const audio = audioRef.current;
    if (playingAll && audio && !audio.paused) {
      audio.pause();
      setPlayingAll(false);
      return;
    }
    playAt(playingIndex ?? 0, true);
  };

  const toggleAyah = (index: number) => {
    const audio = audioRef.current;
    if (playingIndex === index && audio && !audio.paused) {
      audio.pause();
      setPlayingIndex(null);
      setPlayingAll(false);
      return;
    }
    playAt(index, false);
  };

  const selectSurah = (number: number) => {
    setMode("ayah");
    setSurahNumber(number);
    setSearchOpen(false);
    setQuery("");
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <audio
        ref={audioRef}
        onEnded={() => {
          if (playingAll && playingIndex !== null && playingIndex < ayahs.length - 1) {
            playAt(playingIndex + 1, true);
          } else {
            setPlayingIndex(null);
            setPlayingAll(false);
          }
        }}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-deep">The Noble Quran</h1>
          <p className="mt-1 text-sm text-deep/60">Arabic Mushaf with Mishary Alafasy recitation</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setSearchOpen((open) => !open)}
          aria-expanded={searchOpen}
          aria-controls="surah-finder"
        >
          {searchOpen ? <X /> : <Search />}
          {searchOpen ? "Close" : "Find Surah"}
        </Button>
      </div>

      {searchOpen && (
        <section id="surah-finder" className="mt-5 border-y border-hairline bg-card py-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-deep/40" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by Surah name or number"
              className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm text-deep outline-none focus:ring-2 focus:ring-ring/30"
            />
          </label>
          <div className="mt-3 grid max-h-64 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {filteredSurahs.map((surah) => (
              <Button
                key={surah.number}
                variant="ghost"
                className="h-auto justify-start px-3 py-2 text-left"
                onClick={() => selectSurah(surah.number)}
              >
                <span className="w-7 text-xs tabular-nums text-deep/50">{surah.number}</span>
                <span className="flex-1 truncate">{surah.englishName}</span>
                <span lang="ar" dir="rtl" className="font-arabic text-base">{surah.name}</span>
              </Button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 overflow-hidden rounded-md border border-hairline bg-card shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3 sm:px-6">
          <div className="flex rounded-md bg-mist p-1" aria-label="Reading mode">
            <Button
              size="sm"
              variant={mode === "page" ? "default" : "ghost"}
              onClick={() => setMode("page")}
            >
              <List /> Page
            </Button>
            <Button
              size="sm"
              variant={mode === "ayah" ? "default" : "ghost"}
              onClick={() => setMode("ayah")}
            >
              Ayah
            </Button>
          </div>

          <div className="text-center">
            <p lang="ar" dir="rtl" className="font-arabic text-xl text-deep">
              {mode === "page"
                ? pageSurahs.map((surah) => surah.name).join(" · ") || "القرآن الكريم"
                : currentSurah?.name || "القرآن الكريم"}
            </p>
            <p className="text-xs text-deep/50">
              {mode === "page" ? `Mushaf page ${mushafPage} of 604` : currentSurah?.englishName}
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={toggleAll} disabled={loading || ayahs.length === 0}>
            {playingAll ? <Pause /> : <Play />}
            {playingAll ? "Pause" : mode === "page" ? "Play page" : "Play Surah"}
          </Button>
        </header>

        {error && <p className="px-6 py-10 text-center text-sm text-destructive">{error}</p>}
        {loading && <p className="px-6 py-16 text-center text-sm text-deep/50">Loading Quran…</p>}

        {!loading && !error && mode === "page" && (
          <div className="quran-page px-5 py-8 sm:px-10 sm:py-12">
            <p lang="ar" dir="rtl" className="font-arabic text-right text-[1.8rem] leading-[2.55] text-deep sm:text-[2.05rem]">
              {ayahs.map((ayah, index) => (
                <span key={ayah.number}>
                  <button
                    type="button"
                    onClick={() => toggleAyah(index)}
                    className={`rounded-sm px-0.5 transition-colors ${playingIndex === index ? "bg-gold/20" : "hover:bg-mist"}`}
                    aria-label={`Play verse ${ayah.numberInSurah}`}
                  >
                    {ayah.text}
                    <span className="mx-1 inline-grid size-8 place-items-center align-middle text-base text-brand">
                      ﴿{toArabicDigits(ayah.numberInSurah)}﴾
                    </span>
                  </button>{" "}
                </span>
              ))}
            </p>
          </div>
        )}

        {!loading && !error && mode === "ayah" && (
          <div className="divide-y divide-hairline">
            {ayahs.map((ayah, index) => (
              <article key={ayah.number} className="flex items-start gap-4 px-5 py-6 sm:px-8">
                <Button
                  variant={playingIndex === index ? "default" : "outline"}
                  size="icon"
                  onClick={() => toggleAyah(index)}
                  aria-label={`${playingIndex === index ? "Pause" : "Play"} verse ${ayah.numberInSurah}`}
                  className="mt-2 shrink-0"
                >
                  {playingIndex === index ? <Pause /> : <Play />}
                </Button>
                <p lang="ar" dir="rtl" className="min-w-0 flex-1 font-arabic text-right text-[1.85rem] leading-[2.25] text-deep sm:text-[2.1rem]">
                  {ayah.text}
                  <span className="mr-2 inline-grid size-9 place-items-center align-middle text-base text-brand">
                    ﴿{toArabicDigits(ayah.numberInSurah)}﴾
                  </span>
                </p>
              </article>
            ))}
          </div>
        )}

        <footer className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-3 sm:px-6">
          <Button
            variant="outline"
            size="sm"
            disabled={mode === "page" ? mushafPage <= 1 : surahNumber <= 1}
            onClick={() => mode === "page" ? setMushafPage((page) => page - 1) : setSurahNumber((number) => number - 1)}
          >
            <ChevronLeft /> Previous
          </Button>
          <span className="text-xs tabular-nums text-deep/50">
            {mode === "page" ? `${mushafPage} / 604` : `${surahNumber} / 114`}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={mode === "page" ? mushafPage >= 604 : surahNumber >= 114}
            onClick={() => mode === "page" ? setMushafPage((page) => page + 1) : setSurahNumber((number) => number + 1)}
          >
            Next <ChevronRight />
          </Button>
        </footer>
      </section>
    </main>
  );
}