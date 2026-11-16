import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { KaterMessage } from '../../components/KaterMessage';
import { NavigationBar } from '../../components/NavigationBar';
import { Notice } from '../../components/Content';
import { capitalize, finishStartedPost, goalOf, loadReminders, markReminderDone, setRoutinePost, type Reminder } from '../../data/reminders';
import { t } from '../../data/texts';
import { useGoBack } from '../../lib/goBack';
import { color, space } from '../../theme/tokens';

/**
 * Route `routine/[id]` (Daria, 2026-11-10): Erledigt melden.
 * Seit 2026-11-16 (Daria): „Starten (mit Post)“ postet das Vorher einer Me-Challenge mit Titel und Beschreibung,
 * ohne abzuhaken. Danach steht hier „Fertig – mit Post“: Es hakt ab, hängt die Erledigung an die Me-Challenge und
 * öffnet das Nachher. „Nur abhaken“ geht immer. Den Strich für die Woche gibt es erst mit Fertig oder Abhaken.
 */
/** Gehört zu „Me & Myself“: gelb wie die Routine (Daria, 2026-11-13) */
export default function ReminderDoneScreen() {
  // Theme Happy kommt zentral über die Route (RouteSpace)
  return <ReminderDone />;
}

function ReminderDone() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reminder, setReminder] = useState<Reminder | null | undefined>(undefined);
  const [busy, setBusy] = useState<'start' | 'post' | 'check' | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadReminders().then((all) => setReminder(all?.find((r) => r.id === id) ?? null), () => setReminder(null));
  }, [id]);

  // Starten: Vorher posten, noch nicht abhaken. Das Erstellen-Blatt öffnet sich als Me-Challenge.
  const start = () => {
    if (!reminder) return;
    setBusy('start');
    setRoutinePost({ startReminderId: reminder.id, label: '', title: capitalize(reminder.want), text: reminder.description ?? '' });
    router.dismissTo({ pathname: '/feed', params: { erstellen: '1' } });
  };

  const finish = async (post: boolean) => {
    if (!reminder) return;
    setBusy(post ? 'post' : 'check');
    setFailed(false);
    const doneId = await markReminderDone(reminder.id);
    if (!doneId) {
      setBusy(null);
      return setFailed(true);
    }
    if (!post || !reminder.startedChallengeId) {
      setBusy(null);
      return router.back();
    }
    await finishStartedPost(reminder, doneId);
    setBusy(null);
    router.replace({ pathname: '/before-after/[id]', params: { id: reminder.startedChallengeId, schritt: 'nachher' } });
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
                {/* „Fertig – mit Post“ nur, wenn mit „Starten“ schon ein Vorher steht (Daria, 2026-11-16) */}
                {reminder.startedChallengeId ? (
                  <Button label="Fertig – mit Post" icon="camera" busy={busy === 'post'} disabled={!!busy} onPress={() => finish(true)} />
                ) : (
                  <Button label="Starten (mit Post)" icon="camera" busy={busy === 'start'} disabled={!!busy} onPress={start} />
                )}
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
