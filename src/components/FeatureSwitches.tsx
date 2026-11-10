import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { MODES, setModeHidden, setPostsShown, setRoutineShown, setStandardMode, useModes, usePostsShown, useRoutineShown, type Mode, type PostFeed } from '../data/features';
import { useRoutineAvailable } from '../data/routine';
import { useStore } from '../data/store';
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
 */

// Kurze Namen wie im Umschalter oben im Feed, damit alle vier nebeneinander passen
const SHORT: Record<Mode, string> = { private: 'Privat', groups: 'Gruppe', kiez: 'Kiez', everywhere: 'Überall' };

const POST_SWITCHES: { feed: PostFeed; label: string; off: string }[] = [
  { feed: 'kiez', label: 'Bilder und Textposts im Kiez-Feed anzeigen', off: 'Geht nur, wenn „Dein Kiez“ an ist.' },
  { feed: 'everywhere', label: 'Bilder und Textposts überall anzeigen', off: 'Geht nur, wenn „Überall“ an ist.' },
];
/** `children`: weitere Abschnitte im selben Abstand, z. B. Weiterposten unter Dein Konto › Funktionen */
export function FeatureSwitches({ children }: { children?: ReactNode } = {}) {
  const { currentUserId } = useStore();
  const modes = useModes();
  const postsShown = usePostsShown();
  const lastVisible = modes.visible.length === 1;
  const routineAvailable = useRoutineAvailable();
  const routineShown = useRoutineShown();

  const toggle = (mode: Mode) => {
    if (currentUserId) setModeHidden(currentUserId, mode, modes.isVisible(mode));
  };
  const choose = (mode: Mode) => {
    if (currentUserId) setStandardMode(currentUserId, mode);
  };

  return (
    <View style={styles.wrap}>
      {modes.visible.length > 1 ? (
        <FieldGroup large label="Standard">
          <Text style={[text.caption, { color: color.text.secondary }]}>Dieser Modus ist oben im Umschalter vorausgewählt.</Text>
          <Segments
            tabs={MODES.filter((m) => modes.isVisible(m.key)).map((m) => ({ key: m.key, label: SHORT[m.key] }))}
            selectedKey={modes.standard}
            onChange={choose}
          />
        </FieldGroup>
      ) : null}
      <FieldGroup large label="Modi">
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
      <FieldGroup large label="Bilder und Textposts">
        {POST_SWITCHES.map((p) => {
          const usable = modes.isVisible(p.feed);
          return (
            <View key={p.feed} style={styles.row}>
              <View style={[styles.texts, !usable && styles.dim]}>
                <Text style={[text.body, { color: color.text.primary }]}>{p.label}</Text>
                <Text style={[text.caption, { color: color.text.secondary }]}>
                  {usable ? 'Posts ohne Challenge. Deine eigenen siehst Du immer.' : p.off}
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
      {/* Routine als Funktion, die sich ausblenden lässt; Feature `routine` (Daria, 2026-11-10) */}
      {routineAvailable ? (
        <FieldGroup large label="Routine">
          <View style={styles.row}>
            <View style={[styles.texts, !routineShown && styles.dim]}>
              <Text style={[text.body, { color: color.text.primary }]}>Erinnerungen</Text>
              <Text style={[text.caption, { color: color.text.secondary }]}>Knopf „Routine“ im Feed und der Kater, der Dich erinnert.</Text>
            </View>
            <Toggle label="Routine" value={routineShown} onValueChange={(v) => currentUserId && setRoutineShown(currentUserId, v)} />
          </View>
        </FieldGroup>
      ) : null}
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
