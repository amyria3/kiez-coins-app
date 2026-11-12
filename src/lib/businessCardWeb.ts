import { drawBusinessCard, downloadCard, printCard, shareCard, shareNote } from './businessCardCanvas';

/**
 * Einstieg für die öffentliche Seite kiezcoins.de/s/<kurzname> (api/s.mjs, Daria, 2026-11-12: „kann die Visitenkarte
 * nicht teilen“). scripts/build-download-site.mjs bündelt diese Datei nach website/visitenkarte.js.
 */
(globalThis as unknown as { KiezVisitenkarte: unknown }).KiezVisitenkarte = { drawBusinessCard, downloadCard, printCard, shareCard, shareNote };
