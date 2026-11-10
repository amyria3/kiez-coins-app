import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { KaterCard } from './Content';
import { IconButton } from './IconButton';
import { katerFocus, katerLine } from '../data/katerRoutine';
import { dueToday, loadReminders, nudgeAllowed } from '../data/reminders';
import { t } from '../data/texts';
import { color, space } from '../theme/tokens';

/**
 * Kater erinnert im Feed (Daria, 2026-11-10): vorerst nur in der App, zwischen 8 und 20 Uhr höchstens dreimal am Tag
 * (data/reminders.ts, nudgeAllowed). Nur, wenn heute etwas fällig ist. Ein Tipp öffnet die Routine.
 */
export function RoutineNudge({ enabled }: { enabled: boolean }) {
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
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" accessibilityHint={t('Öffnet Deine Routine')} onPress={() => router.push('/routine')}>
        <KaterCard>{line}</KaterCard>
      </Pressable>
      <IconButton icon="close" iconSize={14} iconColor={color.text.secondary} accessibilityLabel={t('Hinweis schließen')} onPress={() => setLine(null)} style={styles.close} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space[16] },
  close: { position: 'absolute', top: 0, right: space[16] },
});
