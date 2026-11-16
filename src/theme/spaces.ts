/**
 * Bereiche (Themes) der App ohne React, damit sie sich testen lassen (tests/spaces.test.ts). Die Farben und den
 * Kontext dazu liefert `signal.tsx`.
 */
export type Space = 'me' | 'public' | 'group' | 'functional';

/**
 * Eine Stelle für den Bereich jeder Seite (Daria, 2026-11-15): Das Root-Layout legt um jede Route `RouteSpace`
 * (components/RouteSpace.tsx). Der Bereich ergibt sich aus der Route und, bei Posts, aus dem Post selbst
 * (`spaceOfRoute`). Seiten setzen ihn nicht mehr selbst. Nur wo eine Wahl auf der Seite den Bereich ändert (Reiter
 * im Feed, Ziel beim Erstellen, Sichtbarkeit beim Bearbeiten), meldet die Seite ihn mit `useSpaceOverride`.
 */
export function spaceOfRoute(name: string, post?: { private?: boolean; groupId?: string }): Space {
  if (isFunctionalRoute(name)) return 'functional';
  if (name.startsWith('routine/')) return 'me';
  // Seiten zu einem Post: Detail, Bearbeiten, Kommentare, Likes, Me-Challenge usw.
  if (post) return post.private ? 'me' : post.groupId ? 'group' : 'public';
  if (name.startsWith('groups/')) return 'group';
  return 'public';
}

/**
 * Routen mit Theme „Functional“ (Daria, 2026-11-14): alles unter Dein Konto außer Freundschaften (bleibt Friendship),
 * Schaufenster verwalten und bearbeiten, Moderation, Texte. Die öffentliche Schaufenster-Seite bleibt Friendship.
 */
export function isFunctionalRoute(name: string): boolean {
  if (name === 'account/friends') return false;
  return (
    name.startsWith('account/') ||
    name === 'schaufenster/index' ||
    name === 'schaufenster/[id]/bearbeiten' ||
    name === 'moderation' ||
    name === 'texts'
  );
}

