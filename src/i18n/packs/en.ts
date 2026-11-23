// Sprachpaket en: wird erst geladen, wenn jemand die Sprache nutzt (src/data/texts.ts, Daria, 2026-11-23: schnellerer Start)
import main from '../en.json';
import auto from '../auto/en.json';
import er from '../en.er.json';
import sie from '../en.sie.json';
import type { LanguagePack } from '../gender';

const pack: LanguagePack = { main, auto, overlays: { er, sie } };
export default pack;
