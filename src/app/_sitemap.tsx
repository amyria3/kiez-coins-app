import { useEffect, useState } from 'react';
import { Sitemap, Unmatched } from 'expo-router';

import { isModerator } from '../data/remote';

/**
 * Route `_sitemap` (Daria, 2026-11-25): Expo Router legt sonst selbst eine Seite an, die jede Route der App auflistet,
 * auch Moderation und Werkzeuge. Diese Datei ersetzt sie. Moderatorinnen (Tabelle `moderators`) sehen die Liste
 * weiter, alle anderen die normale Seite „nicht gefunden“. Die Daten hinter den Seiten schützt RLS, nicht dieser Check.
 */
export default function SitemapScreen() {
  const [moderator, setModerator] = useState<boolean | null>(null);
  useEffect(() => {
    isModerator()
      .catch(() => false)
      .then(setModerator);
  }, []);
  if (moderator === null) return null;
  return moderator ? <Sitemap /> : <Unmatched />;
}
