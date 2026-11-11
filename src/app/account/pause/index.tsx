import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { KaterCard, Notice, QuestionHint } from '../../../components/Content';
import { SubScreen } from '../../../components/Screen';
import { hasOpenWork } from '../../../data/openWork';
import { useStore } from '../../../data/store';
import { useGoBack } from '../../../lib/goBack';

const OPEN_WORK = 'Offene Challenges und Coins musst Du vorher abschließen oder abgeben.';

/** Route `account/pause`. Figma: `account/pause`. Pause für 3 Monate, Anmelden hebt sie auf. */
export default function Pause() {
  const router = useRouter();
  const goBack = useGoBack();
  const { challenges, currentUserId, dispatch } = useStore();

  const pause = () => {
    if (hasOpenWork(challenges, currentUserId)) {
      Alert.alert('Noch nicht möglich', OPEN_WORK);
      return;
    }
    const until = new Date();
    until.setMonth(until.getMonth() + 3);
    dispatch({ type: 'updateProfile', patch: { pausedUntil: until.toISOString() } });
    router.replace('/account/pause/success');
  };

  return (
    <SubScreen
      title="Konto pausieren"
      navigation="back"
      onLeadingPress={goBack}
      actions={
        <>
          <Button label="3 Monate pausieren" onPress={pause} />
          <Button label="Abbrechen" variant="secondary" onPress={() => goBack()} />
        </>
      }
    >
      <KaterCard>Mal Landurlaub? Verständlich. Ich halt hier so lange die Stellung.</KaterCard>
      {/* Wie im Chat: erst der Hinweis, der immer dasteht, dann die Frage, dann die Antwort (Daria, 2026-11-09) */}
      <Notice variant="warning" message={OPEN_WORK} />
      <QuestionHint
        question="Was passiert beim Pausieren?"
        answer="Dein Profil ist 3 Monate lang unsichtbar, und Du bekommst keine Push-Nachrichten. Danach ist Dein Konto von selbst wieder aktiv. Meldest Du Dich vorher an, bist Du sofort zurück."
      />
    </SubScreen>
  );
}
