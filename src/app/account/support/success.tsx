import { useRouter } from 'expo-router';

import { ResultScreen } from '../../../components/Screen';
import { anrede } from '../../../data/format';
import { useStore } from '../../../data/store';

/** Route `account/support/success`. Figma: `account/support/success`. */
export default function SupportSuccess() {
  const router = useRouter();
  const { profile } = useStore();
  return (
    <ResultScreen
      title="Anfrage ist raus!"
      message={`Danke, ${anrede(profile)}. Wir melden uns per E-Mail bei Dir.`}
      onFeedPress={() => router.dismissTo('/feed')}
    />
  );
}
