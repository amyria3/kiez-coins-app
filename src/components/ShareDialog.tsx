import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { t } from '../data/texts';
import { shareImageFiles } from '../lib/sheetImages';
import { color, radius, space, text } from '../theme/tokens';
import { Button } from './Button';
import { Frost } from './Glass';
import { Text } from './T';

/**
 * Teilen mit Bild im Browser (Daria, 07.11.2026). Der Dialog erscheint sofort beim Antippen („Wir bereiten Deinen
 * Post vor“), solange Bilder und Link entstehen. Ist alles fertig, öffnet „Teilen“ das Teilen-Menü: Erst dieser
 * zweite Tipp darf es öffnen, nach dem Warten würde Safari es sonst verweigern.
 * Die Bilder gehen ohne Text raus, denn WhatsApp legt mitgeschickten Text als festen Kasten aufs Bild. Den Link
 * kopiert man stattdessen mit „Link kopieren“ und fügt ihn in die Nachricht ein.
 */
/** `slides`: Blätter eines Text-Posts, sonst Fotos */
export type SharePrepared = { files: File[]; message: string; slides?: boolean };

type State =
  | { phase: 'preparing' }
  | { phase: 'ready'; prepared: SharePrepared }
  | { phase: 'done'; prepared: SharePrepared; copied: boolean }
  | { phase: 'failed' };

let open: ((job: Promise<SharePrepared>, fallback: (message: string) => void) => void) | undefined;

/** Dialog öffnen, während `job` Bilder und Text vorbereitet. Gibt es keine Bilder, läuft `fallback` (nur Text). */
export function openShareDialog(job: Promise<SharePrepared>, fallback: (message: string) => void): boolean {
  if (!open || Platform.OS !== 'web') return false;
  open(job, fallback);
  return true;
}

/** Einmal im Root-Layout einbinden. Rendert nur im Browser etwas. */
export function ShareDialogHost() {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let current = 0;
    open = (job, fallback) => {
      const id = ++current;
      setState({ phase: 'preparing' });
      job
        .then((prepared) => {
          if (id !== current) return;
          if (!prepared.files.length) {
            setState(null);
            fallback(prepared.message);
          } else setState({ phase: 'ready', prepared });
        })
        .catch(() => id === current && setState({ phase: 'failed' }));
    };
    return () => {
      open = undefined;
    };
  }, []);

  if (!state) return null;
  const close = () => setState(null);

  const copy = (prepared: SharePrepared) => {
    Clipboard.setStringAsync(prepared.message).catch(() => undefined);
    setState({ phase: 'done', prepared, copied: true });
  };

  let title: string;
  let message: string | undefined;
  let body: React.ReactNode = null;
  if (state.phase === 'preparing') {
    title = t('Wir bereiten Deinen Post vor');
    body = <ActivityIndicator color={color.text.primary} style={styles.spinner} />;
  } else if (state.phase === 'failed') {
    title = t('Teilen hat nicht geklappt');
    message = t('Bitte versuche es gleich noch einmal.');
    body = <Button label={t('OK')} onPress={close} />;
  } else if (state.phase === 'ready') {
    const { prepared } = state;
    title = t('Dein Post ist bereit');
    const n = prepared.files.length;
    message = prepared.slides
      ? n > 1
        ? t('Teile die {count} Slides. Den Link kopierst Du danach für Deine Nachricht.', { count: n })
        : t('Teile die Slide. Den Link kopierst Du danach für Deine Nachricht.')
      : prepared.files.length > 1
        ? t('Teile die {count} Bilder. Den Link kopierst Du danach für Deine Nachricht.', { count: prepared.files.length })
        : t('Teile das Bild. Den Link kopierst Du danach für Deine Nachricht.');
    body = (
      <>
        <Button
          // „Als Slide teilen“ (Daria, 07.11.2026); bei Fotos passt „Slide“ nicht
          label={prepared.slides ? t('Als Slide teilen') : prepared.files.length > 1 ? t('Bilder teilen') : t('Bild teilen')}
          onPress={() => {
            // Ohne await davor: Safari öffnet das Teilen-Menü nur direkt nach dem Tipp
            shareImageFiles(prepared.files).then((result) => {
              if (result === 'cancelled') return;
              setState({ phase: 'done', prepared, copied: false });
            });
          }}
        />
        <Button label={t('Link kopieren')} variant="secondary" onPress={() => copy(prepared)} />
        <Button label={t('Abbrechen')} variant="ghost" onPress={close} />
      </>
    );
  } else {
    const { prepared, copied } = state;
    title = copied ? t('Link kopiert') : t('Link zum Post');
    message = copied
      ? t('Füge ihn in Deine Nachricht ein.')
      : t('Kopiere den Link und füge ihn in Deine Nachricht ein.');
    body = (
      <>
        {copied ? null : <Button label={t('Link kopieren')} onPress={() => copy(prepared)} />}
        <Button label={copied ? t('Fertig') : t('Nicht nötig')} variant={copied ? 'primary' : 'ghost'} onPress={close} />
      </>
    );
  }

  return (
    <Frost scrim style={styles.backdrop} contentStyle={styles.center}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel={t('Schließen')} onPress={close} />
      <Frost style={styles.card} contentStyle={styles.inner}>
        <View accessibilityRole="alert" accessibilityViewIsModal style={styles.alert}>
          <Text style={[text.title, styles.title]}>{title}</Text>
          {message ? <Text style={[text.body, styles.message]}>{message}</Text> : null}
          <View style={styles.buttons}>{body}</View>
        </View>
      </Frost>
    </Frost>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[24] },
  card: { width: '100%', maxWidth: 360, borderRadius: radius.card, borderWidth: 1, borderColor: color.line.hairline },
  inner: { padding: space[24] },
  alert: { gap: space[8] },
  title: { color: color.text.primary },
  message: { color: color.text.secondary },
  buttons: { marginTop: space[16], gap: space[8] },
  spinner: { alignSelf: 'flex-start' },
});
