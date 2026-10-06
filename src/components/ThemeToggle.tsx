import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEME_KEY = "faiz.theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      let preference: string | null = null;
      try { preference = localStorage.getItem(THEME_KEY); } catch { /* Storage may be unavailable. */ }
      const enabled = preference === "dark" || (preference !== "light" && media.matches);
      document.documentElement.classList.toggle("dark", enabled);
      setDark(enabled);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const toggle = () => {
    const enabled = !dark;
    document.documentElement.classList.toggle("dark", enabled);
    setDark(enabled);
    try { localStorage.setItem(THEME_KEY, enabled ? "dark" : "light"); } catch { /* Keep working without storage. */ }
  };

  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={label} title={label}
      className="shrink-0 border border-border text-deep hover:bg-mist hover:text-deep">
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}