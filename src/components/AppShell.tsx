import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useLocationSettings } from "@/context/location";
import { LocationDialog } from "@/components/LocationDialog";

const NAV = [
  { to: "/", label: "Prayer Times" },
  { to: "/qibla", label: "Qibla" },
  { to: "/quran", label: "Quran" },
  { to: "/dhikr", label: "Dhikr" },
  { to: "/calendar", label: "Calendar" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { location } = useLocationSettings();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-surface overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="orb-1 absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-brand/20 blur-[120px]" />
        <div className="orb-2 absolute top-1/3 -right-40 w-[560px] h-[560px] rounded-full bg-gold/15 blur-[130px]" />
        <div className="absolute bottom-0 left-1/4 w-[420px] h-[420px] rounded-full bg-mist blur-[110px]" />
      </div>

      <header className="relative z-10 px-6 py-5 flex items-center justify-between gap-4 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand/90 grid place-items-center text-primary-foreground font-display font-bold shadow-lg shadow-brand/20">
            F
          </div>
          <span className="text-lg font-semibold text-deep tracking-tight">Faiz</span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-brand/60 mt-1">
            Shafiʿī Azan
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-deep/70">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "text-brand" }}
              activeOptions={{ exact: item.to === "/" }}
              className="hover:text-brand transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs font-medium text-deep/60 bg-white/60 backdrop-blur-md px-3 py-2 rounded-xl border border-hairline">
            {location.name}
            {location.region ? `, ${location.region}` : ""}
          </span>
          <button
            onClick={() => setOpen(true)}
            className="bg-brand text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-brand/25 hover:bg-deep transition"
          >
            Set Location
          </button>
        </div>
      </header>

      <div className="relative z-10">{children}</div>

      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-deep/50">
        <p>
          Faiz · prayer times computed on the traditional Shafiʿī reckoning, corrected for the
          visible horizon and your elevation.
        </p>
        <Link to="/methodology" className="font-semibold text-brand hover:text-deep transition">
          View methodology →
        </Link>
      </footer>

      <nav className="md:hidden sticky bottom-0 z-20 glass-panel rounded-none border-x-0 border-b-0 flex justify-between px-2 py-2">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeProps={{ className: "text-brand bg-mist/70" }}
            activeOptions={{ exact: item.to === "/" }}
            className="flex-1 text-center text-[11px] font-medium text-deep/60 py-2 rounded-xl"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <LocationDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
