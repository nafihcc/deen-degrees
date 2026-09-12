/**
 * Prayer time engine following the traditional (Shafi'i / Sunni Kerala) method
 * described in the reference article:
 *
 *  - Maghrib  : the sun's disc must be fully below the VISIBLE horizon.
 *               Astronomical sunset (centre on the astronomical horizon) plus
 *               44' refraction + 16' solar semi-diameter = 1.0 degree,
 *               i.e. roughly +4 minutes after astronomical sunset. Elevation
 *               adds a further horizon dip.
 *  - Fajr     : true dawn (white light) = sun 20 degrees below the
 *               astronomical horizon (19 degrees relative to the visible one).
 *  - Isha     : disappearance of the red twilight = 18 degrees below the
 *               astronomical horizon.
 *  - Asr      : Shafi'i - shadow equals the object plus its noon shadow.
 *
 * All angles in degrees, all internal times in floating point hours.
 */

export type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

export interface GeoPoint {
  latitude: number;
  longitude: number;
  /** metres above sea level */
  elevation: number;
}

export interface MethodSettings {
  /** Sun depression below the astronomical horizon for true dawn. */
  fajrAngle: number;
  /** Sun depression below the astronomical horizon for the red twilight. */
  ishaAngle: number;
  /** Shafi'i = 1, Hanafi = 2. */
  asrShadowFactor: number;
  /** Extra degrees added past astronomical sunset (disc + refraction). */
  maghribDiscCorrection: number;
  /** Precaution minutes added to every prayer so the time is certainly in. */
  precautionMinutes: number;
  /** Per-prayer manual offsets in minutes. */
  adjustments: Record<PrayerKey, number>;
}

export const DEFAULT_SETTINGS: MethodSettings = {
  fajrAngle: 20,
  ishaAngle: 18,
  asrShadowFactor: 1,
  maghribDiscCorrection: 1,
  precautionMinutes: 1,
  adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
};

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

const sin = (d: number) => Math.sin(d * D2R);
const cos = (d: number) => Math.cos(d * D2R);
const tan = (d: number) => Math.tan(d * D2R);
const arcsin = (x: number) => Math.asin(x) * R2D;
const arccos = (x: number) => Math.acos(x) * R2D;
const arctan2 = (y: number, x: number) => Math.atan2(y, x) * R2D;
const arccot = (x: number) => Math.atan(1 / x) * R2D;

const fixAngle = (a: number) => ((a % 360) + 360) % 360;
const fixHour = (a: number) => ((a % 24) + 24) % 24;

function julianDate(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5
  );
}

function sunPosition(jd: number): { declination: number; equationOfTime: number } {
  const d = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * d);
  const q = fixAngle(280.459 + 0.98564736 * d);
  const l = fixAngle(q + 1.915 * sin(g) + 0.02 * sin(2 * g));
  const e = 23.439 - 0.00000036 * d;

  const ra = fixHour(arctan2(cos(e) * sin(l), cos(l)) / 15);
  const declination = arcsin(sin(e) * sin(l));
  const equationOfTime = q / 15 - ra;
  return { declination, equationOfTime };
}

/** Dip of the visible horizon in degrees for an observer `metres` above sea level. */
export function horizonDip(metres: number): number {
  if (!metres || metres <= 0) return 0;
  return 0.0347 * Math.sqrt(metres);
}

interface Solar {
  jd: number;
  latitude: number;
}

function midDay(ctx: Solar, t: number): number {
  const { equationOfTime } = sunPosition(ctx.jd + t);
  return fixHour(12 - equationOfTime);
}

/** Hours (UTC-ish, longitude corrected later) at which the sun is `angle` below the horizon. */
function sunAngleTime(ctx: Solar, angle: number, t: number, direction: "ccw" | "cw"): number {
  const { declination } = sunPosition(ctx.jd + t);
  const noon = midDay(ctx, t);
  const numerator = -sin(angle) - sin(declination) * sin(ctx.latitude);
  const denominator = cos(declination) * cos(ctx.latitude);
  const ratio = numerator / denominator;
  if (ratio > 1 || ratio < -1) return NaN;
  const hourAngle = arccos(ratio) / 15;
  return noon + (direction === "ccw" ? -hourAngle : hourAngle);
}

function asrAngle(ctx: Solar, factor: number, t: number): number {
  const { declination } = sunPosition(ctx.jd + t);
  return -arccot(factor + tan(Math.abs(ctx.latitude - declination)));
}

export interface PrayerTimesResult {
  /** Date objects in the browser's local timezone. */
  times: Record<PrayerKey, Date>;
  declination: number;
  equationOfTime: number;
  horizonDipDegrees: number;
  maghribAngle: number;
  timezoneOffsetMinutes: number;
}

/**
 * @param date        local calendar date to compute for
 * @param point       observer position
 * @param settings    method configuration
 * @param tzOffsetMin timezone offset in minutes EAST of UTC (e.g. IST = 330)
 */
export function computePrayerTimes(
  date: Date,
  point: GeoPoint,
  settings: MethodSettings = DEFAULT_SETTINGS,
  tzOffsetMin: number = -date.getTimezoneOffset(),
): PrayerTimesResult {
  const { latitude, longitude, elevation } = point;
  const jd =
    julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate()) -
    longitude / (15 * 24);
  const ctx: Solar = { jd, latitude };

  const dip = horizonDip(elevation);
  const sunriseAngle = 0.833 + dip;
  const maghribAngle = settings.maghribDiscCorrection + dip;

  // initial guesses in hours
  let fajr = 5 / 24;
  let sunrise = 6 / 24;
  let dhuhr = 12 / 24;
  let asr = 13 / 24;
  let maghrib = 18 / 24;
  let isha = 19 / 24;

  for (let i = 0; i < 3; i += 1) {
    fajr = sunAngleTime(ctx, settings.fajrAngle, fajr, "ccw") / 24;
    sunrise = sunAngleTime(ctx, sunriseAngle, sunrise, "ccw") / 24;
    dhuhr = midDay(ctx, dhuhr) / 24;
    asr = sunAngleTime(ctx, asrAngle(ctx, settings.asrShadowFactor, asr), asr, "cw") / 24;
    maghrib = sunAngleTime(ctx, maghribAngle, maghrib, "cw") / 24;
    isha = sunAngleTime(ctx, settings.ishaAngle, isha, "cw") / 24;
  }

  const tzHours = tzOffsetMin / 60;
  const toLocalHours = (h: number) => h * 24 + tzHours - longitude / 15;

  const raw: Record<PrayerKey, number> = {
    fajr: toLocalHours(fajr),
    sunrise: toLocalHours(sunrise),
    dhuhr: toLocalHours(dhuhr) + 1 / 60, // a minute past zawal
    asr: toLocalHours(asr),
    maghrib: toLocalHours(maghrib),
    isha: toLocalHours(isha),
  };

  const times = {} as Record<PrayerKey, Date>;
  (Object.keys(raw) as PrayerKey[]).forEach((key) => {
    const precaution = key === "sunrise" ? 0 : settings.precautionMinutes;
    const minutes = raw[key] * 60 + precaution + (settings.adjustments[key] ?? 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    times[key] = new Date(d.getTime() + Math.round(minutes * 60_000));
  });

  const { declination, equationOfTime } = sunPosition(jd + dhuhr);

  return {
    times,
    declination,
    equationOfTime,
    horizonDipDegrees: dip,
    maghribAngle,
    timezoneOffsetMinutes: tzOffsetMin,
  };
}

export const PRAYER_ORDER: PrayerKey[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

export const PRAYER_LABELS: Record<PrayerKey, string> = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export function prayerBasis(key: PrayerKey, s: MethodSettings): string {
  switch (key) {
    case "fajr":
      return `True dawn · sun ${s.fajrAngle}° below the astronomical horizon`;
    case "sunrise":
      return "Upper limb clears the visible horizon";
    case "dhuhr":
      return "One minute past solar transit (zawāl)";
    case "asr":
      return s.asrShadowFactor === 1
        ? "Shafiʿī · shadow = object + its noon shadow"
        : "Hanafī · shadow = 2× object + its noon shadow";
    case "maghrib":
      return "Whole solar disc below the visible horizon (≈ +4 min)";
    case "isha":
      return `Red twilight gone · sun ${s.ishaAngle}° below the horizon`;
  }
}

export function formatTime(date: Date, hour12 = false): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  });
}

export interface NextPrayerInfo {
  key: PrayerKey;
  at: Date;
  previousKey: PrayerKey;
  previousAt: Date;
  msRemaining: number;
  progress: number;
}

export function findNextPrayer(point: GeoPoint, settings: MethodSettings, now = new Date()): NextPrayerInfo {
  const today = computePrayerTimes(now, point, settings).times;
  const tomorrow = computePrayerTimes(
    new Date(now.getTime() + 86_400_000),
    point,
    settings,
  ).times;
  const yesterday = computePrayerTimes(
    new Date(now.getTime() - 86_400_000),
    point,
    settings,
  ).times;

  const sequence: Array<{ key: PrayerKey; at: Date }> = [];
  [yesterday, today, tomorrow].forEach((set) => {
    PRAYER_ORDER.forEach((key) => sequence.push({ key, at: set[key] }));
  });
  sequence.sort((a, b) => a.at.getTime() - b.at.getTime());

  const foundIdx = sequence.findIndex((item) => item.at.getTime() > now.getTime());
  const idx = foundIdx === -1 ? sequence.length - 1 : foundIdx;
  const next = sequence[idx]!;
  const prev = sequence[Math.max(idx - 1, 0)]!;
  const span = next.at.getTime() - prev.at.getTime();
  const done = now.getTime() - prev.at.getTime();

  return {
    key: next.key,
    at: next.at,
    previousKey: prev.key,
    previousAt: prev.at,
    msRemaining: next.at.getTime() - now.getTime(),
    progress: span > 0 ? Math.min(Math.max(done / span, 0), 1) : 0,
  };
}

export function formatCountdown(ms: number): string {
  const total = Math.max(Math.floor(ms / 1000), 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
