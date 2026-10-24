import { View } from 'react-native';

import { KaterBubble } from '../../components/Content';
import { SwitchRow } from '../../components/Form';
import { explain } from '../../components/Nudge';
import { SubScreen } from '../../components/Screen';
import { features, setFeature, useFeatures } from '../../data/features';
import { useStore } from '../../data/store';
import { t } from '../../data/texts';
import { space } from '../../theme/tokens';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `account/funktionen` (Dein Konto › Funktionen): Me-Challenge, Bild, We-Challenge und Gruppen
 * an- und abschalten (Daria, 24.10.2026). Abschalten blendet das Erstellen aus, der Feed bleibt gleich.
 */
export default function FeaturesScreen() {
  const goBack = useGoBack();
  const { currentUserId } = useStore();
  const state = useFeatures();

  const change = (key: (typeof features)[number]['key'], on: boolean) => {
    if (!currentUserId) return;
    if (!setFeature(currentUserId, state, key, on)) {
      explain(t('Eins bleibt an'), t('Mindestens eine Art zu posten bleibt an: Me-Challenge, Bild oder We-Challenge.'));
    }
  };

  return (
    <SubScreen title="Funktionen" navigation="back" onLeadingPress={goBack}>
      <KaterBubble>Schalte nur an, was Du gerade brauchst. Den Rest holst Du Dir dazu, wann Du willst.</KaterBubble>
      <View style={{ gap: space[8] }}>
        {features.map((f) => (
          <SwitchRow
            key={f.key}
            label={f.label}
            description={f.description}
            value={state[f.key]}
            onValueChange={(on) => change(f.key, on)}
          />
        ))}
      </View>
    </SubScreen>
  );
}
