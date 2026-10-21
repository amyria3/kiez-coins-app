import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { KaterBubble, Notice } from '../../../components/Content';
import { SubScreen } from '../../../components/Screen';
import { hasOpenWork } from '../../../data/openWork';
import { useStore } from '../../../data/store';

const OPEN_WORK = 'Offene Challenges und Coins musst Du vorher abschließen oder abgeben.';

/** Route `account/pause`. Figma: `account/pause`. Pause für 3 Monate, Anmelden hebt sie auf. */
export default function Pause() {
  const router = useRouter();
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
      onLeadingPress={() => router.back()}
      actions={
        <>
          <Button label="3 Monate pausieren" onPress={pause} />
          <Button label="Abbrechen" variant="secondary" onPress={() => router.back()} />
        </>
      }
    >
      <KaterBubble>Mal Landurlaub? Verständlich. Ich halt hier so lange die Stellung.</KaterBubble>
      <Notice message="Für 3 Monate ist Dein Profil unsichtbar und Du bekommst keine Push-Nachrichten. Danach ist Dein Konto automatisch wieder aktiv. Früher zurück geht jederzeit, indem Du Dich anmeldest." />
      <Notice variant="warning" message={OPEN_WORK} />
    </SubScreen>
  );
}
