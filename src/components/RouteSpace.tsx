import type { ReactNode } from 'react';

import { useChallenge } from '../data/store';
import { SpaceScreen, spaceOfRoute } from '../theme/signal';

/** Routen, die zu einem Post gehören (`[id]` ist die id des Posts) */
const isPostRoute = (name: string) => name.startsWith('challenge/[id]') || name.startsWith('before-after/[id]');

/**
 * Bereich jeder Seite, an einer Stelle (Daria, 2026-11-15). Das Root-Layout legt das um jede Route
 * (`screenLayout`). Komponenten holen ihre Farben dann über `useAccentColor`, `useFocusColor` usw. selbst.
 */
export function RouteSpace({ route, children }: { route: { name: string; params?: object }; children: ReactNode }) {
  const id = isPostRoute(route.name) ? (route.params as { id?: string } | undefined)?.id : undefined;
  const { challenge } = useChallenge(id);
  return <SpaceScreen space={spaceOfRoute(route.name, challenge)}>{children}</SpaceScreen>;
}
