import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { FieldGroup, KaterBubble } from '../../components/Content';
import { SwitchRow, TextField } from '../../components/Form';
import { EditableRow, NavRow } from '../../components/Rows';
import { SubScreen } from '../../components/Screen';
import { addressForms, anrede } from '../../data/format';
import { useCurrentUser, useStore } from '../../data/store';
import { space } from '../../theme/tokens';

/** Route `account` (Push, aus dem Burger-Menü im Feed). Figma: `account`, `account--edit-*`. */
export default function Account() {
  const router = useRouter();
  const { profile, dispatch } = useStore();
  const me = useCurrentUser();
  const [support, setSupport] = useState('');

  const payoutValue = me.payout?.iban ? 'IBAN hinterlegt' : me.payout?.paypal ? 'PayPal hinterlegt' : 'Nicht hinterlegt';

  const saveAnrede = (value: string) => {
    const preset = addressForms.find((f) => f.label === value);
    dispatch({
      type: 'updateProfile',
      patch: preset ? { addressForm: preset.key, addressCustom: undefined } : { addressForm: 'custom', addressCustom: value },
    });
  };

  const toStart = () => {
    dispatch({ type: 'signOut' });
    router.dismissAll();
    router.replace('/onboarding/welcome');
  };

  return (
    <SubScreen title="Dein Konto" navigation="back" onLeadingPress={() => router.back()}>
      <KaterBubble>Ahoi, {anrede(profile)}! Hier trimmst Du Dein Schiff. Tipp einfach auf das, was Du ändern willst.</KaterBubble>
      <FieldGroup label="Profil">
        <EditableRow
          label="Deckname"
          value={profile.handle || me.name}
          maxLength={30}
          onSave={(handle) => dispatch({ type: 'updateProfile', patch: { handle } })}
        />
        <EditableRow label="Ansprache" value={anrede(profile)} maxLength={30} onSave={saveAnrede} />
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
          disabled={!support.trim()}
          onPress={() => {
            setSupport('');
            router.push('/account/support/success');
          }}
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
