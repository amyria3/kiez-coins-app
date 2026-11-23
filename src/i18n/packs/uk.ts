// Sprachpaket uk: wird erst geladen, wenn jemand die Sprache nutzt (src/data/texts.ts, Daria, 2026-11-23: schnellerer Start)
import main from '../uk.json';
import auto from '../auto/uk.json';
import er from '../uk.er.json';
import sie from '../uk.sie.json';
import type { LanguagePack } from '../gender';

const pack: LanguagePack = { main, auto, overlays: { er, sie } };
export default pack;
