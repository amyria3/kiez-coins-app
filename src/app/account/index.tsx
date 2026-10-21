import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { FieldGroup, KaterBubble } from '../../components/Content';
import { NavRow, ProfileCard } from '../../components/Rows';
import { SubScreen } from '../../components/Screen';
import { anrede } from '../../data/format';
import { useAuth } from '../../data/auth';
import { useCurrentUser, useStore } from '../../data/store';
import { space } from '../../theme/tokens';

/** Route `account` (Push, aus dem Burger-Menü im Feed). Figma: `account`, `account--edit-*`. */
export default function Account() {
  const router = useRouter();
  const { profile, groups } = useStore();
  const me = useCurrentUser();
  const { signOut, hasPassword } = useAuth();

  const payoutValue = me.payout?.iban ? 'IBAN hinterlegt' : me.payout?.paypal ? 'PayPal hinterlegt' : 'Nicht hinterlegt';

  const toStart = async () => {
    await signOut();
    router.dismissAll();
    router.replace('/onboarding/welcome');
  };

  return (
    <SubScreen title="Dein Konto" navigation="back" onLeadingPress={() => router.back()}>
      <KaterBubble>Ahoi, {anrede(profile)}! Hier trimmst Du Dein Schiff. Tipp einfach auf das, was Du ändern willst.</KaterBubble>
      <ProfileCard
        user={me}
        name={profile.handle || me.name}
        details={[anrede(profile), profile.kiez ?? 'Kiez noch nicht festgelegt']}
        onPress={() => router.push('/account/profile')}
      />
      <NavRow label="YourPleasure" value="Verlauf, Aufgaben und Gruppen" onPress={() => router.push('/reise')} />
      <NavRow label="Deine Challenges" value="Entwürfe, offen, geschlossen" onPress={() => router.push('/manage')} />
      <NavRow
        label="Deine Gruppen"
        value={groups.length === 0 ? 'Gründen oder beitreten' : groups.length === 1 ? '1 Gruppe' : `${groups.length} Gruppen`}
        onPress={() => router.push('/gruppen')}
      />
      <FieldGroup label="Einstellungen">
        <View style={styles.list}>
          <NavRow
            label="Benachrichtigungen"
            value={profile.push ? 'Push an' : 'Push aus'}
            onPress={() => router.push('/settings/notifications')}
          />
          <NavRow label="Zahlungsdaten" value={payoutValue} onPress={() => router.push('/settings/payout')} />
          <NavRow label="Support" value="Frage oder Problem" onPress={() => router.push('/account/support')} />
        </View>
      </FieldGroup>
      <FieldGroup label="Konto">
        <View style={styles.list}>
          <NavRow
            label="Zugangsdaten"
            value={hasPassword ? 'E-Mail und Passwort' : 'Passwort fehlt noch'}
            onPress={() => router.push('/account/credentials')}
          />
          <NavRow label="Abmelden" onPress={toStart} />
          <NavRow label="Konto 3 Monate pausieren" onPress={() => router.push('/account/pause')} />
          <NavRow label="Konto löschen" tone="danger" onPress={() => router.push('/account/delete')} />
        </View>
      </FieldGroup>
      <FieldGroup label="Rechtliches">
        <View style={styles.list}>
          <NavRow label="Impressum" onPress={() => router.push('/rechtliches/impressum')} />
          <NavRow label="Datenschutz" onPress={() => router.push('/rechtliches/datenschutz')} />
          <NavRow label="Nutzungsbedingungen" value="Testphase" onPress={() => router.push('/rechtliches/bedingungen')} />
        </View>
      </FieldGroup>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[8] },
});
