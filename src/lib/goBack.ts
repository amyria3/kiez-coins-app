import { useCallback } from 'react';
import { usePathname, useRouter } from 'expo-router';

/** Ordner ohne eigene Seite: Zurück springt von dort an die passende Stelle */
const NO_PAGE: Record<string, string> = {
  '/user': '/feed',
  '/challenge': '/feed',
  '/challenge/create': '/feed',
  '/account/umfrage': '/account',
  '/settings': '/account',
  '/rechtliches': '/account',
  '/onboarding': '/onboarding/welcome',
};

/** Übergeordnete Seite eines Pfads, z. B. `/account/look` → `/account` */
export function parentOf(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  parts.pop();
  const parent = parts.length ? `/${parts.join('/')}` : '/feed';
  return NO_PAGE[parent] ?? parent;
}

/**
 * Zurück, auch ohne Verlauf (Daria, 24.10.2026: Aus „Look“ kam man nach dem Wechsel nicht mehr heraus).
 * Ein Look-Wechsel, ein Neuladen oder ein direkter Link startet die App ohne Verlauf; `router.back()` tut dann nichts.
 * Ohne Verlauf ersetzt die Funktion die Seite durch die übergeordnete. So führt der Pfeil immer eine Ebene höher.
 */
export function useGoBack() {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(parentOf(pathname) as never);
  }, [router, pathname]);
}
