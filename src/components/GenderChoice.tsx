import { View } from 'react-native';

import { FieldGroup } from './Content';
import { RadioOption } from './Form';
import { Text } from './T';
import { genders } from '../data/format';
import type { Gender } from '../data/types';
import { color, space, text } from '../theme/tokens';
import { t } from '../data/texts';

/**
 * Auswahl „er“, „sie“ oder „unbestimmt (Person)“ (Daria, 24.10.2026). Steht im Onboarding auf der Seite
 * „Ansprache“ und unter Dein Konto › Grammatisches Geschlecht.
 */
export function GenderChoice({ value, onChange }: { value: Gender; onChange: (g: Gender) => void }) {
  return (
    <FieldGroup label="Grammatisches Geschlecht">
      <View style={{ gap: space[8] }}>
        {genders.map((g) => (
          <RadioOption key={g.key} label={t(g.label)} selected={value === g.key} onPress={() => onChange(g.key)} />
        ))}
      </View>
      <Text style={{ ...text.caption, color: color.text.secondary }}>
        Danach richten sich Wörter wie „Initiator“, „Initiatorin“ oder „Initiator:in“. Andere sehen Deine Wahl nur an diesen Wörtern.
      </Text>
    </FieldGroup>
  );
}
