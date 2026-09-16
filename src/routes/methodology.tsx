import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology — How Faiz Computes Prayer Times" },
      {
        name: "description",
        content:
          "The full reckoning behind Faiz: 20° true dawn for Fajr, 18° for Isha, the one-degree solar disc correction for Maghrib, horizon dip for elevation and Shafiʿī Asr.",
      },
      { property: "og:title", content: "Methodology — How Faiz Computes Prayer Times" },
      {
        property: "og:description",
        content:
          "Every angle and correction used to compute the azan times, explained step by step.",
      },
    ],
  }),
  component: Methodology,
});

function Methodology() {
  return (
    <main className="max-w-3xl mx-auto px-6 pb-20 pt-6">
      <p className="text-xs uppercase tracking-[0.18em] text-brand/70 font-semibold">
        The reckoning
      </p>
      <h1 className="mt-2 text-4xl font-semibold text-deep leading-tight">
        How each azan time is derived
      </h1>
      <p className="mt-4 text-deep/60 leading-relaxed">
        A prayer is only valid once its time has genuinely entered and the worshipper is certain of
        it. Faiz therefore computes from the solar position at your exact coordinates and
        elevation, and never rounds a time earlier than the sky allows.
      </p>

      <div className="mt-8 space-y-5">
        <Card title="Maghrib · the whole disc must set">
          Astronomical sunset places the centre of the sun on the astronomical horizon. What the
          law requires is the complete disappearance of the disc below the visible horizon. That
          adds 44 arc-minutes of refraction plus the sun's 16 arc-minute radius — one full degree,
          which the earth turns through in about four minutes. Faiz uses the 1° depression, plus
          the extra horizon dip your elevation creates, so Maghrib is never called early.
        </Card>
        <Card title="Fajr · true dawn at 20°">
          The white light of the true dawn (al-fajr al-ṣādiq) appears when the sun is 20° below the
          astronomical horizon, i.e. 19° relative to the visible horizon. The 18° figure used by
          some modern calendars belongs to the red twilight, not the white — the two cannot share
          one angle.
        </Card>
        <Card title="Isha · the red twilight is gone at 18°">
          Isha enters when the deep red in the sky disappears: 18° below the astronomical horizon
          (17° from the visible one). A further degree removes the yellow, and another the white.
        </Card>
        <Card title="Asr · the Shafiʿī shadow">
          Asr begins when an object's shadow equals the object itself plus the shadow it cast at
          the meridian. You can switch to the Hanafī twofold shadow in the settings.
        </Card>
        <Card title="Dhuhr · one minute past zawāl">
          The sun must visibly decline from the meridian, so Faiz adds a minute to the computed
          solar transit rather than calling the instant of transit itself.
        </Card>
        <Card title="Elevation and the visible horizon">
          Standing higher lowers the visible horizon by roughly 0.0347·√h degrees, where h is your
          height in metres. Sunset is later on a hill than in the valley beneath it — the same
          reason the upper floors of a tall tower break their fast after the ground floor. Faiz
          reads your elevation automatically and applies this dip.
        </Card>
        <Card title="Sunrise">
          Sunrise is not a prayer start but the astronomical event that ends the time of Fajr, so
          it is shown exactly as the sun's upper limb reaches the horizon — the same value
          published azan timetables give, with nothing added or subtracted.
        </Card>
      </div>

      <p className="mt-8 text-xs text-deep/50 leading-relaxed">
        Faiz computes locally in your browser using standard solar-position astronomy; no time is
        copied from a third-party table. Where your mosque follows a published local timetable,
        follow your mosque.
      </p>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="glass-panel rounded-3xl p-6">
      <h2 className="text-lg font-semibold text-deep">{title}</h2>
      <p className="mt-2 text-sm text-deep/60 leading-relaxed">{children}</p>
    </article>
  );
}
