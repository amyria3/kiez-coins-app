import { useState } from 'react';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble, Notice } from '../../components/Content';
import { SwitchRow } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useStore } from '../../data/store';
import { NudgeArea, useNudge } from '../../components/Nudge';
import { t } from '../../data/texts';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `onboarding/code-of-conduct`. Figma: `onboarding/kodex`. Speichert die drei Zeitstempel der Zustimmung.
 * Die Texte stehen unter `rechtliches/bedingungen`, `rechtliches/regeln` und `rechtliches/datenschutz` (Stand in `data/legal.ts`).
 */
export default function Kodex() {
  const router = useRouter();
  const goBack = useGoBack();
  const { dispatch } = useStore();
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  // Teil der Nutzungsbedingungen, Zustimmung zählt zu termsAcceptedAt
  const [rules, setRules] = useState(false);
  const consent = useNudge();

  return (
    <SubScreen
      title="Wertekodex"
      subtitle="Schritt 4 von 5"
      navigation="back"
      onLeadingPress={goBack}
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
            router.push('/onboarding/features');
          }}
        />
      }
    >
      <KaterBubble>Noch das Kleingedruckte.</KaterBubble>
      <Notice message="Die KiezCoins App ist momentan eine kostenlose Testversion. Einige Funktionen können sich ändern. Am Ende der Testphase setzen wir Daten zurück. Das kündigen wir vorher per E-Mail an." />
      <NudgeArea nudge={consent}>
      <SwitchRow required label="Ich bin mindestens 18 Jahre alt" value={age} onValueChange={setAge} />
      <SwitchRow
        required
        label="Ich akzeptiere die Nutzungsbedingungen für die Testphase"
        description="Bedingungen lesen"
        onDescriptionPress={() => router.push('/legal/bedingungen')}
        value={terms}
        onValueChange={setTerms}
      />
      <SwitchRow
        required
        label="Ich halte mich an die Community-Regeln"
        description="Regeln lesen"
        onDescriptionPress={() => router.push('/legal/regeln')}
        value={rules}
        onValueChange={setRules}
      />
      <SwitchRow
        required
        label="Ich habe die Datenschutzerklärung gelesen"
        description="Datenschutz lesen"
        onDescriptionPress={() => router.push('/legal/datenschutz')}
        value={privacy}
        onValueChange={setPrivacy}
      />
      </NudgeArea>
    </SubScreen>
  );
}
