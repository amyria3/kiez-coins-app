import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { RadioOption, TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { addressForms } from '../../data/format';
import { useStore } from '../../data/store';
import type { AddressForm } from '../../data/types';
import { space } from '../../theme/tokens';

/** Route `onboarding/ansprache`. Figma: `onboarding/ansprache`. Privat, nur für Kater-Texte. */
export default function Ansprache() {
  const router = useRouter();
  const { profile, dispatch } = useStore();
  const [form, setForm] = useState<AddressForm | undefined>(profile.addressForm ?? 'pirat_star');
  const [custom, setCustom] = useState(profile.addressCustom ?? '');
  const usesCustom = custom.trim().length > 0;

  const save = (addressForm?: AddressForm) => {
    dispatch({
      type: 'updateProfile',
      patch: usesCustom && addressForm ? { addressForm: 'custom', addressCustom: custom.trim() } : { addressForm, addressCustom: undefined },
    });
    router.push('/onboarding/kiez');
  };

  return (
    <SubScreen
      title="Ansprache"
      subtitle="Schritt 3 von 6"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={
        <>
          <Button label="Weiter" onPress={() => save(form)} disabled={!form && !usesCustom} />
          <Button label="Ist mir egal" variant="secondary" onPress={() => save(undefined)} />
        </>
      }
    >
      <KaterBubble>Kommunikation ist alles. Wie spreche ich Dich an, Darling?</KaterBubble>
      <View style={{ gap: space[8] }}>
        {addressForms.map((f) => (
          <RadioOption
            key={f.key}
            label={f.label}
            selected={!usesCustom && form === f.key}
            onPress={() => {
              setForm(f.key);
              setCustom('');
            }}
          />
        ))}
      </View>
      <TextField
        label="Oder eigene Bezeichnung (nur für uns zwei, nicht öffentlich)"
        helperText="Zum Beispiel Seebär:in. Sobald Du tippst, gilt Deine Bezeichnung statt der Auswahl oben."
        value={custom}
        onChangeText={(v) => {
          setCustom(v);
          if (v.trim()) setForm('custom');
        }}
        maxLength={30}
      />
    </SubScreen>
  );
}
