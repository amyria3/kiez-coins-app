import { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useStore } from '../../data/store';

/**
 * Route `onboarding/code`. Figma: `onboarding/code`. Im Prototyp wird kein Code verschickt,
 * jede 6-stellige Zahl passt. Später: Supabase Auth, E-Mail-OTP (6 Ziffern, 10 Min.).
 */
export default function Code() {
  const router = useRouter();
  const { existing } = useLocalSearchParams<{ existing?: string }>();
  const { profile, dispatch } = useStore();
  const [code, setCode] = useState('');
  const digits = code.replace(/\D/g, '');

  const confirm = () => {
    if (existing) {
      // „Ich hab schon ein Konto“: Profil aus den Beispieldaten, direkt in den Feed
      dispatch({
        type: 'updateProfile',
        patch: { handle: profile.handle || 'Käpt’n Kompost', addressForm: profile.addressForm ?? 'pirat_star', kiez: 'Schönefeld, Leipzig', onboarded: true },
      });
      router.dismissAll();
      router.replace('/feed');
      return;
    }
    router.push('/onboarding/deckname');
  };

  return (
    <SubScreen
      title="Anmelden"
      subtitle="Schritt 1 von 6"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={
        <>
          <Button label="Bestätigen" onPress={confirm} disabled={digits.length !== 6} />
          <Button
            label="Code neu senden"
            variant="secondary"
            onPress={() => Alert.alert('Code neu gesendet', `Schau in Dein Postfach: ${profile.email}`)}
          />
        </>
      }
    >
      <KaterBubble>Der Code ist unterwegs! Schau in Dein Postfach, zur Not auch im Spam-Netz.</KaterBubble>
      <TextField
        label="Code aus der E-Mail"
        helperText={`Gesendet an ${profile.email}. Gilt 10 Minuten.`}
        value={digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        autoFocus
      />
    </SubScreen>
  );
}
