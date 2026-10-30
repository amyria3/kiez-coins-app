import { useState } from 'react';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { SwitchRow } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useStore } from '../../data/store';
import { homeAfterOnboarding } from '../../data/pendingInvite';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `onboarding/push`. Figma: `onboarding/push`. Optional.
 * Ausgeblendet seit 28.10.2026 (Daria): `onboarding/funktionen` beendet das Onboarding. Zum Einblenden dort wieder
 * auf diese Route weiterleiten und die Schrittzahlen auf „von 7“ setzen.
 * Später: Systemdialog von expo-notifications erst nach „Erlauben“.
 */
export default function Push() {
  const router = useRouter();
  const goBack = useGoBack();
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
      subtitle="Schritt 7 von 7"
      navigation="back"
      onLeadingPress={goBack}
      actions={
        <>
          <Button label="Erlauben" onPress={() => finish(true)} />
          <Button label="Lieber nicht" variant="secondary" onPress={() => finish(false)} />
        </>
      }
    >
      <KaterBubble>Haben wir einen Draht?!</KaterBubble>
      <SwitchRow
        label="Push-Nachrichten"
        description="Ich möchte bei Kommentaren, Antworten und Bestätigungen benachrichtigt werden. Ich kann diese Einstellungen jederzeit ändern."
        value={push}
        onValueChange={setPush}
      />
    </SubScreen>
  );
}
