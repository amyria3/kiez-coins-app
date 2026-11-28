import { useEffect, type ReactNode } from 'react';
// @ts-expect-error react-dom bringt hier keine Typen mit, die Web-Fassung nutzt nur createPortal
import { createPortal } from 'react-dom';
import { useIsFocused } from 'expo-router';

import { claimAside, useAsideHost } from './DesktopNav';

/**
 * Inhalt für die rechte Spalte der Desktop-Fassung (Daria, 2026-11-28): Die Seite, die vorn ist, legt ihn dort ab.
 * Die Spalte selbst steht im Rahmen der App (DesktopFrame in DesktopNav.tsx) und ist nur ab 1200 px da.
 */
export function DesktopAside({ children }: { children: ReactNode }) {
  const host = useAsideHost();
  const focused = useIsFocused();
  // Platz in der Spalte nur, solange diese Seite vorn ist
  useEffect(() => (focused ? claimAside() : undefined), [focused]);
  if (!host || !focused) return null;
  return (createPortal as (node: ReactNode, host: HTMLElement) => ReactNode)(children, host);
}
