import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { KaterMessage } from '../../components/KaterMessage';
import { NavigationBar } from '../../components/NavigationBar';
import { Notice } from '../../components/Content';
import { capitalize, goalOf, loadReminders, markReminderDone, routineLabel, setRoutinePost, type Reminder } from '../../data/reminders';
import { t } from '../../data/texts';
import { useGoBack } from '../../lib/goBack';
import { color, space } from '../../theme/tokens';
import { MeSpaceScreen } from '../../theme/signal';

/**
 * Route `routine/[id]` (Daria, 2026-11-10): Erledigt melden. Standard ist das Posten als Me-Challenge mit Titel
 * und Beschreibung als Vorher-Text, die Markierung kommt als Pille dazu. Abhaken ohne Post geht auch.
 */
/** Gehört zu „Me & Myself“: gelb wie die Routine (Daria, 2026-11-13) */
export default function ReminderDoneScreen() {
  return (
    <MeSpaceScreen>
      <ReminderDone />
    </MeSpaceScreen>
  );
}

function ReminderDone() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reminder, setReminder] = useState<Reminder | null | undefined>(undefined);
  const [busy, setBusy] = useState<'post' | 'check' | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadReminders().then((all) => setReminder(all?.find((r) => r.id === id) ?? null), () => setReminder(null));
  }, [id]);

  const finish = async (post: boolean) => {
    if (!reminder) return;
    setBusy(post ? 'post' : 'check');
    setFailed(false);
    const doneId = await markReminderDone(reminder.id);
    setBusy(null);
    if (!doneId) return setFailed(true);
    if (!post) return router.back();
    setRoutinePost({ doneId, label: routineLabel(reminder), title: capitalize(reminder.want), text: reminder.description ?? '' });
    router.dismissTo({ pathname: '/feed', params: { erstellen: '1' } });
  };

  const goal = reminder ? goalOf(reminder) : 0;
  const after = reminder ? Math.min(reminder.doneThisWeek + 1, goal) : 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <NavigationBar title="Erledigt" variant="back" onLeadingPress={goBack} />
      {reminder === undefined ? (
        <View style={styles.center}>
          <ActivityIndicator color={color.text.secondary} />
        </View>
      ) : reminder === null ? (
        <View style={styles.content}>
          <Notice variant="warning" message="Diese Erinnerung gibt es nicht mehr." />
        </View>
      ) : (
        <View style={[styles.center, { paddingBottom: insets.bottom + space[24] }]}>
          <KaterMessage
            mood="high"
            title={t('{want}: {after} von {goal}!', { want: capitalize(reminder.want), after, goal })}
            body={
              after >= goal
                ? // Ohne „Zeigst Du es den anderen?“: Der Kater drängt nicht zum Posten (Daria, 2026-11-14)
                  t('Wochenziel geschafft. Ich bin so stolz, ich muss mich kurz putzen.')
                : t('Du wolltest {want}, und Du hast es getan.', { want: reminder.want })
            }
            // Beide Knöpfe als eine Gruppe dicht beieinander (Daria, 2026-11-14)
            action={
              <View style={styles.buttons}>
                <Button label="Als Me-Challenge posten" icon="camera" busy={busy === 'post'} disabled={!!busy} onPress={() => finish(true)} />
                <Button label="Nur abhaken" variant="secondary" busy={busy === 'check'} disabled={!!busy} onPress={() => finish(false)} />
                {failed ? <Notice variant="warning" message="Abhaken hat nicht geklappt. Versuch es bitte noch einmal." /> : null}
              </View>
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  center: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: space[20], paddingTop: space[16] },
  buttons: { alignSelf: 'stretch', gap: space[8] },
});
