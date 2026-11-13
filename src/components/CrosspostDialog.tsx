import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CROSSPOST_PLATFORMS, crosspostTargets, type LivePlatform } from '../data/crosspost';
import { t } from '../data/texts';
import { color, radius, space, text } from '../theme/tokens';
import { Button } from './Button';
import { Toggle } from './Form';
import { Frost } from './Glass';
import { Text } from './T';

/**
 * Rückfrage beim Löschen und Wiederherstellen weitergeposteter Posts (Daria, 05.11.2026): pro Plattform ein Schalter,
 * alle vorausgewählt wie beim Posten. Der Text darüber nennt die gewählten Plattformen und ändert sich mit den Schaltern.
 * Läuft auf allen Plattformen (anders als `Alert.alert`, das keine Schalter kann).
 */
type Request = {
  kind: 'delete' | 'restore';
  platforms: LivePlatform[];
  resolve: (selected: LivePlatform[] | null) => void;
};

let show: ((request: Request) => void) | undefined;

/** Gibt die gewählten Plattformen zurück, `null` bei „Abbrechen“. */
export function askCrosspost(kind: Request['kind'], platforms: LivePlatform[]): Promise<LivePlatform[] | null> {
  return new Promise((resolve) => {
    if (show) show({ kind, platforms, resolve });
    else resolve(platforms);
  });
}

/**
 * Vor dem Wiederherstellen: Wurde der Post beim Löschen auch auf anderen Plattformen gelöscht, fragt der Dialog,
 * wo er wieder gepostet wird. Gibt die Auswahl zurück ([] ohne Weiterposts), `null` bei „Abbrechen“.
 */
export async function restoreWithChoice(challengeId: string): Promise<LivePlatform[] | null> {
  const targets = await crosspostTargets(challengeId, 'restore');
  return targets.length ? askCrosspost('restore', targets) : [];
}

const label = (p: LivePlatform) => CROSSPOST_PLATFORMS.find((x) => x.key === p)?.label ?? p;
const list = (platforms: LivePlatform[]) => platforms.map(label).join(t(' und '));

/** Einmal im Root-Layout einbinden. */
export function CrosspostDialogHost() {
  const [request, setRequest] = useState<Request>();
  const [selected, setSelected] = useState<LivePlatform[]>([]);

  useEffect(() => {
    show = (r) => {
      setSelected(r.platforms);
      setRequest(r);
    };
    return () => {
      show = undefined;
    };
  }, []);

  if (!request) return null;
  const close = (result: LivePlatform[] | null) => {
    setRequest(undefined);
    request.resolve(result);
  };
  const isDelete = request.kind === 'delete';
  const message = isDelete
    ? selected.length
      ? t('Die Challenge verschwindet aus dem Feed und wird auch auf {platforms} gelöscht.', { platforms: list(selected) })
      : t('Die Challenge verschwindet aus dem Feed. Auf anderen Plattformen bleibt sie stehen.')
    : selected.length
      ? t('Die Challenge kommt zurück in den Feed und wird wieder auf {platforms} gepostet.', { platforms: list(selected) })
      : t('Die Challenge kommt zurück in den Feed, nur in KiezCoins.');

  return (
    <Frost scrim style={styles.backdrop} contentStyle={styles.center}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel={t('Schließen')} onPress={() => close(null)} />
      <Frost style={styles.card} contentStyle={styles.inner}>
        <View accessibilityRole="alert" accessibilityViewIsModal style={styles.alert}>
          <Text style={[text.title, styles.title]}>{isDelete ? 'Challenge löschen?' : 'Challenge wiederherstellen?'}</Text>
          <Text noTranslate style={[text.body, styles.message]}>{message}</Text>
          <Text style={[text.caption, styles.message, styles.section]}>
            {isDelete ? 'Auch löschen auf' : 'Wieder posten auf'}
          </Text>
          {request.platforms.map((p) => (
            <View key={p} style={styles.row}>
              <Text noTranslate style={[text.body, styles.title, styles.flex]}>{label(p)}</Text>
              <Toggle
                label={label(p)}
                value={selected.includes(p)}
                onValueChange={(on) => setSelected((s) => (on ? [...s.filter((x) => x !== p), p] : s.filter((x) => x !== p)))}
              />
            </View>
          ))}
          <View style={styles.buttons}>
            <Button
              label={isDelete ? 'Löschen' : 'Wiederherstellen'}
              variant={isDelete ? 'danger' : 'primary'}
              onPress={() => close(selected)}
            />
            <Button label="Abbrechen" variant="ghost" onPress={() => close(null)} />
          </View>
        </View>
      </Frost>
    </Frost>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[24] },
  card: { width: '100%', maxWidth: 360, borderRadius: radius.xl, borderWidth: 1, borderColor: color.line.hairline },
  inner: { padding: space[24] },
  alert: { gap: space[8] },
  title: { color: color.text.primary },
  message: { color: color.text.secondary },
  section: { marginTop: space[8] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  flex: { flex: 1 },
  buttons: { marginTop: space[16], gap: space[8] },
});
