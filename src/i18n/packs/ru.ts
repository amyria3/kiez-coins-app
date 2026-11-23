// Sprachpaket ru: wird erst geladen, wenn jemand die Sprache nutzt (src/data/texts.ts, Daria, 2026-11-23: schnellerer Start)
import main from '../ru.json';
import auto from '../auto/ru.json';
import er from '../ru.er.json';
import sie from '../ru.sie.json';
import type { LanguagePack } from '../gender';

const pack: LanguagePack = { main, auto, overlays: { er, sie } };
export default pack;
