import { useEffect, useRef, useState } from 'react';
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
import { myGroupByCode } from '../../data/remote';
import { useStore } from '../../data/store';
import { t } from '../../data/texts';
import { useNudge } from '../../components/Nudge';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `gruppen/beitreten`: Einladungscode eingeben.
 * Der Einladungslink öffnet die Seite mit `?code=…`. Ohne Anmeldung merkt sich die App den Code und
 * führt nach dem Onboarding hierher zurück.
 * Ist die Person schon Mitglied, meldet die App das und öffnet die Gruppe (Daria, 25.10.2026).
 */
export default function JoinGroup() {
  const router = useRouter();
  const goBack = useGoBack();
  const { session } = useAuth();
  const { groupApi, currentUserId, groups, mode } = useStore();
  const params = useLocalSearchParams<{ code?: string }>();
  const linkCode = parseInviteCode(String(params.code ?? ''));
  const [code, setCode] = useState(linkCode ?? '');
  const [busy, setBusy] = useState(false);
  const codeField = useNudge();
  const clean = code.replace(/\s+/g, '').toUpperCase();

  useEffect(() => {
    if (!session && linkCode) rememberInvite(linkCode);
  }, [session, linkCode]);

  // Schon Mitglied: Hinweis und direkt in die Gruppe. Die eigenen Gruppen kennen ihren Code.
  const memberOf = (value: string) => groups.find((g) => g.inviteCode === value);
  const showMember = (group: { id: string; name: string }) => {
    Alert.alert('Schon dabei', t('Du bist schon Mitglied in „{name}“.', { name: group.name }));
    router.replace(`/gruppen/${group.id}`);
  };

  // Link mit Code: gleich beim Öffnen prüfen
  const checked = useRef(false);
  useEffect(() => {
    if (!session || !linkCode || checked.current) return;
    checked.current = true;
    const group = memberOf(linkCode);
    if (group) showMember(group);
    else if (mode === 'live') myGroupByCode(linkCode).then((g) => g && showMember(g));
  }, [session, linkCode]);

  if (!session) return <Redirect href="/onboarding/welcome" />;

  // Eingefügter Link oder ganze Nachricht: nur den Code übernehmen
  const change = (value: string) => setCode(parseInviteCode(value) ?? value.slice(0, 8));

  const paste = async () => {
    const text = await Clipboard.getStringAsync().catch(() => '');
    const found = parseInviteCode(text);
    if (found) setCode(found);
    else codeField.nudge('In der Zwischenablage steht kein Beitrittscode.');
  };

  const join = async () => {
    const already = memberOf(clean);
    if (already) return showMember(already);
    setBusy(true);
    try {
      // Gruppen sieht nur, wer Mitglied ist. Findet die Abfrage die Gruppe, ist die Person schon drin.
      // Das greift auch, wenn die Gruppen nach der Anmeldung noch nicht geladen sind.
      const mine = mode === 'live' ? await myGroupByCode(clean) : null;
      if (mine) return showMember(mine);
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
        label="Beitrittscode" required
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
