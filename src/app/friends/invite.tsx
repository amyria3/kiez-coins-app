import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useNudge } from '../../components/Nudge';
import { useAuth } from '../../data/auth';
import { FRIEND_CODE_LENGTH, parseFriendCode } from '../../data/friendInvites';
import { rememberInvite } from '../../data/pendingInvite';
import { acceptFriendInvite, errorText, loadFriends } from '../../data/remote';
import { useStore } from '../../data/store';
import { t } from '../../data/texts';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `friends/invite`: Freundschaftseinladung annehmen.
 * Link und QR-Code öffnen die Seite mit `?code=…`. Ohne Anmeldung merkt sich die App den Code. Nach Anmeldung
 * und Zustimmung zu den Nutzungsbedingungen führt das Onboarding hierher zurück, und die App nimmt die
 * Einladung selbst an. Ohne Link tippt die Person den Code ein.
 * Sind beide schon befreundet, meldet die App das (Daria, 25.10.2026).
 */
export default function AcceptFriendInvite() {
  const router = useRouter();
  const goBack = useGoBack();
  const { session } = useAuth();
  const { mode, currentUserId } = useStore();
  const params = useLocalSearchParams<{ code?: string }>();
  const linkCode = parseFriendCode(String(params.code ?? ''));
  const [code, setCode] = useState(linkCode ?? '');
  const [busy, setBusy] = useState(false);
  const codeField = useNudge();
  const started = useRef(false);
  const clean = code.replace(/\s+/g, '').toUpperCase();

  useEffect(() => {
    if (!session && linkCode) rememberInvite(linkCode, 'friend');
  }, [session, linkCode]);

  const accept = async (value: string) => {
    setBusy(true);
    try {
      // Vorher die bestätigten Freund:innen merken, damit die App „schon befreundet“ erkennt
      const before = mode === 'live' ? await loadFriends(currentUserId).catch(() => null) : null;
      const inviter = mode === 'live' ? await acceptFriendInvite(value) : null;
      const already = !!inviter && !!before?.friends.some((f) => f.id === inviter.id);
      if (already) {
        Alert.alert('Schon befreundet', t('Du und {name} seid schon befreundet.', { name: inviter.name }));
      } else {
        Alert.alert(
          'Ihr seid befreundet',
          inviter ? t('Du und {name} seid jetzt befreundet.', { name: inviter.name }) : 'Die Einladung ist angenommen.',
        );
      }
      router.replace('/account/friends');
    } catch (error) {
      Alert.alert('Annehmen hat nicht geklappt', errorText(error));
    } finally {
      setBusy(false);
    }
  };

  // Mit Code aus dem Link nimmt die App die Einladung direkt an
  useEffect(() => {
    if (!session || !linkCode || started.current) return;
    started.current = true;
    accept(linkCode);
  }, [session, linkCode]);

  if (!session) return <Redirect href="/onboarding/welcome" />;

  const change = (value: string) => setCode(parseFriendCode(value) ?? value.slice(0, 9));

  const paste = async () => {
    const text = await Clipboard.getStringAsync().catch(() => '');
    const found = parseFriendCode(text);
    if (found) setCode(found);
    else codeField.nudge('In der Zwischenablage steht kein Einladungscode.');
  };

  return (
    <SubScreen
      title="Einladung annehmen"
      navigation="back"
      onLeadingPress={() => goBack()}
      actions={
        <Button
          busy={busy}
          label={busy ? 'Nehme an …' : 'Annehmen'}
          onPress={() => accept(clean)}
          disabled={busy || clean.length !== FRIEND_CODE_LENGTH}
          whyDisabled={() => !busy && codeField.nudge('Der Code hat 7 Zeichen.')}
        />
      }
    >
      <TextField
        label="Einladungscode"
        required
        nudge={codeField}
        helperText="7 Zeichen. Du kannst auch den ganzen Link oder die Nachricht einfügen."
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
