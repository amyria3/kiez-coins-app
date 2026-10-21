import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { FieldGroup, KaterBubble } from '../../components/Content';
import { CrownIcon, EdensteinIcon } from '../../components/icons/Brand';
import { Icon } from '../../components/icons/Icon';
import { NavCard, NavRow, ProfileCard } from '../../components/Rows';
import { SubScreen } from '../../components/Screen';
import { anrede } from '../../data/format';
import { useAuth } from '../../data/auth';
import { isModerator } from '../../data/remote';
import { useCurrentUser, useStore } from '../../data/store';
import { color, size, space } from '../../theme/tokens';
import { t } from '../../data/texts';

/** Route `account` (Push, aus dem Burger-Menü im Feed). Figma: `account`, `account--edit-*`. */
export default function Account() {
  const router = useRouter();
  const { profile, groups, mode, blockedIds } = useStore();
  const me = useCurrentUser();
  const { signOut, hasPassword } = useAuth();
  // „Moderation“ nur für Personen in der Tabelle `moderators`
  const [moderator, setModerator] = useState(false);
  useEffect(() => {
    if (mode === 'live') isModerator().then(setModerator);
  }, [mode]);

  const payoutValue = me.payout?.iban ? 'IBAN hinterlegt' : me.payout?.paypal ? 'PayPal hinterlegt' : 'Nicht hinterlegt';

  const toStart = async () => {
    await signOut();
    router.dismissAll();
    router.replace('/onboarding/welcome');
  };

  return (
    <SubScreen title="Dein Konto" navigation="back" onLeadingPress={() => router.back()}>
      <KaterBubble>
        {t('Ahoi, {anrede}! Hier trimmst Du Dein Schiff. Tipp einfach auf das, was Du ändern willst.', { anrede: anrede(profile) })}
      </KaterBubble>
      <ProfileCard
        user={me}
        name={profile.handle || me.name}
        details={[anrede(profile), profile.kiez ?? 'Kiez noch nicht festgelegt']}
        onPress={() => router.push('/account/profile')}
      />
      <NavCard
        title="Your Pleasure"
        description="Verlauf, Aufgaben und Gruppen"
        leading={<CrownIcon height={30} />}
        onPress={() => router.push('/reise')}
      />
      <NavCard
        title="Deine Challenges"
        description="Entwürfe, offen, geschlossen"
        leading={<Icon name="ship" size={size.icon} color={color.text.primary} />}
        onPress={() => router.push('/manage')}
      />
      <NavCard
        title="Deine Gruppen"
        description={groups.length === 0 ? 'Gründen oder beitreten' : groups.length === 1 ? '1 Gruppe' : `${groups.length} Gruppen`}
        leading={<EdensteinIcon height={26} />}
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
          <NavRow
            label="Blockierte Personen"
            value={blockedIds.length === 0 ? 'Niemand' : `${blockedIds.length} blockiert`}
            onPress={() => router.push('/account/blocked')}
          />
          {moderator ? <NavRow label="Moderation" value="Meldungen prüfen" onPress={() => router.push('/moderation')} /> : null}
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
          <NavRow label="Community-Regeln" onPress={() => router.push('/rechtliches/regeln')} />
        </View>
      </FieldGroup>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[8] },
});
