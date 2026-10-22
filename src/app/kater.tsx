import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { KaterStage } from '../components/KaterStage';
import { NavigationBar } from '../components/NavigationBar';
import { useKater } from '../components/useKater';
import { useAppDimensions } from '../theme/layout';
import { color, space } from '../theme/tokens';

/** Route `kater`: dem Kater Hallo sagen. Er fegt, winkt, schiebt die Brille runter und klopft Sprüche. */
export default function Kater() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useAppDimensions();
  const kater = useKater(null);
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <NavigationBar title="Der Kater" variant="back" onLeadingPress={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[24] }]}>
        <KaterStage
          width={Math.min(width * 0.78, 340)}
          spruch={kater.spruch ?? { text: 'Psst. Sag mal Hallo.', aktion: 'brille' }}
          take={kater.take}
          onPress={kater.noch}
        />
        <View style={styles.buttons}>
          <Button label="Hallo sagen" icon="wir-schaffen-das" onPress={kater.hallo} />
          <Button label="Noch ein Spruch" variant="secondary" onPress={kater.noch} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: space[24], paddingHorizontal: space[20] },
  buttons: { alignSelf: 'stretch', gap: space[8] },
});
