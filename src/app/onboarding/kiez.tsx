import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { InfoRow, KaterBubble, Notice } from '../../components/Content';
import { SwitchRow } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { anrede } from '../../data/format';
import { useStore } from '../../data/store';

// Im Prototyp ohne Standortabfrage. Später: expo-location einmal abfragen, serverseitig auf den Kiez abbilden.
const FOUND_KIEZ = 'Schönefeld, Leipzig';

/** Route `onboarding/kiez`. Figma: `onboarding/kiez` (Schalter an und aus). Gespeichert wird nur der Kiez. */
export default function Kiez() {
  const router = useRouter();
  /** `from=app`: aus der App heraus aufgerufen (Kiez fehlt), danach zurück statt weiter im Onboarding */
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { profile, dispatch } = useStore();
  const [atHome, setAtHome] = useState(true);

  const next = (kiez?: string) => {
    dispatch({ type: 'updateProfile', patch: { kiez } });
    if (from) router.back();
    else router.push('/onboarding/kodex');
  };

  return (
    <SubScreen
      title="Dein Kiez"
      subtitle={from ? undefined : 'Schritt 4 von 6'}
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={
        <>
          <Button label="Standort verwenden" onPress={() => next(FOUND_KIEZ)} disabled={!atHome} />
          <Button label="Später festlegen" variant="secondary" onPress={() => next(undefined)} />
        </>
      }
    >
      <KaterBubble>Ahoi, {anrede(profile)}! Wo liegt Dein Heimathafen?</KaterBubble>
      <SwitchRow label="Ich bin gerade hier und hier zu hause." value={atHome} onValueChange={setAtHome} />
      <InfoRow icon="map-pin" value={`Gefunden: ${FOUND_KIEZ}`} />
      <Notice message="Wir speichern nur den Kiez, nicht Deinen genauen Standort. Nicht zu hause? Schau Dich erstmal um." />
    </SubScreen>
  );
}
