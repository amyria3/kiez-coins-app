import { Alert, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { FieldGroup } from '../../components/Content';
import { EditableRow, NavRow } from '../../components/Rows';
import { SubScreen } from '../../components/Screen';
import { useAuth } from '../../data/auth';
import { addressForms, anrede } from '../../data/format';
import { saveHandle } from '../../data/remote';
import { useCurrentUser, useStore } from '../../data/store';
import { color, text } from '../../theme/tokens';

/** Route `account/profile` (Push aus der Profilkarte in „Dein Konto“): persönliche Angaben ändern. */
export default function PersonalDetails() {
  const router = useRouter();
  const { profile, mode, dispatch } = useStore();
  const me = useCurrentUser();
  const { session } = useAuth();
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

  const saveAnrede = (value: string) => {
    const preset = addressForms.find((f) => f.label === value);
    dispatch({
      type: 'updateProfile',
      patch: preset ? { addressForm: preset.key, addressCustom: undefined } : { addressForm: 'custom', addressCustom: value },
    });
  };

  return (
    <SubScreen title="Persönliche Angaben" navigation="back" onLeadingPress={() => router.back()}>
      <FieldGroup label="Profil">
        <EditableRow label="Deckname" value={profile.handle || me.name} maxLength={30} onSave={saveDeckname} />
        <EditableRow label="Ansprache" value={anrede(profile)} maxLength={30} onSave={saveAnrede} />
        <NavRow
          label="Kiez"
          value={profile.kiez ?? 'Noch nicht festgelegt'}
          onPress={() => router.push({ pathname: '/onboarding/kiez', params: { from: 'app' } })}
        />
      </FieldGroup>
      {profile.email ? (
        <FieldGroup label="Anmeldung">
          <Text style={styles.secondary}>{profile.email}</Text>
        </FieldGroup>
      ) : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  secondary: { ...text.body, color: color.text.secondary },
});
