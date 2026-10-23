// Design-Tokens aus Figma (Datei „Kiez Coins“, Variablen-Sammlungen und Text Styles).
// Die Namen folgen den Figma-Variablen: `color/bg/screen` → `color.bg.screen`.
// Nach Änderungen in Figma hier abgleichen (siehe README, Abschnitt „Figma abgleichen“).

import type { TextStyle } from 'react-native';

import { look } from './look';

const instagram = look === 'instagram';

// Primitives
const kiezPalette = {
  black: '#1F2123',
  white: '#F0F0F0',
  grey: '#A0A0A0',
  purple: '#7E94FF',
  orange: '#FFAD7E',
  green: '#93F4A7',
  red: '#FF7E8B',
  pink: '#FFB2E5',
  graphite: '#2B2D31',
};

/** Look „Instagram“: Schwarz, Instagram-Blau, rotes Herz */
const instagramPalette: typeof kiezPalette = {
  black: '#000000',
  white: '#F5F5F5',
  grey: '#A8A8A8',
  purple: '#0095F6',
  orange: '#FFAD7E',
  green: '#93F4A7',
  red: '#ED4956',
  pink: '#FF3040',
  graphite: '#262626',
};

export const palette = Object.freeze(instagram ? instagramPalette : kiezPalette);

// Theme (semantische Farben, nur diese in Komponenten verwenden)
export const color = {
  bg: {
    screen: palette.black,
    surface: palette.graphite,
    /** Halbtransparente Fläche über Fotos (Bounty-Chip, Info-Leiste, Tab-Leiste) */
    glass: instagram ? 'rgba(0, 0, 0, 0.82)' : 'rgba(31, 33, 35, 0.82)',
  },
  /** Haarlinie auf dunklem Grund */
  line: {
    hairline: instagram ? 'rgba(245, 245, 245, 0.15)' : 'rgba(240, 240, 240, 0.12)',
  },
  text: {
    primary: palette.white,
    secondary: palette.grey,
    /** Schrift auf der Akzentfläche (Primary-Button, eigene Chatblase) */
    onAccent: instagram ? '#FFFFFF' : palette.black,
  },
  accent: {
    primary: palette.purple,
    affection: palette.pink,
    confirmation: palette.green,
    signal: palette.orange,
    error: palette.red,
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

// Radius (Look „Instagram“: eckiger)
export const radius = {
  sm: instagram ? 4 : 5,
  md: instagram ? 8 : 12,
  lg: instagram ? 10 : 18,
  xl: instagram ? 12 : 20,
  card: instagram ? 6 : 28,
  sheet: instagram ? 16 : 32,
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
  ring: 3,
} as const;

// Schriften (Inter, geladen in src/app/_layout.tsx)
export const font = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  /** Inter Tight für große Überschriften und Zahlen */
  display: 'InterTight_600SemiBold',
} as const;

// Text Styles
export const text = {
  /** Große Überschrift, z. B. Begrüßung im Feed, „Was Du so machst“ */
  display: { fontFamily: font.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  /** Titel im Challenge-Detail */
  headline: { fontFamily: font.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.5 },
  /** Titel auf Karten */
  cardTitle: { fontFamily: font.display, fontSize: 19, lineHeight: 23, letterSpacing: -0.2 },
  /** Kennzahlen (Bounty, Frist, Bilanz) */
  metric: { fontFamily: font.display, fontSize: 22, lineHeight: 26 },
  title: { fontFamily: font.regular, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: font.light, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: font.regular, fontSize: 11, lineHeight: 16 },
  labelXs: { fontFamily: font.light, fontSize: 9, lineHeight: 11 },
  /** `text/button/dark-on-light`: dunkle Schrift auf heller Fläche (Primary) */
  buttonDarkOnLight: { fontFamily: font.medium, fontSize: 16, lineHeight: 20 },
  /** `text/button/light-on-dark`: helle Schrift auf dunkler Fläche (Secondary) */
  buttonLightOnDark: { fontFamily: font.regular, fontSize: 16, lineHeight: 20 },
} satisfies Record<string, TextStyle>;

// Bewegung „Schranke“: holt am Anfang langsam und leicht federnd aus, kippt dann zügig und schwingt kurz nach.
// Wie eine locker baumelnde Schranke. Werte unter 0 und über 1 sind gewollt (Ausholen und Nachschwingen).
export const motion = {
  barrier: { duration: 560, bezier: [0.55, -0.3, 0.3, 1.3] as const },
  /** Feder für Dinge, die man mit dem Finger zieht und loslässt */
  barrierSpring: { friction: 5, tension: 70 },
  /** Reiterwechsel: etwas langsamer und schwerer, damit er sich greifbar anfühlt */
  tabSwitch: { duration: 620, offset: 72, spring: { friction: 6, tension: 38 } },
} as const;
