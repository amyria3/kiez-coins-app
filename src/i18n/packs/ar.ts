// Sprachpaket ar: wird erst geladen, wenn jemand die Sprache nutzt (src/data/texts.ts, Daria, 2026-11-23: schnellerer Start)
import main from '../ar.json';
import auto from '../auto/ar.json';
import er from '../ar.er.json';
import sie from '../ar.sie.json';
import person from '../ar.person.json';
import type { LanguagePack } from '../gender';

// Die Grunddatei spricht noch männlich an. „person“ ersetzt sie durch neutrale Formen.
const pack: LanguagePack = { main, auto, overlays: { er, sie, person } };
export default pack;
