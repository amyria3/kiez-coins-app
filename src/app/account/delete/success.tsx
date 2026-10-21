import { useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { ResultScreen } from '../../../components/Screen';
import { anrede } from '../../../data/format';
import { useAuth } from '../../../data/auth';
import { useStore } from '../../../data/store';
import { t } from '../../../data/texts';

/** Route `account/delete/success`. Figma: `account/delete/success`. */
export default function DeleteSuccess() {
  const router = useRouter();
  const { profile, dispatch } = useStore();
  const { signOut } = useAuth();
  return (
    <ResultScreen
      title="Konto gelöscht"
      message={t('Mach’s gut, {anrede}. Wenn Du zurückkommst, heuerst Du einfach neu an.', { anrede: anrede(profile) })}
      actions={
        <Button
          label="Zum Start"
          onPress={async () => {
            dispatch({ type: 'deleteAccount' });
            await signOut();
            router.dismissAll();
            router.replace('/onboarding/welcome');
          }}
        />
      }
    />
  );
}
