import { useState } from 'react';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { SwitchRow } from '../../components/Form';
import { SubScreen } from '../../components/Screen';

/** Route `onboarding/kodex`. Figma: `onboarding/kodex`. Speichert später die drei Zeitstempel. */
export default function Kodex() {
  const router = useRouter();
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  return (
    <SubScreen
      title="Der Kodex"
      subtitle="Schritt 5 von 6"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={
        <Button
          label="Zustimmen und weiter"
          disabled={!(age && terms && privacy)}
          onPress={() => router.push('/onboarding/push')}
        />
      }
    >
      <KaterBubble>Noch das Kleingedruckte. Auch Piraten haben einen Kodex.</KaterBubble>
      <SwitchRow label="Ich bin mindestens 18 Jahre alt" description="Pflicht für Kiez Coins." value={age} onValueChange={setAge} />
      <SwitchRow label="Ich akzeptiere die AGB" description="AGB lesen" value={terms} onValueChange={setTerms} />
      <SwitchRow
        label="Ich habe die Datenschutzerklärung gelesen"
        description="Datenschutz lesen"
        value={privacy}
        onValueChange={setPrivacy}
      />
    </SubScreen>
  );
}
