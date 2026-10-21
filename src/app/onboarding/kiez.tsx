import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from '../../components/T';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { InfoRow, KaterBubble, Notice } from '../../components/Content';
import { TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { anrede } from '../../data/format';
import { findPlace, LocationDenied, postalCodeOf } from '../../data/location';
import { useStore } from '../../data/store';
import { color, text } from '../../theme/tokens';
import { t } from '../../data/texts';
import { useNudge } from '../../components/Nudge';

type Step = 'start' | 'searching' | 'found' | 'manual';

/**
 * Route `onboarding/kiez`. Figma: `onboarding/kiez`.
 * Der Standort wird einmal grob abgefragt und auf dem Gerät in Ortsteil, Postleitzahl und Stadt umgewandelt.
 * Gespeichert wird nur dieser Kiez. Aus dem Konto (`from=app`) lässt er sich jederzeit neu bestimmen.
 */
export default function Kiez() {
  const router = useRouter();
  /** `from=app`: aus der App heraus aufgerufen, danach zurück statt weiter im Onboarding */
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { profile, dispatch } = useStore();
  const [step, setStep] = useState<Step>('start');
  const [found, setFound] = useState('');
  const [manual, setManual] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const manualField = useNudge();

  const next = (kiez?: string) => {
    dispatch({ type: 'updateProfile', patch: { kiez } });
    if (from) router.back();
    else router.push('/onboarding/kodex');
  };

  const locate = async () => {
    setStep('searching');
    setProblem(null);
    try {
      const place = await findPlace();
      setFound(place.kiez);
      setStep('found');
    } catch (error) {
      setProblem(
        error instanceof LocationDenied
          ? 'Ohne Freigabe finde ich Deinen Kiez nicht. Gib ihn von Hand ein oder erlaube den Standort in den Einstellungen.'
          : 'Ich habe Deinen Kiez gerade nicht gefunden. Versuch es noch einmal oder gib ihn von Hand ein.',
      );
      setStep('manual');
    }
  };

  const manualValid = !!postalCodeOf(manual) && manual.trim().length >= 7;

  const actions =
    step === 'found' ? (
      <>
        <Button label="Diesen Kiez übernehmen" onPress={() => next(found)} />
        <Button label="Stimmt nicht, von Hand eingeben" variant="ghost" onPress={() => setStep('manual')} />
      </>
    ) : step === 'manual' ? (
      <>
        <Button label="Kiez übernehmen" onPress={() => next(manual.trim())} disabled={!manualValid}
          whyDisabled={() => manualField.nudge('Mit Postleitzahl, zum Beispiel „Alt-West, 04177 Leipzig“.')}
        />
        <Button label="Standort noch einmal suchen" variant="ghost" onPress={locate} />
      </>
    ) : (
      <>
        <Button busy={step === 'searching'}
          label={step === 'searching' ? 'Suche Deinen Kiez …' : 'Standort verwenden'}
          onPress={locate}
          disabled={step === 'searching'}
        />
        {from ? null : <Button label="Später festlegen" variant="ghost" onPress={() => next(undefined)} />}
      </>
    );

  return (
    <SubScreen
      title="Dein Kiez"
      subtitle={from ? undefined : 'Schritt 4 von 6'}
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={actions}
    >
      <KaterBubble>
        {step === 'found'
          ? t('Ahoi, {anrede}! Ist das Dein Heimathafen?', { anrede: anrede(profile) })
          : t('Ahoi, {anrede}! Wo liegt Dein Heimathafen? Am besten fragst Du, wenn Du zu Hause bist.', {
              anrede: anrede(profile),
            })}
      </KaterBubble>
      {from && profile.kiez ? <InfoRow icon="map-pin" value={t('Bisher: {kiez}', { kiez: profile.kiez })} /> : null}
      {step === 'found' ? <InfoRow icon="map-pin" value={found} /> : null}
      {step === 'manual' ? (
        <>
          {problem ? <Text style={styles.problem}>{problem}</Text> : null}
          <TextField
            label="Ortsteil, Postleitzahl und Ort" required
        nudge={manualField}
            helperText="Zum Beispiel „Prenzlauer Berg, 10437 Berlin“. Die Postleitzahl braucht es."
            value={manual}
            onChangeText={setManual}
            maxLength={80}
          />
        </>
      ) : null}
      <Notice message="Wir speichern nur den Kiez, nicht Deinen genauen Standort. Ohne Kiez kannst Du lesen, aber nichts schreiben, erstellen oder annehmen, und Namen bleiben verdeckt." />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  problem: { ...text.body, color: color.accent.signal },
});
