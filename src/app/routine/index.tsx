import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavigationBar } from '../../components/NavigationBar';
import { RoutineContent } from '../../components/RoutineContent';
import { useRoutineEnabled } from '../../data/routine';
import { useGoBack } from '../../lib/goBack';
import { color, isFashionable, space } from '../../theme/tokens';

/**
 * Route `routine`. Die Routine ist ein Reiter im Feed (Daria, 2026-11-11): Oben steht der Umschalter, keine eigene
 * Kopfzeile. Die Seite leitet deshalb in den Feed weiter, z. B. nach „Neue Erinnerung“ ohne Verlauf.
 * Nur wo der Feed keinen Reiter „Routine“ hat (Look „Fashionable“), bleibt sie eine eigene Seite.
 */
export default function Routine() {
  const goBack = useGoBack();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inFeed = useRoutineEnabled() && !isFashionable;
  useEffect(() => {
    if (inFeed) router.dismissTo({ pathname: '/feed', params: { reiter: 'routine' } });
  }, [inFeed, router]);
  if (inFeed) return <View style={styles.screen} />;
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <NavigationBar title="Routine" variant="back" onLeadingPress={goBack} />
      <RoutineContent bottomPad={insets.bottom + space[24]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
});
