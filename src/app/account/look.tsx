import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';

import { KaterBubble } from '../../components/Content';
import { RadioOption } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { t } from '../../data/texts';
import { look, saveLook } from '../../theme/look';
import { looks, type Look } from '../../theme/lookTypes';
import { space } from '../../theme/tokens';

/**
 * Route `account/look` (Dein Konto › Look): „Nachtschicht“ oder „Insta“ (Daria, 23.10.2026).
 * Die Web-App lädt sofort neu. iOS und Android zeigen den neuen Look nach dem nächsten Start.
 */
export default function LookScreen() {
  const router = useRouter();
  const [choice, setChoice] = useState<Look>(look);

  const choose = (next: Look) => {
    if (next === choice) return;
    setChoice(next);
    const { reloaded } = saveLook(next);
    if (!reloaded) {
      Alert.alert(t('Neuer Look gespeichert'), t('Schließ die App einmal ganz und öffne sie neu. So siehst Du den neuen Look.'));
    }
  };

  return (
    <SubScreen title="Look" navigation="back" onLeadingPress={() => router.back()}>
      <KaterBubble>Wie soll Kiez Coins aussehen?</KaterBubble>
      <View style={{ gap: space[8] }}>
        {looks.map((l) => (
          <RadioOption key={l.key} label={`${t(l.label)} – ${t(l.description)}`} selected={choice === l.key} onPress={() => choose(l.key)} />
        ))}
      </View>
    </SubScreen>
  );
}
