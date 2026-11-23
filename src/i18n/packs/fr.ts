// Sprachpaket fr: wird erst geladen, wenn jemand die Sprache nutzt (src/data/texts.ts, Daria, 2026-11-23: schnellerer Start)
import main from '../fr.json';
import auto from '../auto/fr.json';
import er from '../fr.er.json';
import sie from '../fr.sie.json';
import type { LanguagePack } from '../gender';

const pack: LanguagePack = { main, auto, overlays: { er, sie } };
export default pack;
