import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocationSettings } from "@/context/location";
import { computePrayerTimes, PRAYER_LABELS, type PrayerKey } from "@/lib/prayer-times";

const NOTIFY_KEY = "faiz.notify";
const ALERT_PRAYERS: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const REMINDER_MS = 15 * 60_000;

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

function isPreviewHost() {
  const h = window.location.hostname;
  return (
    window.self !== window.top ||
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h.endsWith("lovableproject.com") ||
    h.endsWith("lovableproject-dev.com")
  );
}

async function getWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator) || isPreviewHost() || !import.meta.env.PROD) return null;
  try {
    return await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}notify-sw.js`);
  } catch {
    return null;
  }
}

async function showAlert(title: string, body: string, tag: string) {
  const icon = `${import.meta.env.BASE_URL}icon-192.png`;
  const reg = await getWorker();
  if (reg) return reg.showNotification(title, { body, tag, icon, badge: icon });
  try { new Notification(title, { body, tag, icon }); } catch { /* Unsupported here. */ }
}

/** Install banner + prayer notifications (at each prayer and 15 minutes before). */
export function AppExtras() {
  const { location, settings } = useLocationSettings();
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);
  const [hideBanner, setHideBanner] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [notify, setNotify] = useState(false);
  const sent = useRef(new Set<string>());

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios && !standalone) setIosHint(true);
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvt(e as InstallEvent); };
    const onInstalled = () => setInstallEvt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    try { setNotify(localStorage.getItem(NOTIFY_KEY) === "on" && Notification.permission === "granted"); } catch { /* ignore */ }
    void getWorker();
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!notify) return;
    const point = { latitude: location.latitude, longitude: location.longitude, elevation: location.elevation };
    const check = () => {
      const now = Date.now();
      const times = computePrayerTimes(new Date(), point, settings).times;
      for (const key of ALERT_PRAYERS) {
        const at = times[key].getTime();
        const day = times[key].toDateString();
        const label = PRAYER_LABELS[key];
        const clock = times[key].toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const before = `${day}-${key}-pre`;
        if (now >= at - REMINDER_MS && now < at - REMINDER_MS + 120_000 && !sent.current.has(before)) {
          sent.current.add(before);
          void showAlert(`${label} in 15 minutes`, `${label} begins at ${clock} in ${location.name}.`, before);
        }
        const on = `${day}-${key}-on`;
        if (now >= at && now < at + 120_000 && !sent.current.has(on)) {
          sent.current.add(on);
          void showAlert(`It's time for ${label}`, `${label} has begun (${clock}) in ${location.name}.`, on);
        }
      }
    };
    check();
    const id = setInterval(check, 20_000);
    return () => clearInterval(id);
  }, [notify, location, settings]);

  const toggleNotify = async () => {
    if (notify) {
      setNotify(false);
      try { localStorage.setItem(NOTIFY_KEY, "off"); } catch { /* ignore */ }
      return;
    }
    if (!("Notification" in window)) {
      alert("This browser cannot show notifications. Install the app first, then try again.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    setNotify(true);
    try { localStorage.setItem(NOTIFY_KEY, "on"); } catch { /* ignore */ }
    void showAlert("Prayer alerts are on", "You'll be notified 15 minutes before and at each prayer.", "faiz-welcome");
  };

  const install = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    setInstallEvt(null);
  };

  const showBanner = !hideBanner && (installEvt || iosHint);

  return (
    <>
      <Button variant="ghost" size="icon" onClick={toggleNotify}
        aria-label={notify ? "Turn off prayer alerts" : "Turn on prayer alerts"}
        title={notify ? "Prayer alerts on" : "Turn on prayer alerts"}
        className={`shrink-0 border border-border hover:bg-mist ${notify ? "text-brand" : "text-deep"}`}>
        {notify ? <Bell /> : <BellOff />}
      </Button>
      {showBanner && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center gap-3 bg-brand px-4 py-2.5 text-primary-foreground shadow-lg">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width={32} height={32} className="rounded-lg" />
          <p className="flex-1 text-sm">
            {installEvt ? "Install Faiz as an app on your phone or computer." : "To install: tap Share, then “Add to Home Screen”."}
          </p>
          {installEvt && (
            <Button size="sm" variant="secondary" onClick={install}>
              <Download /> Install
            </Button>
          )}
          <button onClick={() => setHideBanner(true)} aria-label="Close" className="p-1 opacity-80 hover:opacity-100">
            <X className="size-4" />
          </button>
        </div>
      )}
    </>
  );
}
