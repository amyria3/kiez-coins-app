import { isLight } from './look';
import { color, withAlpha } from './tokens';

/**
 * Seitensprache im Kiez-Look (Daria, 2026-11-28): Eine Grafik trägt die Seite, alles andere schweigt. Unterseiten
 * haben einen großen Kopf mit Überschrift und angeschnittenem Kater, Inhalte stehen ohne Kästen direkt auf dem Grund
 * und werden durch feine Linien getrennt. Große Farbflächen bleiben dem Kalender vorbehalten. Mono und Light behalten
 * ihre Karten.
 */
export const BARE = !isLight;
/** Feine Linie zwischen Einträgen */
export const LINE = withAlpha(color.text.primary, 0.2);
/** Etwas kräftigere Linie zwischen Abschnitten und zwischen Posts */
export const LINE_STRONG = withAlpha(color.text.primary, 0.28);
/** Fläche ohne Kasten: Der Inhalt steht direkt auf dem Grund */
export const paper = BARE ? { borderRadius: 4, backgroundColor: 'transparent', borderWidth: 0, borderColor: 'transparent' } : null;
