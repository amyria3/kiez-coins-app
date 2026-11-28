// Vorschaubild der Digitalen Visitenkarte, 1200 × 630 (Daria, 2026-11-23: „Der geteilte Link wirkt ein wenig erbärmlich“).
// Messenger wie Telegram oder WhatsApp zeigen es unter kiezcoins.de/s/<kurzname>/visitenkarte, die App zeigt es als
// Vorschau unter „Connect“. Gleicher Aufbau wie die Karte auf der Seite (_visitenkarte.mjs): Avatar, Name, Ort,
// Services als Pillen auf Gelbgrün. Gezeichnet mit @vercel/og (Satori), Elemente als einfache Objekte statt JSX.

import { readFileSync } from "node:fs";

import { ortZeile, serviceListe } from "./_visitenkarte.mjs";

// Bildmarke für die Fußzeile (Daria, 2026-11-24: „KiezCoins <Katze Icon> Digitale …“, rechtsbündig), mit dickem Ring:
// Der gelbgrüne Kreis der einfachen Bildmarke verschwände auf dem gelbgrünen Bild. Die Datei kommt über
// import.meta.url mit in die Vercel-Funktion. Fehlt sie, bleibt die Fußzeile ohne Kater.
let bildmarke = null;
try {
  bildmarke = `data:image/svg+xml,${encodeURIComponent(readFileSync(new URL("../assets/marke/bildmarke-ring-dick.svg", import.meta.url), "utf8"))}`;
} catch {
  bildmarke = null;
}

export const BILD_B = 1200;
export const BILD_H = 630;

const TINTE = "#000027";
const GRUEN = "#F0FFA6";

const el = (type, style, ...children) => ({
  type,
  props: {
    style: { display: "flex", ...style },
    children: children.flat().filter((c) => c != null && c !== false),
  },
});

// Lange Namen kleiner, damit sie in höchstens zwei Zeilen passen
const namensGroesse = (name) =>
  name.length > 36 ? 50 : name.length > 22 ? 64 : 84;

/** Elementbaum für ImageResponse. `logo` ist eine öffentliche Bild-URL (jpg/png) oder null, `kater` ein Daten-URL-SVG */
export function bildBaum(s, { logo, kater }) {
  const ort = ortZeile(s);
  const services = serviceListe(s.services).slice(0, 6);
  const avatar = logo
    ? {
        type: "img",
        props: {
          src: logo,
          width: 168,
          height: 168,
          style: {
            width: 168,
            height: 168,
            borderRadius: 84,
            border: `4px solid ${TINTE}`,
            objectFit: "cover",
          },
        },
      }
    : el(
        "div",
        {
          width: 168,
          height: 168,
          borderRadius: 84,
          background: "#000",
          border: `4px solid ${TINTE}`,
          alignItems: "center",
          justifyContent: "center",
        },
        { type: "img", props: { src: kater, width: 84, height: 92 } },
      );
  return el(
    "div",
    {
      width: BILD_B,
      height: BILD_H,
      background: GRUEN,
      color: TINTE,
      flexDirection: "column",
      padding: "64px 72px",
      fontFamily: "Karla",
    },
    el(
      "div",
      { alignItems: "center", gap: 36 },
      avatar,
      el(
        "div",
        { flexDirection: "column", flex: 1 },
        el(
          "div",
          {
            fontFamily: "Unbounded",
            fontSize: namensGroesse(s.name),
            lineHeight: 1.08,
          },
          s.name,
        ),
        ort ? el("div", { fontSize: 36, marginTop: 6 }, ort) : null,
      ),
    ),
    services.length
      ? el(
          "div",
          { flexWrap: "wrap", gap: 14, marginTop: 48 },
          services.map((x) =>
            el(
              "div",
              {
                border: `3px solid ${TINTE}`,
                borderRadius: 999,
                padding: "8px 22px",
                fontSize: 30,
                fontFamily: "KarlaMedium",
              },
              x.length > 40 ? x.slice(0, 39) + "…" : x,
            ),
          ),
        )
      : null,
    el("div", { flex: 1 }),
    el(
      "div",
      { justifyContent: "flex-end", alignItems: "center", gap: 14, fontSize: 26 },
      el("div", { fontFamily: "Unbounded", fontSize: 26 }, "KiezCoins"),
      bildmarke ? { type: "img", props: { src: bildmarke, width: 44, height: 44, style: { width: 44, height: 44 } } } : null,
      el("div", {}, "Digitale Visitenkarte"),
    ),
  );
}

/** Text der Linkvorschau: Services und Ort, z. B. „UX/UI-Design, Webdesign … in Lindenau, Leipzig“ */
export function bildText(s) {
  const services = serviceListe(s.services);
  const ort = ortZeile(s);
  const teil =
    services.slice(0, 3).join(", ") + (services.length > 3 ? " …" : "");
  const satz = [teil, ort ? `${teil ? "in " : ""}${ort}` : ""]
    .filter(Boolean)
    .join(" ");
  return satz || `Digitale Visitenkarte von ${s.name} auf KiezCoins`;
}
