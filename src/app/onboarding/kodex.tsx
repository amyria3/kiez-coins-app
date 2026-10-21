import { useState } from 'react';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble, Notice } from '../../components/Content';
import { SwitchRow } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useStore } from '../../data/store';
import { NudgeArea, useNudge } from '../../components/Nudge';
import { t } from '../../data/texts';

/**
 * Route `onboarding/kodex`. Figma: `onboarding/kodex`. Speichert die drei Zeitstempel der Zustimmung.
 * Die Texte stehen unter `rechtliches/bedingungen`, `rechtliches/regeln` und `rechtliches/datenschutz` (Stand in `data/legal.ts`).
 */
export default function Kodex() {
  const router = useRouter();
  const { dispatch } = useStore();
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  // Teil der Nutzungsbedingungen, Zustimmung zählt zu termsAcceptedAt
  const [rules, setRules] = useState(false);
  const consent = useNudge();

  return (
    <SubScreen
      title="Der Kodex"
      subtitle="Schritt 5 von 6"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={
        <Button
          label="Zustimmen und weiter"
          disabled={!(age && terms && rules && privacy)}
          whyDisabled={() =>
            consent.nudge(
              t('Noch offen: {liste}.', { liste: [
                !age && t('18 Jahre'),
                !terms && t('Nutzungsbedingungen'),
                !rules && t('Community-Regeln'),
                !privacy && t('Datenschutz'),
              ]
                .filter(Boolean)
                .join(', ') }),
            )
          }
          onPress={() => {
            const now = new Date().toISOString();
            dispatch({
              type: 'updateProfile',
              patch: { ageConfirmedAt: now, termsAcceptedAt: now, privacyAcceptedAt: now },
            });
            router.push('/onboarding/push');
          }}
        />
      }
    >
      <KaterBubble>Noch das Kleingedruckte. Auch Piraten haben einen Kodex.</KaterBubble>
      <Notice message="Kiez Coins ist eine kostenlose Testversion. Funktionen können sich ändern. Am Ende der Testphase setzen wir Daten eventuell zurück. Das kündigen wir vorher per E-Mail an." />
      <NudgeArea nudge={consent}>
      <SwitchRow required label="Ich bin mindestens 18 Jahre alt" value={age} onValueChange={setAge} />
      <SwitchRow
        required
        label="Ich akzeptiere die Nutzungsbedingungen für die Testphase"
        description="Bedingungen lesen"
        onDescriptionPress={() => router.push('/rechtliches/bedingungen')}
        value={terms}
        onValueChange={setTerms}
      />
      <SwitchRow
        required
        label="Ich halte mich an die Community-Regeln"
        description="Regeln lesen"
        onDescriptionPress={() => router.push('/rechtliches/regeln')}
        value={rules}
        onValueChange={setRules}
      />
      <SwitchRow
        required
        label="Ich habe die Datenschutzerklärung gelesen"
        description="Datenschutz lesen"
        onDescriptionPress={() => router.push('/rechtliches/datenschutz')}
        value={privacy}
        onValueChange={setPrivacy}
      />
      </NudgeArea>
    </SubScreen>
  );
}
