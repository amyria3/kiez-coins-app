import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavigationBar } from '../../components/NavigationBar';
import { RoutineContent } from '../../components/RoutineContent';
import { useGoBack } from '../../lib/goBack';
import { color, space } from '../../theme/tokens';

/**
 * Route `routine`: die Routine als eigene Seite, z. B. ohne Verlauf nach „Neue Erinnerung“.
 * Im Feed steht sie als Reiter „Routine“ links neben den anderen (components/RoutineContent.tsx).
 */
export default function Routine() {
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
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
