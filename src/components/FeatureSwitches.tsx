import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  MODES,
  setModeHidden,
  setPostsShown,
  setCardMotion,
  setRoutineShown,
  setRoutineStandard,
  setStandardMode,
  useModes,
  usePostsShown,
  useCardMotion,
  useRoutineShown,
  type Mode,
  type PostFeed,
} from '../data/features';
import { useRoutineAvailable, useRoutineIsStandard } from '../data/routine';
import { useStore } from '../data/store';
import { t } from '../data/texts';
import { PrivateSignalProvider } from '../theme/signal';
import { color, space, text } from '../theme/tokens';
import { FieldGroup } from './Content';
import { MODE_OF_TAB, Segments, TAB_OF_MODE, TabsNavigation } from './FeedHeader';
import { ME_TABS } from './feed/feedConstants';
import { Toggle } from './Form';
import { Text } from './T';

/**
 * Modi Privat, Gruppe, Kiez (Onboarding und Dein Konto › Funktionen, Daria, 27.10.2026): Der Schalter (vorher ein Auge,
 * Daria, 08.11.2026) blendet einen Modus aus; der letzte sichtbare bleibt an. Darüber der Standard (ganz oben, Daria, 09.11.2026), der im Umschalter oben vorausgewählt ist,
 * als derselbe waagerechte Umschalter wie im Feed.
 * Ganz unten Bilder und Textposts je für Kiez und Überall (Daria, 09.11.2026). Ein Schalter lässt sich nur bedienen,
 * wenn sein Modus sichtbar ist, sonst ist er ausgegraut.
 * Routine (Erinnerungen) steht als erster Punkt unter „Feeds & Modi“ und lässt sich als Standard wählen; dann öffnet
 * die App beim Start die Routine (Daria, 2026-11-10). Überschriften im Stil `heading` (Daria, 2026-11-10).
 */

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
  const cardMotion = useCardMotion();
  const routineStandard = useRoutineIsStandard();
  // Derselbe Umschalter wie oben im Feed (Daria, 2026-11-17): „Me & Myself“ links als eigene Spur, darin Privat und
  // Routine; daneben Gruppen, Kiez, Überall mit denselben Namen. Hat „Me & Myself“ beides, wählt darunter derselbe
  // zweite Umschalter wie im Feed „Meine Struktur“ (Routine) oder „Mein Feed“ (Privat).
  const routineLead = routineAvailable && routineShown;
  const privateOn = modes.isVisible('private');
  const meOn = routineLead || privateOn;
  const meBoth = routineLead && privateOn;
  const meActive = meOn && (routineStandard || modes.standard === 'private');
  const others = modes.visible.filter((m) => m !== 'private');
  const shown = (meOn ? 1 : 0) + others.length;

  const toggle = (mode: Mode) => {
    if (currentUserId) setModeHidden(currentUserId, mode, modes.isVisible(mode));
  };
  const choose = (key: StandardKey) => {
    if (!currentUserId) return;
    if (key === 'routine') setRoutineStandard(currentUserId);
    else setStandardMode(currentUserId, key);
  };
  // Wie im Feed: „Me & Myself“ öffnet zuerst den privaten Feed, ohne ihn die Routine
  const chooseMe = () => {
    if (!meActive) choose(privateOn ? 'private' : 'routine');
  };

  return (
    <View style={styles.wrap}>
      {shown > 1 ? (
        <FieldGroup heading label="Standard">
          <Text style={[text.caption, { color: color.text.secondary }]}>
            {routineStandard ? 'Die App öffnet mit Deiner Routine.' : 'Dieser Modus ist oben im Umschalter vorausgewählt.'}
          </Text>
          <TabsNavigation
            selectedKey={TAB_OF_MODE[modes.standard]}
            onChange={(tab) => {
              const mode = MODE_OF_TAB[tab];
              if (mode) choose(mode);
            }}
            visible={meOn ? others : modes.visible}
            accent
            lead={meOn ? { label: t('Me & Myself'), active: meActive, private: true, onPress: chooseMe } : undefined}
          />
          {meActive && meBoth ? (
            <PrivateSignalProvider value>
              <Segments
                accent
                tabs={ME_TABS}
                selectedKey={routineStandard ? 'structure' : 'private'}
                onChange={(key) => choose(key === 'structure' ? 'routine' : 'private')}
              />
            </PrivateSignalProvider>
          ) : null}
        </FieldGroup>
      ) : null}
      <FieldGroup heading label="Feeds & Modi anzeigen oder ausblenden">
        {/* Routine als erster Punkt (Daria, 2026-11-10); Feature `routine` */}
        {routineAvailable ? (
          <View style={styles.row}>
            <View style={[styles.texts, !routineShown && styles.dim]}>
              {/* Routine als Ganzes, darin Erinnerungen und Kalender (Daria, 2026-11-13) */}
              <Text style={[text.body, { color: color.text.primary }]}>Routine</Text>
              <Text style={[text.caption, { color: color.text.secondary }]}>Erinnerungen, Termine und der Kater, der Dich erinnert.</Text>
            </View>
            <Toggle label="Routine" value={routineShown} onValueChange={(v) => currentUserId && setRoutineShown(currentUserId, v)} />
          </View>
        ) : null}
        {/* Bewegte Karten als ein Paket (Daria, 2026-11-13); nur bei sichtbarer Routine bedienbar */}
        {routineAvailable ? (
          <View style={styles.row}>
            <View style={[styles.texts, !(routineShown && cardMotion) && styles.dim]}>
              <Text style={[text.body, { color: color.text.primary }]}>Bewegte Karten</Text>
              <Text style={[text.caption, { color: color.text.secondary }]}>
                Karten liegen schräg, Dringendes wackelt. Halten und ziehen: rechts erledigt, links abbrechen, oben später.
              </Text>
            </View>
            <View style={!routineShown && styles.locked} pointerEvents={routineShown ? 'auto' : 'none'}>
              <Toggle label="Bewegte Karten" value={cardMotion} onValueChange={(v) => currentUserId && setCardMotion(currentUserId, v)} />
            </View>
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
