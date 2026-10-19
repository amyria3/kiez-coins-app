import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { FieldGroup, KaterBubble } from '../../components/Content';
import { SwitchRow, TextField } from '../../components/Form';
import { EditableRow, NavRow } from '../../components/Rows';
import { SubScreen } from '../../components/Screen';
import { addressForms, anrede } from '../../data/format';
import { useAuth } from '../../data/auth';
import { saveHandle, sendSupportRequest, errorText } from '../../data/remote';
import { useCurrentUser, useStore } from '../../data/store';
import { space } from '../../theme/tokens';

/** Route `account` (Push, aus dem Burger-Menü im Feed). Figma: `account`, `account--edit-*`. */
export default function Account() {
  const router = useRouter();
  const { profile, mode, dispatch } = useStore();
  const me = useCurrentUser();
  const { signOut, session } = useAuth();
  const [support, setSupport] = useState('');
  const [sending, setSending] = useState(false);
  const live = mode === 'live' && !!session;

  const saveDeckname = async (handle: string) => {
    if (live) {
      const failure = await saveHandle(session.user.id, handle);
      if (failure) {
        Alert.alert('Deckname nicht geändert', failure);
        return;
      }
    }
    dispatch({ type: 'updateProfile', patch: { handle: handle.trim() } });
  };

  const sendSupport = async () => {
    if (live) {
      setSending(true);
      try {
        await sendSupportRequest(support);
      } catch (error) {
        Alert.alert('Nicht gesendet', errorText(error));
        return;
      } finally {
        setSending(false);
      }
    }
    setSupport('');
    router.push('/account/support/success');
  };

  const payoutValue = me.payout?.iban ? 'IBAN hinterlegt' : me.payout?.paypal ? 'PayPal hinterlegt' : 'Nicht hinterlegt';

  const saveAnrede = (value: string) => {
    const preset = addressForms.find((f) => f.label === value);
    dispatch({
      type: 'updateProfile',
      patch: preset ? { addressForm: preset.key, addressCustom: undefined } : { addressForm: 'custom', addressCustom: value },
    });
  };

  const toStart = async () => {
    await signOut();
    router.dismissAll();
    router.replace('/onboarding/welcome');
  };

  return (
    <SubScreen title="Dein Konto" navigation="back" onLeadingPress={() => router.back()}>
      <KaterBubble>Ahoi, {anrede(profile)}! Hier trimmst Du Dein Schiff. Tipp einfach auf das, was Du ändern willst.</KaterBubble>
      <NavRow label="Deine Reise" value="Deine Challenges" onPress={() => router.push('/reise')} />
      <FieldGroup label="Profil">
        <EditableRow
          label="Deckname"
          value={profile.handle || me.name}
          maxLength={30}
          onSave={saveDeckname}
        />
        <EditableRow label="Ansprache" value={anrede(profile)} maxLength={30} onSave={saveAnrede} />
        <NavRow
          label="Kiez"
          value={profile.kiez ?? 'Noch nicht festgelegt'}
          onPress={() => router.push({ pathname: '/onboarding/kiez', params: { from: 'app' } })}
        />
      </FieldGroup>
      <FieldGroup label="Benachrichtigungen">
        <SwitchRow
          label="Push-Nachrichten"
          description="Kommentare, Antworten und Bestätigungen"
          value={profile.push}
          onValueChange={(push) => dispatch({ type: 'updateProfile', patch: { push } })}
        />
      </FieldGroup>
      <FieldGroup label="Zahlungen">
        <NavRow label="Zahlungsdaten" value={payoutValue} onPress={() => router.push('/settings/payout')} />
      </FieldGroup>
      <FieldGroup label="Hilfe">
        <TextField
          label="Support-Anfrage"
          helperText="Schreib uns, was nicht klappt. Wir antworten per E-Mail."
          value={support}
          onChangeText={setSupport}
          multiline
          maxLength={1000}
        />
        <Button
          label="Anfrage senden"
          variant="secondary"
          disabled={!support.trim() || sending}
          onPress={sendSupport}
        />
      </FieldGroup>
      <FieldGroup label="Konto">
        <View style={styles.list}>
          <NavRow label="Abmelden" onPress={toStart} />
          <NavRow label="Konto 3 Monate pausieren" onPress={() => router.push('/account/pause')} />
          <NavRow label="Konto löschen" tone="danger" onPress={() => router.push('/account/delete')} />
        </View>
      </FieldGroup>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[8] },
});
