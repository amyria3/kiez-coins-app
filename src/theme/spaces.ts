/**
 * Bereiche (Themes) der App ohne React, damit sie sich testen lassen (tests/spaces.test.ts). Die Farben und den
 * Kontext dazu liefert `signal.tsx`.
 */
export type Space = 'me' | 'public' | 'group' | 'functional' | 'showcase';

/**
 * Eine Stelle für den Bereich jeder Seite (Daria, 2026-11-15): Das Root-Layout legt um jede Route `RouteSpace`
 * (components/RouteSpace.tsx). Der Bereich ergibt sich aus der Route und, bei Posts, aus dem Post selbst
 * (`spaceOfRoute`). Seiten setzen ihn nicht mehr selbst. Nur wo eine Wahl auf der Seite den Bereich ändert (Reiter
 * im Feed, Ziel beim Erstellen, Sichtbarkeit beim Bearbeiten), meldet die Seite ihn mit `useSpaceOverride`.
 */
export function spaceOfRoute(name: string, post?: { private?: boolean; groupId?: string }): Space {
  if (isFunctionalRoute(name)) return 'functional';
  if (isShowcaseRoute(name)) return 'showcase';
  if (name.startsWith('routine/')) return 'me';
  // Seiten zu einem Post: Detail, Bearbeiten, Kommentare, Likes, Me-Challenge usw.
  if (post) return post.private ? 'me' : post.groupId ? 'group' : 'public';
  if (name.startsWith('groups/')) return 'group';
  return 'public';
}

/**
 * Routen mit Theme „Schaufenster“ (Daria, 2026-11-17): alle Seiten des Schaufensters, auch Verwalten und Bearbeiten
 * (Daria, 2026-11-17: „Falscher Farbmodus“ auf Verwalten in Grün). Dazu das öffentliche Schaufenster und was man von
 * dort aus tut (Post, Termin, Visitenkarte, mit Code beitreten).
 * Alles unter `schaufenster/` und `s/` statt einer Liste einzelner Seiten: Die Liste vergaß neue Seiten, die Digitale
 * Visitenkarte für Gäste (`s/[slug]/visitenkarte`), Druck und Einstellungen blieben deshalb lila (Daria, 2026-11-24:
 * „Wieso Lila?“).
 */
export function isShowcaseRoute(name: string): boolean {
  return name.startsWith('schaufenster/') || name.startsWith('s/');
}

/**
 * Routen mit Theme „Functional“ (Daria, 2026-11-14): alles unter Dein Konto außer Freundschaften (bleibt Friendship),
 * Moderation, Texte. Alle Schaufenster-Seiten haben seit 2026-11-17 ein eigenes Theme (`isShowcaseRoute`).
 */
export function isFunctionalRoute(name: string): boolean {
  if (name === 'account/friends') return false;
  return (
    name.startsWith('account/') ||
    name === 'moderation' ||
    name === 'texts'
  );
}

