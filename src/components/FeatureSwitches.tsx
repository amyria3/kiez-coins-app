import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  MODES,
  setModeHidden,
  setPostsShown,
  setRoutineShown,
  setRoutineStandard,
  setStandardMode,
  useModes,
  usePostsShown,
  useRoutineShown,
  type Mode,
  type PostFeed,
} from '../data/features';
import { useRoutineAvailable, useRoutineIsStandard } from '../data/routine';
import { useStore } from '../data/store';
import { t } from '../data/texts';
import { color, space, text } from '../theme/tokens';
import { FieldGroup } from './Content';
import { Segments } from './FeedHeader';
import { Toggle } from './Form';
import { Text } from './T';

/**
 * Modi Privat, Gruppe, Kiez (Onboarding und Dein Konto › Funktionen, Daria, 27.10.2026): Der Schalter (vorher ein Auge,
 * Daria, 08.11.2026) blendet einen Modus aus; der letzte sichtbare bleibt an. Darüber der Standard (ganz oben, Daria, 09.11.2026), der im Umschalter oben vorausgewählt ist,
 * als derselbe waagerechte Umschalter wie im Feed (vorher Radio-Liste, Daria, 08.11.2026).
 * Ganz unten Bilder und Textposts je für Kiez und Überall (Daria, 09.11.2026). Ein Schalter lässt sich nur bedienen,
 * wenn sein Modus sichtbar ist, sonst ist er ausgegraut.
 * Routine (Erinnerungen) steht als erster Punkt unter „Feeds & Modi“ und lässt sich als Standard wählen; dann öffnet
 * die App beim Start die Routine (Daria, 2026-11-10). Überschriften im Stil `heading` (Daria, 2026-11-10).
 */

// Kurze Namen wie im Umschalter oben im Feed, damit alle nebeneinander passen
const SHORT: Record<Mode, string> = { private: 'Privat', groups: 'Gruppe', kiez: 'Kiez', everywhere: 'Überall' };
type StandardKey = Mode | 'routine';

const POST_SWITCHES: { feed: PostFeed; label: string; off: string }[] = [
  { feed: 'kiez', label: 'Bilder und Textposts im Kiez-Feed anzeigen', off: 'Geht nur, wenn „Dein Kiez“ an ist.' },
  { feed: 'everywhere', label: 'Bilder und Textposts im „Überall“-Feed anzeigen', off: 'Geht nur, wenn „Überall“ an ist.' },
];
/** `children`: weitere Abschnitte im selben Abstand, z. B. Weiterposten unter Dein Konto › Funktionen */
export function FeatureSwitches({ children }: { children?: ReactNode } = {}) {
  const { currentUserId } = useStore();
  const modes = useModes();
  const postsShown = usePostsShown();
  const lastVisible = modes.visible.length === 1;
  const routineAvailable = useRoutineAvailable();
  const routineShown = useRoutineShown();
  const routineStandard = useRoutineIsStandard();
  // Routine links wie im Feed, dann die sichtbaren Modi
  const routineLead = routineAvailable && routineShown;
  const modeTabs = MODES.filter((m) => modes.isVisible(m.key)).map((m) => ({ key: m.key, label: SHORT[m.key] }));
  const standardTabs: { key: StandardKey; label: string }[] = [
    ...(routineLead ? [{ key: 'routine' as const, label: 'Routine' }] : []),
    ...modeTabs,
  ];

  const toggle = (mode: Mode) => {
    if (currentUserId) setModeHidden(currentUserId, mode, modes.isVisible(mode));
  };
  const choose = (key: StandardKey) => {
    if (!currentUserId) return;
    if (key === 'routine') setRoutineStandard(currentUserId);
    else setStandardMode(currentUserId, key);
  };

  return (
    <View style={styles.wrap}>
      {standardTabs.length > 1 ? (
        <FieldGroup heading label="Standard">
          <Text style={[text.caption, { color: color.text.secondary }]}>
            {routineStandard ? 'Die App öffnet mit Deiner Routine.' : 'Dieser Modus ist oben im Umschalter vorausgewählt.'}
          </Text>
          {/* Routine als eigene Pille links, wie im Feed (Daria, 2026-11-11); im Look „Fashionable“ ohne eigene Spur */}
          {routineLead && true ? (
            <Segments
              tabs={modeTabs}
              selectedKey={modes.standard}
              onChange={choose}
              lead={{ label: t('Routine'), active: routineStandard, onPress: () => choose('routine') }}
            />
          ) : (
            <Segments tabs={standardTabs} selectedKey={routineStandard ? 'routine' : modes.standard} onChange={choose} />
          )}
        </FieldGroup>
      ) : null}
      <FieldGroup heading label="Feeds & Modi anzeigen oder ausblenden">
        {/* Routine als erster Punkt (Daria, 2026-11-10); Feature `routine` */}
        {routineAvailable ? (
          <View style={styles.row}>
            <View style={[styles.texts, !routineShown && styles.dim]}>
              {/* Routine als Ganzes, darin Erinnerungen und Kalender (Daria, 2026-11-13; vorher „Erinnerungen“) */}
              <Text style={[text.body, { color: color.text.primary }]}>Routine</Text>
              <Text style={[text.caption, { color: color.text.secondary }]}>Erinnerungen, Termine und der Kater, der Dich erinnert.</Text>
            </View>
            <Toggle label="Routine" value={routineShown} onValueChange={(v) => currentUserId && setRoutineShown(currentUserId, v)} />
          </View>
        ) : null}
        {MODES.map((m) => {
          const visible = modes.isVisible(m.key);
          const locked = visible && lastVisible;
          return (
            <View key={m.key} style={styles.row}>
              <View style={[styles.texts, !visible && styles.dim]}>
                <Text style={[text.body, { color: color.text.primary }]}>{m.label}</Text>
                <Text style={[text.caption, { color: color.text.secondary }]}>{m.description}</Text>
              </View>
              <View style={locked && styles.locked} pointerEvents={locked ? 'none' : 'auto'}>
                <Toggle label={m.label} value={visible} onValueChange={() => toggle(m.key)} />
              </View>
            </View>
          );
        })}
      </FieldGroup>
      <FieldGroup heading label="Arten von Content anzeigen oder ausblenden">
        {POST_SWITCHES.map((p) => {
          const usable = modes.isVisible(p.feed);
          return (
            <View key={p.feed} style={styles.row}>
              <View style={[styles.texts, !usable && styles.dim]}>
                <Text style={[text.body, { color: color.text.primary }]}>{p.label}</Text>
                <Text style={[text.caption, { color: color.text.secondary }]}>
                  {usable ? 'Posts ohne Challenge. Posten kannst Du Bilder und Texte trotzdem.' : p.off}
                </Text>
              </View>
              <View style={!usable && styles.locked} pointerEvents={usable ? 'auto' : 'none'}>
                <Toggle
                  label={p.label}
                  value={postsShown[p.feed]}
                  onValueChange={(v) => currentUserId && setPostsShown(currentUserId, p.feed, v)}
                />
              </View>
            </View>
          );
        })}
      </FieldGroup>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // Mehr Luft vor jedem Abschnitt, damit sie sich trennen (Daria, 2026-11-09)
  wrap: { gap: space[32] + space[8] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[4] },
  texts: { flex: 1, gap: space[2] },
  dim: { opacity: 0.5 },
  // Letzter sichtbarer Modus: bleibt an
  locked: { opacity: 0.5 },
});
