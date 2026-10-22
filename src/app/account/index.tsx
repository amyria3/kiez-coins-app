import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { FieldGroup, KaterBubble } from '../../components/Content';
import { CrownIcon } from '../../components/icons/Brand';
import { Icon } from '../../components/icons/Icon';
import { NavCard, NavRow, ProfileCard } from '../../components/Rows';
import { SubScreen } from '../../components/Screen';
import { SurveyOverlay } from '../../components/SurveyOverlay';
import { anrede } from '../../data/format';
import { useAuth } from '../../data/auth';
import { isModerator } from '../../data/remote';
import { useCurrentUser, useStore } from '../../data/store';
import { color, size, space } from '../../theme/tokens';
import { getLanguage, getLanguageChoice, languages, t } from '../../data/texts';

/** Route `account` (Push, aus dem Burger-Menü im Feed). Figma: `account`, `account--edit-*`. */
export default function Account() {
  const router = useRouter();
  const { profile, groups, mode, blockedIds } = useStore();
  const me = useCurrentUser();
  const { signOut, hasPassword } = useAuth();
  // „Moderation“ nur für Personen in der Tabelle `moderators`
  const [moderator, setModerator] = useState(false);
  const [survey, setSurvey] = useState(false);
  const languageName = getLanguageChoice() === 'auto' ? t('Wie das Handy') : languages.find((l) => l.code === getLanguage())?.name;
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
        title="Was Du so machst"
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
        description={groups.length === 0 ? 'Gründen oder beitreten' : groups.length === 1 ? '1 Gruppe' : t('{groups} Gruppen', { groups: groups.length })}
        leading={<Icon name="behausung" size={size.icon} color={color.text.primary} />}
        onPress={() => router.push('/gruppen')}
      />
      <FieldGroup label="Einstellungen">
        <View style={styles.list}>
          <NavRow label="So geht Kiez Coins" value="Kurze Videos" onPress={() => router.push('/tour')} />
          <NavRow label="Sprache" value={languageName} onPress={() => router.push('/account/sprache')} />
          <NavRow
            label="Benachrichtigungen"
            value={profile.push ? 'Push an' : 'Push aus'}
            onPress={() => router.push('/settings/notifications')}
          />
          <NavRow label="Zahlungsdaten" value={payoutValue} onPress={() => router.push('/settings/payout')} />
          <NavRow label="Umfrage" value="5 Fragen zur App" onPress={() => setSurvey(true)} />
          <NavRow label="Support" value="Frage oder Problem" onPress={() => router.push('/account/support')} />
          <NavRow
            label="Blockierte Personen"
            value={blockedIds.length === 0 ? 'Niemand' : t('{blockedIds} blockiert', { blockedIds: blockedIds.length })}
            onPress={() => router.push('/account/blocked')}
          />
          {moderator ? <NavRow label="Moderation" value="Meldungen prüfen" onPress={() => router.push('/moderation')} /> : null}
          {moderator ? <NavRow label="Umfrage-Ergebnis" value="Antworten zählen" onPress={() => router.push('/account/umfrage/ergebnis')} /> : null}
          {moderator ? <NavRow label="Texte" value="Buttons, Kater, Rechtstexte" onPress={() => router.push('/texte')} /> : null}
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
      <SurveyOverlay visible={survey} onClose={() => setSurvey(false)} />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[8] },
});
