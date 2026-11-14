// Design-Tokens aus Figma (Datei „KiezCoins“, Variablen-Sammlungen und Text Styles).
// Die Namen folgen den Figma-Variablen: `color/bg/screen` → `color.bg.screen`.
// Nach Änderungen in Figma hier abgleichen (siehe README, Abschnitt „Figma abgleichen“).

import type { TextStyle } from 'react-native';

/** Dunkel: für BlurView, Systemglas und Statusleiste. Den hellen Look „Fashionable“ gibt es seit 2026-11-13 nicht mehr. */
export const scheme: 'dark' | 'light' = 'dark';

// Primitives
// Kiez-Look „Warm und tief“ (Daria, 2026-11-01): fast schwarzer Grund und Flächen mit warmem Unterton,
// helle Schrift leicht warm, Nebenschrift mit mehr Kontrast. Vorher #1F2123, #F0F0F0, #A0A0A0, #2B2D31.
// Dark-UI-Überarbeitung (Daria, 2026-11-05): Lila #8F90FA statt #7E94FF (weniger gesättigt, wärmer, gleiche Helligkeit),
// Grund #232326 (Daria, 2026-11-05, neutral statt warm, vorher #191716), Karten #303034 eine Stufe heller, damit sie sich ohne Rand abheben.
// Zweite Akzentfarbe Grün #89F269 statt #93F4A7.
const kiezPalette = {
  /** Grund: Grau mit leichtem Aubergine-Ton, passend zur Routine-Karte (Daria, 2026-11-12), vorher neutral #232326 */
  black: '#252025',
  // Schrift in einem Ton (Daria, 2026-11-11): Puder, Farbton 342°. Haupt- und Nebenschrift unterscheiden sich nur
  // in Helligkeit und Sättigung, nicht im Farbton.
  /** Hauptschrift: helles Puder, H 342° S 60 % L 96 % (Daria, 2026-11-11). Vorher Creme #FFF8ED, davor #F3EEE8 */
  white: '#FBEFF2',
  /** Nebenschrift: Puder, runtergeregelt, H 342° S 27 % L 83 % (Daria, 2026-11-11), auch für den gedämpften Teil großer Überschriften. Vorher #A7A39D, davor #B9B1A9 */
  grey: '#E0C9D0',
  purple: '#8F90FA',
  orange: '#FFAD7E',
  /** Zweite Akzentfarbe (Daria, 2026-11-05), vorher #93F4A7. Auch die Herzen in den Augen des Katers. */
  green: '#89F269',
  red: '#FF7E8B',
  pink: '#FFB2E5',
  graphite: '#303034',
};

export const palette = Object.freeze(kiezPalette);

/**
 * Weitere Grundfarben des Kiez-Looks (Daria, 2026-11-13). Hier steht jede Farbe genau einmal als Wert. Komponenten
 * nutzen sie nie direkt, sondern über eine semantische Rolle in `color` unten. Teilen sich zwei Rollen eine Farbe
 * (z. B. Fokus und Menü-Icon), zeigen beide auf dieselbe Grundfarbe und lassen sich später einzeln umstellen.
 */
const swatch = {
  /** Senf: Me & Myself, Kalender, Aufgaben-Karten, „Du bist dran“ */
  senf: '#ECCF55',
  /** Gelbgrün: Fokus, eingeschaltete Schalter, Menü-Icon. Runtergeregelt (Daria, 2026-11-14), vorher #E4FF5F, das der Kater-Avatar behält */
  gelbgruen: '#D6EB70',
  /** Beige: große Icons, Leisten-Icons, papierweißer Knopf im Umschalter */
  beige: '#EEE0C9',
  /** Schneeweiß: aktives Nachrichten-Icon */
  schnee: '#FFFAF3',
  /** Olive hell: feste Termine in der Routine */
  olive: '#C6D195',
  /** Puder: vorgemerkte Termine in der Routine */
  puder: '#E6D6C0',
  /** Tinte auf hellen Karten */
  tinte: '#1A1A1A',
  /** Aus-Zustand der An/Aus-Schalter */
  schalterAus: '#45466F',
} as const;

/** Farbe „#RRGGBB“ mit Deckkraft `a` (0 … 1) als rgba */
export function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Theme (semantische Farben, nur diese in Komponenten verwenden)
export const color = {
  bg: {
    screen: palette.black,
    surface: palette.graphite,
    /** Halbtransparente Fläche über Fotos (Bounty-Chip, Info-Leiste, Tab-Leiste) */
    glass: 'rgba(35, 35, 38, 0.86)',
    /** Leichte Glasfläche, z. B. das eingeklappte Blatt im Challenge-Detail */
    sheet: 'rgba(35, 35, 38, 0.45)',
    /** Overlays (Hinweise, Dialoge, Umfrage): Blur mit leichtem Stich aus Dunkel-Lila (Daria, 2026-11-02) */
    frost: 'rgba(44, 26, 70, 0.5)',
    /** Abgedunkelter, unscharfer Grund hinter Dialogen */
    scrim: 'rgba(30, 16, 50, 0.3)',
    /** Zahnrad-Menü (Daria, 2026-11-06): Kartenfarbe #303034 halbdurchsichtig über Blur, der Text dahinter verschwimmt */
    menu: 'rgba(48, 48, 52, 0.78)',
    /** Dunkle Glasfläche über Fotos, in beiden Looks dunkel */
    onPhoto: 'rgba(35, 35, 38, 0.3)',
  },
  /** Haarlinie auf dunklem Grund */
  line: {
    hairline: 'rgba(255, 240, 225, 0.12)',
    /** Feiner warmer Rand um Karten und Sprechblase im Kiez-Look, damit sie sich vom Grund abheben (2026-11-01) */
    raised: 'rgba(255, 240, 225, 0.08)',
    /** Feine Linie in der zweiten Akzentfarbe (#89F269), z. B. auf der Karte in „Meine Posts“ (Daria, 2026-11-05) */
    confirmation: 'rgba(137, 242, 105, 0.22)',
  },
  text: {
    primary: palette.white,
    secondary: palette.grey,
    /** Platzhalter in Eingabefeldern: deutlich blasser als eingegebener Text, damit ein Beispiel nicht wie ein Wert aussieht (Daria, 2026-11-13) */
    placeholder: 'rgba(224, 201, 208, 0.45)',
    /** Schrift auf der Akzentfläche (Primary-Button, eigene Chatblase) */
    onAccent: palette.black,
    /** Schrift auf Fotos, in beiden Looks hell. Im Kiez-Look helles Puder wie die Hauptschrift, kein Grau (Daria, 2026-11-11), vorher #F0F0F0 */
    onPhoto: kiezPalette.white,
    /** @-Namen in Beiträgen und Kommentaren: im Kiez-Look Grün (Daria, 2026-11-09), im Fashionable Look Pink wie bisher */
    mention: palette.green,
  },
  /** Große Icons (Daria, 2026-11-05): etwas gedämpfter als die Schrift, damit Symbole nicht heller als Text wirken */
  icon: {
    large: swatch.beige,
  },
  /**
   * Untere Leiste im Kiez-Look (Daria, 2026-11-12): Aubergine statt Grau, Icons in Beige statt Puder. Die aktive Seite
   * sitzt auf einer grauen Blase, ihr Icon hat je Seite eine eigene Farbe: Kalender Senf, Feed Rosa, Nachrichten
   * Schneeweiß, Menü Gelbgrün. Die Kamera bleibt die lila Pille, außer in der Routine (dort klein und schlicht).
   */
  nav: {
    bar: 'rgba(59, 47, 60, 0.94)',
    icon: swatch.beige,
    bubble: palette.graphite,
    /** Kalender = Me & Myself, dieselbe Grundfarbe wie accent.private */
    calendar: swatch.senf,
    /** Feed = Herz, dieselbe Grundfarbe wie accent.affection (Daria, 2026-11-13: zwei Rollen, ein Ziel) */
    feed: palette.pink,
    chat: swatch.schnee,
    /** Menü = Einstellungen. Dieselbe Grundfarbe wie accent.focus, eigene Rolle (Daria, 2026-11-13) */
    menu: swatch.gelbgruen,
    create: palette.purple,
    onCreate: palette.black,
  },
  /** Signaturfarbe für Logo und Kater. Fashionable Look vorerst Schwarz: Das Violett #7B2FF7 hat Daria verworfen (23.10.2026), die neue Farbe steht noch aus. */
  brand: {
    signature: palette.purple,
  },
  accent: {
    primary: palette.purple,
    affection: palette.pink,
    /** „Privat“ gewählt, in jedem Umschalter: Senf wie der Kalender in der Leiste (Daria, 2026-11-12) */
    private: swatch.senf,
    /**
     * „Du bist dran“ (Daria, 2026-11-13): Gelb wie Me & Myself statt Orange. Orange bleibt Fehlern und Warnungen.
     * Im Fashionable Look wie bisher die Signalfarbe.
     */
    turn: swatch.senf,
    confirmation: palette.green,
    /** Fokus (Rahmen und Cursor im aktiven Feld) und eingeschaltete Schalter: Gelbgrün, überall gleich (Daria, 2026-11-13) */
    focus: swatch.gelbgruen,
    signal: palette.orange,
    /**
     * Fehler und Pflichtfeld-Hinweise: im Kiez-Look Orange wie die Signalfarbe (Daria, 2026-11-12). Das alte Korallrot
     * #FF7E8B lag zu nah am Herz-Rosa #FFB2E5. Fashionable bleibt Rot.
     */
    error: palette.orange,
  },
  /** Routine-Karten (Daria, 2026-11-12): eigene Kartenfarben, Lila und Gelbgrün bleiben der Bedienung vorbehalten */
  routine: {
    task: swatch.senf,
    fixed: swatch.olive,
    saved: swatch.puder,
    ink: swatch.tinte,
    inkSoft: withAlpha(swatch.tinte, 0.68),
    inkTrack: withAlpha(swatch.tinte, 0.16),
    /** Kalendertage ohne Eintrag und die Schraffur ausgefallener Tage */
    day: withAlpha(kiezPalette.white, 0.08),
    hatch: withAlpha(kiezPalette.white, 0.16),
  },
  /** An/Aus-Schalter im Kiez-Look */
  toggle: {
    off: swatch.schalterAus,
  },
  /** Abdunklung über Fotos, damit helle Schrift darauf lesbar bleibt (Grundfarbe des Kiez-Looks, verschieden stark) */
  overlay: {
    light: withAlpha(kiezPalette.black, 0.25),
    soft: withAlpha(kiezPalette.black, 0.3),
    medium: withAlpha(kiezPalette.black, 0.35),
    strong: withAlpha(kiezPalette.black, 0.6),
    heavy: withAlpha(kiezPalette.black, 0.72),
  },
} as const;

// Spacing
export const space = {
  0: 0,
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  48: 48,
} as const;

export const radius = {
  // Flacher (Daria, 2026-11-13): Post 6, Eingabe 8, Karten wie die To-dos 10, große Flächen höchstens 16.
  // Pillen und Kreise bleiben rund (`full`). Vorher sm 5, md 12, lg 18, xl 20, card 28, sheet 32.
  /** Eingabefelder, Suchfeld, kleine Flächen wie Vorschaubilder */
  sm: 8,
  /** Karten, Kacheln, Zeilen, Menüs, Fotos in Listen; Maß sind die To-dos */
  md: 10,
  /** Etwas größere Kästen, z. B. Hinweise und Vorschauen */
  lg: 12,
  /** Große Flächen: Dialoge, Blätter von unten, Sprechblasen */
  xl: 16,
  /** Posts im Feed und Karten im Schaufenster: kleine Rundung wie die Blätter der Text-Posts (Daria, 2026-11-07) */
  post: 6,
  full: 999,
} as const;

// Size (Safe Areas und Bildschirmgröße kommen im Code aus useSafeAreaInsets)
export const size = {
  touchTarget: 44,
  avatar: 36,
  thumbnail: 60,
  /** Icons in Aktions- und Tab-Leisten (Figma-Icons verkleinert) */
  icon: 20,
} as const;

// Stroke
export const stroke = {
  ultraThin: 0.5,
  thin: 1,
  /** Rand um ein aktives Eingabefeld (Daria, 27.10.2026) */
  focus: 2,
  ring: 3,
} as const;

// Schriften (Inter, Karla, Inter Tight, Unbounded, geladen in src/app/_layout.tsx)
// Kiez-Look: Karla statt Inter für Fließtext und Oberfläche (Daria, 2026-11-11), Fließtext in Light.
// Die Inter wirkte leblos und technisch. Den engeren Buchstabenabstand der Karla setzt `Text` (components/T.tsx).
export const font = {
  light: 'Karla_300Light',
  /** Fließtext: Kiez-Look Karla Light (Daria, 2026-11-11), Fashionable Inter Light */
  text: 'Karla_300Light',
  regular: 'Karla_400Regular',
  medium: 'Karla_500Medium',
  semiBold: 'Karla_600SemiBold',
  /** Inter Tight für große Überschriften und Zahlen */
  display: 'InterTight_600SemiBold',
  /** Text über dem Foto: breite Unbounded als Kontrast zur Inter der Oberfläche (Daria, 2026-11-07) */
  onPhoto: 'Unbounded_500Medium',
  onPhotoLight: 'Unbounded_300Light',
} as const;

// Text Styles
export const text = {
  /**
   * Große Überschrift, z. B. „Chats“, „Was Du so machst“. Im Kiez-Look in der Unbounded wie die Begrüßung im Feed
   * (Daria, 2026-11-10), 26 statt 30, da sie breiter läuft.
   */
  display: { fontFamily: font.onPhoto, fontSize: 26, lineHeight: 32, letterSpacing: 0 },
  /** Titel im Challenge-Detail */
  headline: { fontFamily: font.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.5 },
  /** Titel auf Karten */
  cardTitle: { fontFamily: font.display, fontSize: 19, lineHeight: 23, letterSpacing: -0.2 },
  /** Kennzahlen (Bounty, Frist, Bilanz) */
  metric: { fontFamily: font.display, fontSize: 22, lineHeight: 26 },
  /** Kleine Kennzahlen, z. B. Edensteine in Listen, Karten und Posts (Daria 2026-11-10) */
  metricSm: { fontFamily: font.display, fontSize: 18, lineHeight: 22 },
  title: { fontFamily: font.regular, fontSize: 19, lineHeight: 23 },
  /** Abschnittsüberschrift auf Einstellungsseiten aus mehreren Abschnitten, z. B. Funktionen (Daria, 2026-11-10) */
  settingsHeading: { fontFamily: font.semiBold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: font.text, fontSize: 15, lineHeight: 19 },
  /** Fließtext halbfett, z. B. Name im Post, Text auf kleinen Buttons */
  bodyStrong: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 19 },
  /** Größerer Fließtext, z. B. Menüeinträge, Zähler unter Posts */
  bodyLarge: { fontFamily: font.regular, fontSize: 16, lineHeight: 20 },
  /** Hinweise und Fehlermeldungen unter Formularfeldern, in beiden Looks Light (Daria, 2026-11-09) */
  hint: { fontFamily: font.light, fontSize: 15, lineHeight: 19 },
  /** Name im Chat und kleine Titel in Sprechblasen */
  cardTitleCompact: { fontFamily: font.display, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  /** Zeile unter Posts, Gruppen und Kennzahl-Beschriftungen (13 px, Daria 2026-11-10) */
  meta: { fontFamily: font.regular, fontSize: 14, lineHeight: 17 },
  /** Kleine Zusatzzeile (12 px), z. B. Ort, Untertitel, Abzeichen-Name */
  small: { fontFamily: font.regular, fontSize: 13, lineHeight: 16 },
  caption: { fontFamily: font.regular, fontSize: 12, lineHeight: 15 },
  labelXs: { fontFamily: font.text, fontSize: 9, lineHeight: 11 },
  // Ab hier: Rollen aus „Typografie sauber binden“ (Daria, 2026-11-13). Jeder Text nimmt eine Rolle.
  // Im Code danach nur noch Farbe, Ausrichtung und Hervorhebung über font.* (fett im Fließtext, ausgewählt).
  /** Beschriftung halbfett-leicht, z. B. Zustand auf Karten, Zähler, Links in Listen */
  label: { fontFamily: font.medium, fontSize: 15, lineHeight: 20 },
  /** Kleine Beschriftung, z. B. Zeile unter Erinnerungen, gewählter Reiter im Umschalter, Pillen */
  labelSm: { fontFamily: font.medium, fontSize: 14, lineHeight: 18 },
  /** Kleiner Fließtext, z. B. Untertitel, Reiter im Umschalter, Bildunterschrift */
  bodySm: { fontFamily: font.regular, fontSize: 14, lineHeight: 18 },
  /** Kleine Überzeile und Chips, z. B. „Termin“, „Aufgabe“ */
  captionStrong: { fontFamily: font.medium, fontSize: 12, lineHeight: 15 },
  /** Kleinste Marke: Zähler in Abzeichen, Tags, Schrittnummern */
  tag: { fontFamily: font.semiBold, fontSize: 11, lineHeight: 15 },
  /** Lesetext mit mehr Zeilenabstand, z. B. Beschreibungen, Sprechblasen */
  reading: { fontFamily: font.text, fontSize: 15, lineHeight: 22 },
  /** Größerer Lesetext, z. B. Tour, Willkommen, Kater */
  readingLarge: { fontFamily: font.text, fontSize: 16, lineHeight: 22 },
  /** Großer Name in der Leiste, z. B. Gruppe oben */
  titleLarge: { fontFamily: font.regular, fontSize: 22, lineHeight: 28 },
  /** Titel auf Erinnerungskarten */
  listTitle: { fontFamily: font.medium, fontSize: 20, lineHeight: 24, letterSpacing: -0.2 },
  /** Kleine Überschrift in der Unbounded, z. B. Abschnitte im Inhalt, Kater-Nachricht */
  displaySm: { fontFamily: font.onPhoto, fontSize: 18, lineHeight: 24 },
  /** Sehr große Überschrift, z. B. Willkommen */
  displayLarge: { fontFamily: font.onPhoto, fontSize: 32, lineHeight: 40, letterSpacing: -0.4 },
  /** Sehr großer Titel in Inter Tight, z. B. Abzeichen-Karte */
  headlineLarge: { fontFamily: font.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  /** Sehr große Zahl, z. B. Vorher-Nachher-Zähler */
  metricHero: { fontFamily: font.display, fontSize: 44, lineHeight: 48, letterSpacing: -1 },
  /** Kleinste Kennzahl, z. B. erledigt, kleine Bounty */
  metricXs: { fontFamily: font.display, fontSize: 15, lineHeight: 19 },
  /** Auf dem Foto: Titel */
  photoTitle: { fontFamily: font.onPhoto, fontSize: 16, lineHeight: 21 },
  /** Auf dem Foto: Name, Tag, Überzeile */
  photoLabel: { fontFamily: font.onPhoto, fontSize: 15, lineHeight: 20 },
  /** Auf dem Foto: Ort */
  photoMeta: { fontFamily: font.onPhotoLight, fontSize: 14, lineHeight: 20 },
  /** Auf dem Foto: kleine Zusatzzeile */
  photoMetaSm: { fontFamily: font.onPhotoLight, fontSize: 11, lineHeight: 16 },
  /** Text, den man selbst aufs Foto legt */
  photoText: { fontFamily: font.semiBold, fontSize: 18, lineHeight: 22 },
  photoTextHero: { fontFamily: font.semiBold, fontSize: 24, lineHeight: 29 },
  /** `text/button/dark-on-light`: dunkle Schrift auf heller Fläche (Primary) */
  buttonDarkOnLight: { fontFamily: font.medium, fontSize: 17, lineHeight: 20 },
  /** `text/button/light-on-dark`: helle Schrift auf dunkler Fläche (Secondary) */
  buttonLightOnDark: { fontFamily: font.regular, fontSize: 17, lineHeight: 20 },
} satisfies Record<string, TextStyle>;

// Bewegung „Schranke“: holt am Anfang langsam und leicht federnd aus, kippt dann zügig und schwingt kurz nach.
// Wie eine locker baumelnde Schranke. Werte unter 0 und über 1 sind gewollt (Ausholen und Nachschwingen).
export const motion = {
  barrier: { duration: 560, bezier: [0.55, -0.3, 0.3, 1.3] as const },
  /** Feder für Dinge, die man mit dem Finger zieht und loslässt */
  barrierSpring: { friction: 5, tension: 70 },
  /** Reiterwechsel: etwas langsamer und schwerer, damit er sich greifbar anfühlt.
   *  exit: so lange gleitet der alte Reiter ganz hinaus, bevor der neue von der Seite hereinkommt. */
  tabSwitch: { duration: 620, offset: 72, exit: 180, spring: { friction: 6, tension: 38 } },
} as const;
