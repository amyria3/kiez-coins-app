import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KaterMessage } from '../components/KaterMessage';
import { NavigationBar } from '../components/NavigationBar';
import { useGoBack } from '../lib/goBack';
import { color, space } from '../theme/tokens';

/**
 * Route `routine` (Daria, 2026-11-09): Hier entstehen die Erinnerungen und Gewohnheiten. Erreichbar über den Knopf
 * „Routine“ links neben den Reitern im Feed, vorerst nur für Moderatorinnen (useRoutineEnabled).
 * Offene Fragen und Entwürfe: Übergabe/2026-11-07_offen_erinnerungen.md.
 */
export default function Routine() {
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <NavigationBar title="Routine" variant="back" onLeadingPress={goBack} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[24] }]}>
        <KaterMessage title="Hier entstehen Deine Erinnerungen" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  content: { flexGrow: 1, justifyContent: 'center' },
});
