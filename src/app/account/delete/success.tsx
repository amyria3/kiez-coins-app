import { useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { ResultScreen } from '../../../components/Screen';
import { anrede } from '../../../data/format';
import { useStore } from '../../../data/store';

/** Route `account/delete/success`. Figma: `account/delete/success`. */
export default function DeleteSuccess() {
  const router = useRouter();
  const { profile, dispatch } = useStore();
  return (
    <ResultScreen
      title="Konto gelöscht"
      message={`Mach’s gut, ${anrede(profile)}. Wenn Du zurückkommst, heuerst Du einfach neu an.`}
      actions={
        <Button
          label="Zum Start"
          onPress={() => {
            dispatch({ type: 'deleteAccount' });
            router.dismissAll();
            router.replace('/onboarding/welcome');
          }}
        />
      }
    />
  );
}
