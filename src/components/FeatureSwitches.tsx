import { View } from 'react-native';

import { features, setFeature, useFeatures, type Feature } from '../data/features';
import { useStore } from '../data/store';
import { space } from '../theme/tokens';
import { SwitchRow } from './Form';

/** Schalter für Bild, We-Challenge und Gruppen (Onboarding und Dein Konto › Funktionen). Me-Challenge ist immer an. */
export function FeatureSwitches() {
  const { currentUserId } = useStore();
  const state = useFeatures();

  const change = (key: Feature, on: boolean) => {
    if (currentUserId) setFeature(currentUserId, key, on);
  };

  return (
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
  );
}
