/** Die beiden Looks der App: dunkel „Nachtschicht“ und hell „Insta“ (Daria, 23.10.2026). */
export type Look = 'nachtschicht' | 'insta';

export const looks: { key: Look; label: string; description: string }[] = [
  { key: 'nachtschicht', label: 'Nachtschicht', description: 'Dunkel, Glas, Fotos als Karten' },
  { key: 'insta', label: 'Insta', description: 'Hell, Fotos über die ganze Breite' },
];

export const isLook = (value: string): value is Look => value === 'nachtschicht' || value === 'insta';

/** Look aus dem Build, z. B. `EXPO_PUBLIC_LOOK=insta` für die zweite APK. Sonst Nachtschicht. */
export function defaultLook(): Look {
  const value = process.env.EXPO_PUBLIC_LOOK;
  return value && isLook(value) ? value : 'nachtschicht';
}
