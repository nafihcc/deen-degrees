# Deen Degrees

A precise, beautifully crafted Islamic companion web app that computes prayer times using the traditional Shafiʿī reckoning described in classical texts — not the shortened modern conventions.

## Features

- **Prayer times** — Enter any location and get Fajr, Sunrise, Dhuhr, Asr, Maghrib and Isha, computed from the sun's exact degrees for that spot:
  - **Fajr** at 20° below the horizon (true dawn — fajr ṣādiq)
  - **Sunrise** at the standard astronomical horizon (0.833° refraction), matching published azan timetables anywhere in the world
  - **Dhuhr** at solar transit (zawāl)
  - **Asr** with the Standard (Shafiʿī) shadow rule or the Hanafi rule — your choice
  - **Maghrib** when the entire solar disc has sunk below the visible horizon
  - **Isha** at 18° below the horizon
- **Method settings** — Adjust the Fajr/Isha angles and pick the Standard or Hanafi Asr; everything else follows the traditional reckoning.
- **Monthly prayer calendar** — A full month timetable for your location.
- **Quran reader** — The complete Mushaf in Arabic, in both page view (604 pages) and ayah-by-ayah view, with audio recitation.
- **Qibla finder** — Multiple compass styles, including an augmented-reality compass.
- **Dhikr counter** — A tally counter for your daily adhkār.

## Tech stack

- TanStack Start (React 19, TypeScript)
- Tailwind CSS v4
- Astronomy-based prayer time engine (no third-party timetable APIs for the core calculations)

## Getting started

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev
```

Then open http://localhost:8080 in your browser.

## Built with

- TanStack Start
- React
- TypeScript
- Tailwind CSS

---

This is made by vibe coded.
