import { useState } from 'react';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { SwitchRow } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useStore } from '../../data/store';
import { homeAfterOnboarding } from '../../data/pendingInvite';

/**
 * Route `onboarding/push`. Figma: `onboarding/push`. Optional.
 * Später: Systemdialog von expo-notifications erst nach „Erlauben“.
 */
export default function Push() {
  const router = useRouter();
  const { dispatch } = useStore();
  const [push, setPush] = useState(true);

  const finish = async (allow: boolean) => {
    dispatch({ type: 'updateProfile', patch: { push: allow && push, onboarded: true } });
    const target = await homeAfterOnboarding();
    router.dismissAll();
    // Erst die Begrüßung mit den Hauptfunktionen, danach ans Ziel (Daria, 22.10.2026)
    router.replace({ pathname: '/tour', params: { next: target } });
  };

  return (
    <SubScreen
      title="Nachrichten"
      subtitle="Schritt 6 von 6"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={
        <>
          <Button label="Erlauben" onPress={() => finish(true)} />
          <Button label="Lieber nicht" variant="secondary" onPress={() => finish(false)} />
        </>
      }
    >
      <KaterBubble>Stay in touch.</KaterBubble>
      <SwitchRow
        label="Push-Nachrichten"
        description="Ich möchte bei Kommentaren, Antworten und Bestätigungen benachrichtigt werden. Ich kann diese Einstellungen jederzeit ändern."
        value={push}
        onValueChange={setPush}
      />
    </SubScreen>
  );
}
