import { useState } from 'react';
import { View } from 'react-native';

import { Notice } from '../../components/Content';
import { RadioOption } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { t } from '../../data/texts';
import { look, looks, setLook, type Look } from '../../theme/look';
import { space } from '../../theme/tokens';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `account/look` (Dein Konto › Look, Daria, 2026-11-25): Kiez, Light-Modus oder Mono. Ein Wechsel startet die
 * App neu, da die Farben beim Start feststehen. Im Web wählt der Link `?look=light` (oder `mono`, `kiez`) vor.
 */
export default function LookScreen() {
  const goBack = useGoBack();
  const [choice, setChoice] = useState<Look>(look);

  const choose = (next: Look) => {
    setChoice(next);
    if (next !== look) void setLook(next);
  };

  return (
    <SubScreen title="Look" navigation="back" onLeadingPress={goBack}>
      <Notice message="Wie soll KiezCoins für Dich aussehen? Nach dem Wechsel startet die App neu." />
      <View style={{ gap: space[8] }}>
        {looks.map((l) => (
          <RadioOption
            key={l.code}
            label={t('{name} – {description}', { name: t(l.name), description: t(l.description) })}
            selected={choice === l.code}
            onPress={() => choose(l.code)}
          />
        ))}
      </View>
    </SubScreen>
  );
}
