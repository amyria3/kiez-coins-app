import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { KaterCard } from './Content';
import { katerFocus, katerLine } from '../data/katerRoutine';
import { dueToday, loadReminders, nudgeAllowed } from '../data/reminders';
import { t } from '../data/texts';
import { space } from '../theme/tokens';

/**
 * Kater erinnert im Feed (Daria, 2026-11-10): vorerst nur in der App, zwischen 8 und 20 Uhr höchstens dreimal am Tag
 * (data/reminders.ts, nudgeAllowed). Nur, wenn heute etwas fällig ist. Ein Tipp öffnet die Routine.
 */
/** `onOpen`: öffnet die Routine an Ort und Stelle, z. B. als Reiter im Feed; sonst die Seite `routine` */
export function RoutineNudge({ enabled, onOpen }: { enabled: boolean; onOpen?: () => void }) {
  const router = useRouter();
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      const list = await loadReminders();
      const due = (list ?? []).filter((r) => dueToday(r));
      const focus = due.length ? katerFocus(due) : undefined;
      if (!alive || !focus || !(await nudgeAllowed(true))) return;
      if (alive) setLine(katerLine(focus));
    })().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [enabled]);
  if (!line) return null;
  return (
    // Als Sprechblase des Katers statt als Karte (Entwurf, Daria, 2026-11-11)
    <View style={styles.wrap}>
      <KaterCard accessibilityHint={t('Öffnet Deine Routine')} onPress={onOpen ?? (() => router.push('/routine'))} onClose={() => setLine(null)}>
        {line}
      </KaterCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space[16] },
});
