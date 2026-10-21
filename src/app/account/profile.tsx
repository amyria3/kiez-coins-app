import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Avatar } from '../../components/AuthorRow';
import { choosePhoto } from '../../components/Form';
import { GearsLoader, SMALL_GEARS } from '../../components/GearsLoader';
import { Icon } from '../../components/icons/Icon';
import { FieldGroup } from '../../components/Content';
import { EditableRow, NavRow } from '../../components/Rows';
import { SubScreen } from '../../components/Screen';
import { useAuth } from '../../data/auth';
import { addressForms, anrede } from '../../data/format';
import { errorText, saveAvatar, saveHandle } from '../../data/remote';
import { useCurrentUser, useStore } from '../../data/store';
import type { ImageSource } from '../../data/types';
import { color, radius, space, text } from '../../theme/tokens';

const AVATAR = 112;

/** Route `account/profile` (Push aus der Profilkarte in „Dein Konto“): persönliche Angaben ändern. */
export default function PersonalDetails() {
  const router = useRouter();
  const { profile, mode, dispatch } = useStore();
  const me = useCurrentUser();
  const { session } = useAuth();
  const live = mode === 'live' && !!session;
  const [uploading, setUploading] = useState(false);

  // Profilbild: hochladen, alten Pfad ersetzen, dann sofort überall zeigen
  const setAvatar = async (photo: ImageSource | null) => {
    if (!live) {
      dispatch({ type: 'setAvatar', avatar: photo ?? undefined });
      return;
    }
    setUploading(true);
    try {
      const avatar = await saveAvatar(session.user.id, photo);
      dispatch({ type: 'setAvatar', avatar });
    } catch (error) {
      Alert.alert('Profilbild nicht gespeichert', errorText(error));
    } finally {
      setUploading(false);
    }
  };
  const pickAvatar = () =>
    choosePhoto((photo) => setAvatar(photo), {
      square: true,
      title: me.avatar ? 'Profilbild ändern' : 'Profilbild hinzufügen',
      onRemove: me.avatar ? () => setAvatar(null) : undefined,
    });

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
      <Pressable
        onPress={pickAvatar}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel={me.avatar ? 'Profilbild ändern' : 'Profilbild hinzufügen'}
        style={({ pressed }) => [styles.avatarBlock, pressed && styles.pressed]}
      >
        <View>
          <Avatar user={{ ...me, name: profile.handle || me.name }} diameter={AVATAR} />
          {uploading ? (
            <View style={styles.uploading}>
              <GearsLoader size={56} only={SMALL_GEARS} />
            </View>
          ) : null}
          <View style={styles.camera}>
            <Icon name="camera" size={13} color={color.text.primary} />
          </View>
        </View>
        <Text style={styles.avatarLabel}>{me.avatar ? 'Profilbild ändern' : 'Profilbild hinzufügen'}</Text>
      </Pressable>
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
  avatarBlock: { alignItems: 'center', gap: space[24], paddingVertical: space[8] },
  pressed: { opacity: 0.8 },
  uploading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.full,
    backgroundColor: 'rgba(31, 33, 35, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Kamera-Knopf unten rechts am Bild
  camera: {
    position: 'absolute',
    // Diagonal außerhalb des Kreises, mit 4 pt Abstand zum Bild
    right: -24,
    bottom: -24,
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: color.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: { ...text.body, color: color.accent.primary },
});
