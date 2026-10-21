import { useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { ResultScreen } from '../../../components/Screen';
import { formatDateLong } from '../../../data/format';
import { useAuth } from '../../../data/auth';
import { useStore } from '../../../data/store';
import { t } from '../../../data/texts';

/** Route `account/pause/success`. Figma: `account/pause/success`. */
export default function PauseSuccess() {
  const router = useRouter();
  const { profile } = useStore();
  const { signOut } = useAuth();
  const until = profile.pausedUntil ? formatDateLong(profile.pausedUntil) : '';
  return (
    <ResultScreen
      title="Gute Erholung!"
      message={t('Dein Konto ruht bis zum {until}. Melde Dich einfach an, wenn Du früher zurück willst.', { until })}
      actions={
        <Button
          label="Zum Start"
          onPress={async () => {
            await signOut();
            router.dismissAll();
            router.replace('/onboarding/welcome');
          }}
        />
      }
    />
  );
}
