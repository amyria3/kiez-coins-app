import { useState } from 'react';
import { Alert, DevSettings, View } from 'react-native';
import { router as appRouter, useRouter } from 'expo-router';

import { KaterBubble } from '../../components/Content';
import { RadioOption } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import {
  deviceLanguage,
  getLanguageChoice,
  languages,
  needsRestartForDirection,
  setLanguage,
  t,
  type Lang,
} from '../../data/texts';
import { space } from '../../theme/tokens';

/**
 * Route `account/sprache` (Dein Konto › Sprache). Standard ist die Sprache des Handys.
 * Arabisch und Hebräisch laufen von rechts nach links. Auf iOS und Android gilt die neue Richtung nach einem Neustart.
 */
export default function Sprache() {
  const router = useRouter();
  const [choice, setChoice] = useState<Lang | 'auto'>(getLanguageChoice());
  const device = languages.find((l) => l.code === deviceLanguage())?.name ?? 'Deutsch';

  const choose = async (next: Lang | 'auto') => {
    setChoice(next);
    await setLanguage(next);
    // Die Navigation baut sich in der neuen Sprache neu auf. Zurück auf diesen Screen.
    setTimeout(() => {
      appRouter.push('/account');
      appRouter.push('/account/sprache');
    }, 60);
    if (needsRestartForDirection()) {
      Alert.alert(t('Neustart nötig'), t('Die Schreibrichtung ändert sich nach einem Neustart der App.'), [
        { text: t('Später'), style: 'cancel' },
        { text: t('Jetzt neu starten'), onPress: () => (__DEV__ ? DevSettings.reload() : undefined) },
      ]);
    }
  };

  return (
    <SubScreen title="Sprache" navigation="back" onLeadingPress={() => router.back()}>
      <KaterBubble>In welcher Sprache soll ich mit Dir reden?</KaterBubble>
      <View style={{ gap: space[8] }}>
        <RadioOption label={t('Wie das Handy ({sprache})', { sprache: device })} selected={choice === 'auto'} onPress={() => choose('auto')} />
        {languages.map((l) => (
          <RadioOption key={l.code} label={l.name} selected={choice === l.code} onPress={() => choose(l.code)} />
        ))}
      </View>
    </SubScreen>
  );
}
