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

const RECITERS = [
  { id: "ar.alafasy", name: "Mishary Alafasy" },
  { id: "ar.abdurrahmaansudais", name: "Abdur-Rahman As-Sudais" },
  { id: "ar.saoodshuraym", name: "Saud Ash-Shuraim" },
  { id: "ar.mahermuaiqly", name: "Maher Al-Muaiqly" },
  { id: "ar.husary", name: "Mahmoud Khalil Al-Husary" },
  { id: "ar.minshawi", name: "Mohamed Siddiq Al-Minshawi" },
  { id: "ar.abdulbasitmurattal", name: "Abdul Basit Abdus-Samad" },
  { id: "ar.ahmedajamy", name: "Ahmed Al-Ajamy" },
] as const;
const RECITER_KEY = "faiz.reciter";
const initials = (name: string) =>
  name.split(/[\s-]+/).filter((w) => !/^(al|as|ash|abdus|abdur)$/i.test(w)).slice(0, 2).map((w) => w[0]).join("");

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
  const [reciter, setReciter] = useState<string>("ar.alafasy");
  // Two players alternate: while one plays, the next verse is already buffered in the other.
  const playersRef = useRef<HTMLAudioElement[]>([]);
  const slotRef = useRef(0);
  const stateRef = useRef({ index: null as number | null, all: false, ayahs: [] as Ayah[] });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECITER_KEY);
      if (saved && RECITERS.some((r) => r.id === saved)) setReciter(saved);
    } catch { /* ignore */ }
    playersRef.current = [new Audio(), new Audio()];
    playersRef.current.forEach((audio, slot) => {
      audio.preload = "auto";
      audio.addEventListener("ended", () => {
        if (slot !== slotRef.current) return;
        const { index, all, ayahs: list } = stateRef.current;
        if (all && index !== null && index < list.length - 1) playAtRef.current(index + 1, true);
        else { setPlayingIndex(null); setPlayingAll(false); }
      });
    });
    return () => playersRef.current.forEach((a) => { a.pause(); a.src = ""; });
  }, []);

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
    playersRef.current.forEach((a) => a.pause());
    const endpoint =
      mode === "page"
        ? `https://api.alquran.cloud/v1/page/${mushafPage}/${reciter}`
        : `https://api.alquran.cloud/v1/surah/${surahNumber}/${reciter}`;

    fetch(endpoint)
      .then((response) => {
        if (!response.ok) throw new Error("Quran request failed");
        return response.json();
      })
      .then((payload) => {
        if (cancelled) return;
        const loaded = payload.data.ayahs as Ayah[];
        if (mode === "ayah") {
          const surah = payload.data as SurahMeta;
          setAyahs(loaded.map((ayah) => ({ ...ayah, surah })));
        } else {
          setAyahs(loaded);
        }
      })
      .catch(() => !cancelled && setError("This reading could not be loaded. Please try again."))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [mode, mushafPage, surahNumber, reciter]);

  const filteredSurahs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return surahs;
    return surahs.filter((surah) =>
      `${surah.number} ${surah.englishName} ${surah.name}`.toLowerCase().includes(term),
    );
  }, [query, surahs]);

  const currentSurah = surahs.find((surah) => surah.number === surahNumber);
  const pageSurahs = Array.from(
    new Map(
      ayahs
        .filter((ayah) => ayah.surah)
        .map((ayah) => [ayah.surah.number, ayah.surah]),
    ).values(),
  );

  stateRef.current.ayahs = ayahs;

  const playAt = (index: number, continueAll = false) => {
    const players = playersRef.current;
    const source = ayahs[index]?.audio;
    if (players.length < 2 || !source) return;
    const current = players[slotRef.current]!;
    const other = players[1 - slotRef.current]!;
    current.pause();
    // Use the other player if it already holds this verse (pre-buffered).
    let audio = other;
    if (other.src !== source) { audio = current; audio.src = source; }
    else slotRef.current = 1 - slotRef.current;
    audio.currentTime = 0;
    stateRef.current.index = index;
    stateRef.current.all = continueAll;
    setPlayingIndex(index);
    setPlayingAll(continueAll);
    void audio.play().catch(() => {});
    const idle = players[1 - slotRef.current]!;
    const nextSource = ayahs[index + 1]?.audio;
    if (continueAll && nextSource && idle.src !== nextSource) { idle.src = nextSource; idle.load(); }
  };
  const playAtRef = useRef(playAt);
  playAtRef.current = playAt;

  const pauseAll = () => playersRef.current.forEach((a) => a.pause());

  const chooseReciter = (id: string) => {
    pauseAll();
    setReciter(id);
    try { localStorage.setItem(RECITER_KEY, id); } catch { /* ignore */ }
  };

  const toggleAll = () => {
    const audio = playersRef.current[slotRef.current];
    if (playingAll && audio && !audio.paused) {
      audio.pause();
      stateRef.current.all = false;
      setPlayingAll(false);
      return;
    }
    playAt(playingIndex ?? 0, true);
  };

  const toggleAyah = (index: number) => {
    const audio = playersRef.current[slotRef.current];
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-deep">The Noble Quran</h1>
          <p className="mt-1 text-sm text-deep/60">Arabic Mushaf with recitation by {RECITERS.find((r) => r.id === reciter)?.name}</p>
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

      <section className="mt-6" aria-label="Choose a reciter">
        <h2 className="text-sm font-semibold text-deep/70">Reciter</h2>
        <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
          {RECITERS.map((r) => {
            const active = r.id === reciter;
            return (
              <button key={r.id} type="button" onClick={() => chooseReciter(r.id)} aria-pressed={active}
                className={`flex w-24 shrink-0 flex-col items-center gap-2 rounded-md border p-2 text-center transition ${active ? "border-brand bg-mist" : "border-hairline bg-card hover:bg-mist"}`}>
                <span className={`grid size-14 place-items-center rounded-full font-display text-lg font-semibold ${active ? "bg-brand text-primary-foreground" : "bg-mist text-brand"}`}>
                  {initials(r.name)}
                </span>
                <span className="text-[11px] leading-tight text-deep">{r.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-md border border-hairline bg-card shadow-sm">
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