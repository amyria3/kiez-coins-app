// Design-Tokens aus Figma (Datei „Kiez Coins“, Variablen-Sammlungen und Text Styles).
// Die Namen folgen den Figma-Variablen: `color/bg/screen` → `color.bg.screen`.
// Nach Änderungen in Figma hier abgleichen (siehe README, Abschnitt „Figma abgleichen“).

import type { TextStyle } from 'react-native';

// Primitives
export const palette = {
  black: '#1F2123',
  white: '#F0F0F0',
  grey: '#A0A0A0',
  purple: '#7E94FF',
  orange: '#FFAD7E',
  green: '#93F4A7',
  red: '#FF7E8B',
  pink: '#FFB2E5',
  graphite: '#2B2D31',
} as const;

// Theme (semantische Farben, nur diese in Komponenten verwenden)
export const color = {
  bg: {
    screen: palette.black,
    surface: palette.graphite,
  },
  text: {
    primary: palette.white,
    secondary: palette.grey,
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

// Radius
export const radius = {
  sm: 5,
  md: 12,
  lg: 18,
  full: 999,
} as const;

// Size (Safe Areas und Bildschirmgröße kommen im Code aus useSafeAreaInsets)
export const size = {
  touchTarget: 44,
  avatar: 36,
  thumbnail: 60,
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
} as const;

// Text Styles
export const text = {
  title: { fontFamily: font.regular, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: font.light, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: font.regular, fontSize: 11, lineHeight: 16 },
  labelXs: { fontFamily: font.light, fontSize: 9, lineHeight: 11 },
  /** `text/button/dark-on-light`: dunkle Schrift auf heller Fläche (Primary) */
  buttonDarkOnLight: { fontFamily: font.medium, fontSize: 16, lineHeight: 20 },
  /** `text/button/light-on-dark`: helle Schrift auf dunkler Fläche (Secondary) */
  buttonLightOnDark: { fontFamily: font.regular, fontSize: 16, lineHeight: 20 },
} satisfies Record<string, TextStyle>;
