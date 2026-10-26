// Ergänzungen nach Geschlecht (Daria, 24.10.2026). Jede Datei enthält nur Texte, die vom Geschlecht abhängen;
// Schlüssel ist der deutsche Originaltext wie in den Sprachdateien. Grundfassung jeder Sprache: unbestimmt.
import type { Gender } from '../data/types';

import deEr from './de.er.json';
import deSie from './de.sie.json';
import enEr from './en.er.json';
import enSie from './en.sie.json';
import frEr from './fr.er.json';
import frSie from './fr.sie.json';
import ukEr from './uk.er.json';
import ukSie from './uk.sie.json';
import ruEr from './ru.er.json';
import ruSie from './ru.sie.json';
import heEr from './he.er.json';
import heSie from './he.sie.json';
import hePerson from './he.person.json';
import arEr from './ar.er.json';
import arSie from './ar.sie.json';
import arPerson from './ar.person.json';

type Overlay = Record<string, string>;

export const genderOverlays: Record<string, Partial<Record<Gender, Overlay>>> = {
  de: { er: deEr, sie: deSie },
  en: { er: enEr, sie: enSie },
  fr: { er: frEr, sie: frSie },
  uk: { er: ukEr, sie: ukSie },
  ru: { er: ruEr, sie: ruSie },
  // Hebräisch und Arabisch: Die Grunddatei spricht noch männlich an. „person“ ersetzt sie durch neutrale Formen.
  he: { er: heEr, sie: heSie, person: hePerson },
  ar: { er: arEr, sie: arSie, person: arPerson },
};
