import { useState } from 'react';
import { View } from 'react-native';

import { KaterBubble } from '../../components/Content';
import { RadioOption } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { t } from '../../data/texts';
import { look, looks, setLook, type Look } from '../../theme/look';
import { space } from '../../theme/tokens';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `account/look` (Dein Konto › Look). Ein Wechsel lädt die App neu.
 * Direkt-Link mit vorgewähltem Look: `/app/?look=fashionable`.
 */
export default function LookScreen() {
  const goBack = useGoBack();
  const [choice, setChoice] = useState<Look>(look);

  const choose = (next: Look) => {
    setChoice(next);
    if (next !== look) setLook(next);
  };

  return (
    <SubScreen title="Look" navigation="back" onLeadingPress={goBack}>
      <KaterBubble>Wie soll Kiez Coins für Dich aussehen?</KaterBubble>
      <View style={{ gap: space[8] }}>
        {looks.map((l) => (
          <RadioOption
            key={l.code}
            label={t('{name} – {description}', { name: l.name, description: t(l.description) })}
            selected={choice === l.code}
            onPress={() => choose(l.code)}
          />
        ))}
      </View>
    </SubScreen>
  );
}
