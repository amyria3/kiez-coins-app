// Ergänzungen nach Geschlecht (Daria, 24.10.2026). Jede Datei enthält nur Texte, die vom Geschlecht abhängen;
// Schlüssel ist der deutsche Originaltext wie in den Sprachdateien. Grundfassung jeder Sprache: unbestimmt.
//
// Deutsch ist immer dabei. Die anderen Sprachen liegen mit ihren Ergänzungen in src/i18n/packs/<sprache>.ts und
// kommen erst, wenn jemand die Sprache nutzt (Daria, 2026-11-23: Die Digitale Visitenkarte soll nach dem Scannen
// schnell erscheinen; alle Sprachen zusammen waren rund 3 MB der Web-App).
import type { Gender } from '../data/types';

import deEr from './de.er.json';
import deSie from './de.sie.json';

export type Overlay = Record<string, string>;
export type GenderOverlays = Partial<Record<Gender, Overlay>>;

/** Übersetzung von Hand, DeepL für die Lücken und Ergänzungen nach Geschlecht */
export type LanguagePack = { main: Record<string, string>; auto: Record<string, string>; overlays: GenderOverlays };

export const germanOverlays: GenderOverlays = { er: deEr, sie: deSie };
