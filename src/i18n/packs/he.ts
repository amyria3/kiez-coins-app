// Sprachpaket he: wird erst geladen, wenn jemand die Sprache nutzt (src/data/texts.ts, Daria, 2026-11-23: schnellerer Start)
import main from '../he.json';
import auto from '../auto/he.json';
import er from '../he.er.json';
import sie from '../he.sie.json';
import person from '../he.person.json';
import type { LanguagePack } from '../gender';

// Die Grunddatei spricht noch männlich an. „person“ ersetzt sie durch neutrale Formen.
const pack: LanguagePack = { main, auto, overlays: { er, sie, person } };
export default pack;
