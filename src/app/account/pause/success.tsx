import { useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { ResultScreen } from '../../../components/Screen';
import { formatDateLong } from '../../../data/format';
import { useStore } from '../../../data/store';

/** Route `account/pause/success`. Figma: `account/pause/success`. */
export default function PauseSuccess() {
  const router = useRouter();
  const { profile, dispatch } = useStore();
  const until = profile.pausedUntil ? formatDateLong(profile.pausedUntil) : '';
  return (
    <ResultScreen
      title="Gute Erholung!"
      message={`Dein Konto ruht bis zum ${until}. Melde Dich einfach an, wenn Du früher zurück willst.`}
      actions={
        <Button
          label="Zum Start"
          onPress={() => {
            dispatch({ type: 'signOut' });
            router.dismissAll();
            router.replace('/onboarding/welcome');
          }}
        />
      }
    />
  );
}
