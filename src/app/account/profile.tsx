import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/T';
import { useRouter } from 'expo-router';

import { Avatar } from '../../components/AuthorRow';
import { choosePhoto, RadioOption } from '../../components/Form';
import { GearsLoader, SMALL_GEARS } from '../../components/GearsLoader';
import { Icon } from '../../components/icons/Icon';
import { FieldGroup } from '../../components/Content';
import { EditableRow, NavRow } from '../../components/Rows';
import { SubScreen } from '../../components/Screen';
import { useAuth } from '../../data/auth';
import { addressForms, anrede, genderLabel } from '../../data/format';
import { errorText, loadProfileExtras, normalizeWebsite, saveAvatar, saveHandle, saveProfileExtras, type ProfileExtras } from '../../data/remote';
import { useCurrentUser, useStore } from '../../data/store';
import type { ImageSource } from '../../data/types';
import { color, radius, space, text } from '../../theme/tokens';
import { t } from '../../data/texts';
import { useGoBack } from '../../lib/goBack';

const AVATAR = 112;

/** Route `account/profile` (Push aus der Profilkarte in „Dein Konto“): persönliche Angaben ändern. */
export default function PersonalDetails() {
  const router = useRouter();
  const goBack = useGoBack();
  const { profile, mode, dispatch } = useStore();
  const me = useCurrentUser();
  const { session } = useAuth();
  const live = mode === 'live' && !!session;
  const [uploading, setUploading] = useState(false);
  // Bio und Webseite: null, solange sie laden oder die Migration fehlt (dann ausgeblendet)
  const [extras, setExtras] = useState<ProfileExtras | null>(live ? null : { bio: '', website: '' });
  useEffect(() => {
    if (!live) return;
    loadProfileExtras(session.user.id).then(setExtras);
  }, [live, session]);
  const saveExtra = async (patch: Partial<ProfileExtras>) => {
    if (!extras) return;
    const next = { ...extras, ...patch, ...(patch.website !== undefined ? { website: normalizeWebsite(patch.website) } : {}) };
    if (next.website && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(next.website)) {
      Alert.alert('Webseite nicht gespeichert', 'Das sieht nicht nach einer Webadresse aus, z. B. kiezcoins.de.');
      return;
    }
    setExtras(next);
    if (!live) return;
    try {
      await saveProfileExtras(session.user.id, patch);
    } catch (error) {
      setExtras(extras);
      Alert.alert('Nicht gespeichert', errorText(error));
    }
  };

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


  return (
    <SubScreen title="Persönliche Angaben" navigation="back" onLeadingPress={goBack}>
      <Pressable
        onPress={pickAvatar}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel={me.avatar ? t('Profilbild ändern') : t('Profilbild hinzufügen')}
        style={({ pressed }) => [styles.avatarBlock, pressed && styles.pressed]}
      >
        <View>
          <Avatar user={{ ...me, name: profile.handle || me.name }} diameter={AVATAR} />
          {uploading ? (
            <View style={styles.uploading}>
              <GearsLoader size={40} only={SMALL_GEARS} />
            </View>
          ) : null}
          <View style={styles.camera}>
            <Icon name="camera" size={13} color={color.text.primary} />
          </View>
        </View>
        <Text style={styles.avatarLabel}>{me.avatar ? 'Profilbild ändern' : 'Profilbild hinzufügen'}</Text>
      </Pressable>
      <FieldGroup label="Profil">
        <EditableRow label="Deckname (Nickname)" value={profile.handle || me.name} maxLength={30} onSave={saveDeckname} />
        {/* Nur Auswahl, keine eigene Bezeichnung mehr (Daria, 28.10.2026) */}
        <EditableRow
          label="Ansprache"
          value={anrede(profile)}
          onSave={(label) => {
            const preset = addressForms.find((f) => t(f.label) === label || f.label === label);
            if (preset) dispatch({ type: 'updateProfile', patch: { addressForm: preset.key, addressCustom: undefined } });
          }}
          renderEditor={(draft, setDraft) => (
            <View style={{ gap: space[8] }}>
              {addressForms.map((f) => (
                <RadioOption key={f.key} label={t(f.label)} selected={draft === t(f.label)} onPress={() => setDraft(t(f.label))} />
              ))}
            </View>
          )}
        />
        <NavRow
          label="Grammatisches Geschlecht"
          value={genderLabel(profile.gender)}
          onPress={() => router.push('/account/geschlecht')}
        />
        <NavRow
          label="Kiez"
          value={profile.kiez ?? 'Noch nicht festgelegt'}
          onPress={() => router.push({ pathname: '/onboarding/kiez', params: { from: 'app' } })}
        />
      </FieldGroup>
      {extras ? (
        <FieldGroup label="Über Dich">
          <EditableRow
            label="Kurze Bio"
            value={extras.bio}
            placeholder={t('Ein, zwei Sätze über Dich')}
            maxLength={160}
            multiline
            allowEmpty
            onSave={(bio) => saveExtra({ bio })}
          />
          <EditableRow
            label="Webseite"
            value={extras.website.replace(/^https?:\/\//i, '')}
            placeholder={t('z. B. deine-seite.de')}
            maxLength={200}
            keyboardType="url"
            allowEmpty
            onSave={(website) => saveExtra({ website })}
          />
        </FieldGroup>
      ) : null}
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
