import { useFonts } from 'expo-font';
import { Barriecito_400Regular } from '@expo-google-fonts/barriecito/400Regular';
import { NothingYouCouldDo_400Regular } from '@expo-google-fonts/nothing-you-could-do/400Regular';
import { NotoSansMono_400Regular } from '@expo-google-fonts/noto-sans-mono/400Regular';
import { NotoSansMono_600SemiBold } from '@expo-google-fonts/noto-sans-mono/600SemiBold';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand/400Regular';
import { PlaywriteNZ_400Regular } from '@expo-google-fonts/playwrite-nz/400Regular';
import { Redaction35_400Regular } from '@expo-google-fonts/redaction-35/400Regular';
import { Rubik_400Regular } from '@expo-google-fonts/rubik/400Regular';
import { Rubik_600SemiBold } from '@expo-google-fonts/rubik/600SemiBold';

/**
 * Schriften für Posts nur mit Text (Auswahl von Daria, 07.11.2026). Gespeichert wird der Schlüssel
 * (Spalte `sheet_font`, Migration 20261107000100). `scale` gleicht aus, dass Schriften bei gleicher Größe
 * verschieden groß wirken, `leading` ist der Zeilenabstand als Vielfaches der Schriftgröße.
 */
export const SHEET_FONTS = [
  { key: 'inter', label: 'Standard', body: 'Inter_400Regular', title: 'InterTight_600SemiBold', scale: 1, leading: 1.42 },
  { key: 'redaction', label: 'Redaction', body: 'Redaction35_400Regular', title: 'Redaction35_400Regular', scale: 1.08, leading: 1.38 },
  { key: 'rubik', label: 'Rubik', body: 'Rubik_400Regular', title: 'Rubik_600SemiBold', scale: 1, leading: 1.42 },
  { key: 'barriecito', label: 'Barriecito', body: 'Barriecito_400Regular', title: 'Barriecito_400Regular', scale: 1.05, leading: 1.4 },
  { key: 'nothing', label: 'Nothing You Could Do', body: 'NothingYouCouldDo_400Regular', title: 'NothingYouCouldDo_400Regular', scale: 1, leading: 1.6 },
  { key: 'playwrite', label: 'Playwrite', body: 'PlaywriteNZ_400Regular', title: 'PlaywriteNZ_400Regular', scale: 0.86, leading: 1.75 },
  { key: 'patrick', label: 'Patrick Hand', body: 'PatrickHand_400Regular', title: 'PatrickHand_400Regular', scale: 1.15, leading: 1.32 },
  { key: 'mono', label: 'Mono', body: 'NotoSansMono_400Regular', title: 'NotoSansMono_600SemiBold', scale: 0.92, leading: 1.45 },
] as const;

export type SheetFont = (typeof SHEET_FONTS)[number]['key'];
export const DEFAULT_SHEET_FONT: SheetFont = 'inter';

export const sheetFont = (key?: string) => SHEET_FONTS.find((f) => f.key === key) ?? SHEET_FONTS[0];

/** Lädt die Schriften erst, wenn Blätter zu sehen sind. Inter ist schon beim Start geladen. */
export function useSheetFonts(): boolean {
  const [loaded, error] = useFonts({
    Barriecito_400Regular,
    NothingYouCouldDo_400Regular,
    NotoSansMono_400Regular,
    NotoSansMono_600SemiBold,
    PatrickHand_400Regular,
    PlaywriteNZ_400Regular,
    Redaction35_400Regular,
    Rubik_400Regular,
    Rubik_600SemiBold,
  });
  return loaded || !!error;
}
