import { Platform } from 'react-native';

import { showcasePublicLink, type Showcase } from '../data/showcase';
import { t } from '../data/texts';
import { setCardTranslator, type CardData } from './businessCardCanvas';

/**
 * Visitenkarte des Schaufensters in der App (Daria, 2026-11-12). Das Zeichnen steht in businessCardCanvas.ts, ohne
 * Abhängigkeiten zur App, damit die öffentliche Seite kiezcoins.de/s/<kurzname> dieselbe Karte teilt.
 */
export * from './businessCardCanvas';

if (Platform.OS === 'web') setCardTranslator(t);

export function cardData(s: Showcase): CardData {
  return {
    name: s.name,
    kiez: s.kiez,
    address: s.address,
    openingHours: s.openingHours,
    services: s.services,
    links: s.links,
    url: showcasePublicLink(s.slug),
    logoUri: typeof s.logo === 'object' && s.logo && 'uri' in s.logo ? (s.logo as { uri?: string }).uri : undefined,
  };
}
