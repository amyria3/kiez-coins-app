import { useState } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { Notice } from '../../components/Content';
import { TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useAuth } from '../../data/auth';
import { joinShowcase } from '../../data/showcase';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `schaufenster/beitreten` (Daria, 2026-11-10): Code für ein Schaufenster „nur für Eingeladene“.
 * Der Einladungslink öffnet die Seite mit `?code=…`.
 */
export default function JoinShowcase() {
  const router = useRouter();
  const goBack = useGoBack();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(String(params.code ?? '').toUpperCase());
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  if (!session) return <Redirect href="/onboarding/welcome" />;

  const clean = code.replace(/\s+/g, '').toUpperCase();

  const join = async () => {
    setBusy(true);
    setFailed(null);
    try {
      const id = await joinShowcase(clean);
      router.replace({ pathname: '/schaufenster/[id]', params: { id } });
    } catch (error) {
      setFailed((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SubScreen
      title="Schaufenster mit Code"
      navigation="back"
      onLeadingPress={goBack}
      actions={<Button label="Weiter" busy={busy} disabled={clean.length !== 8} onPress={join} />}
    >
      <TextField
        label="Code"
        value={code}
        onChangeText={(v) => setCode(v.slice(0, 12))}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="A1B2C3D4"
        onSubmitEditing={clean.length === 8 ? join : undefined}
      />
      {failed ? <Notice variant="warning" message={failed} /> : null}
    </SubScreen>
  );
}
