import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useAuth } from '../../data/auth';
import { parseInviteCode } from '../../data/groups';
import { rememberInvite } from '../../data/pendingInvite';
import { turnOnGroups } from '../../data/features';
import { useStore } from '../../data/store';
import { useNudge } from '../../components/Nudge';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `gruppen/beitreten`: Einladungscode eingeben.
 * Der Einladungslink öffnet die Seite mit `?code=…`. Ohne Anmeldung merkt sich die App den Code und
 * führt nach dem Onboarding hierher zurück.
 */
export default function JoinGroup() {
  const router = useRouter();
  const goBack = useGoBack();
  const { session } = useAuth();
  const { groupApi, currentUserId } = useStore();
  const params = useLocalSearchParams<{ code?: string }>();
  const linkCode = parseInviteCode(String(params.code ?? ''));
  const [code, setCode] = useState(linkCode ?? '');
  const [busy, setBusy] = useState(false);
  const codeField = useNudge();
  const clean = code.replace(/\s+/g, '').toUpperCase();

  useEffect(() => {
    if (!session && linkCode) rememberInvite(linkCode);
  }, [session, linkCode]);

  if (!session) return <Redirect href="/onboarding/welcome" />;

  // Eingefügter Link oder ganze Nachricht: nur den Code übernehmen
  const change = (value: string) => setCode(parseInviteCode(value) ?? value.slice(0, 8));

  const paste = async () => {
    const text = await Clipboard.getStringAsync().catch(() => '');
    const found = parseInviteCode(text);
    if (found) setCode(found);
    else codeField.nudge('In der Zwischenablage steht kein Einladungscode.');
  };

  const join = async () => {
    setBusy(true);
    try {
      const id = await groupApi.join(clean);
      turnOnGroups(currentUserId);
      router.replace(`/gruppen/${id}`);
    } catch (error) {
      Alert.alert('Beitreten hat nicht geklappt', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SubScreen
      title="Gruppe beitreten"
      navigation="back"
      onLeadingPress={() => (goBack())}
      actions={<Button busy={busy} label={busy ? 'Trete bei …' : 'Beitreten'} onPress={join} disabled={busy || clean.length !== 6} whyDisabled={() => !busy && codeField.nudge('Der Code hat 6 Zeichen.')} />}
    >
      <TextField
        label="Einladungscode" required
        nudge={codeField}
        helperText="6 Zeichen. Du kannst auch den ganzen Link oder die Nachricht einfügen."
        value={code}
        onChangeText={change}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus={!linkCode}
      />
      <Button label="Aus Zwischenablage einfügen" variant="secondary" onPress={paste} />
    </SubScreen>
  );
}
