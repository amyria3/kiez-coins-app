import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { FieldGroup, KaterBubble } from '../../components/Content';
import { CrownIcon, MonoCat } from '../../components/icons/Brand';
import { Icon, PhIcon } from '../../components/icons/Icon';
import { Avatar } from '../../components/AuthorRow';
import { NavCard, NavRow, ProfileCard } from '../../components/Rows';
import { SubScreen } from '../../components/Screen';
import { SurveyOverlay } from '../../components/SurveyOverlay';
import { anrede, genderLabel } from '../../data/format';
import { useAuth } from '../../data/auth';
import { isModerator, loadFriends } from '../../data/remote';
import { useCurrentUser, useStore } from '../../data/store';
import { color, isFashionable, size, space } from '../../theme/tokens';
import { getLanguage, getLanguageChoice, languages, t } from '../../data/texts';
import { look, looks, lookSelectable } from '../../theme/look';
import { features, useFeatures } from '../../data/features';
import { useGoBack } from '../../lib/goBack';

/** Route `account` (Push, aus dem Burger-Menü im Feed). Figma: `account`, `account--edit-*`. */
export default function Account() {
  const router = useRouter();
  const goBack = useGoBack();
  const { profile, groups, mode, blockedIds } = useStore();
  const me = useCurrentUser();
  const { signOut, hasPassword } = useAuth();
  const featureState = useFeatures();
  const featuresOn = features.filter((f) => featureState[f.key]).map((f) => f.label).join(', ');
  // „Moderation“ nur für Personen in der Tabelle `moderators`
  const [moderator, setModerator] = useState(false);
  const [survey, setSurvey] = useState(false);
  // Offene Freundschaftsanfragen als Zahl an der Zeile
  const [friendRequests, setFriendRequests] = useState(0);
  useEffect(() => {
    if (mode !== 'live') return;
    loadFriends(me.id).then(
      (l) => setFriendRequests(l?.incoming.length ?? 0),
      () => {},
    );
  }, [mode, me.id]);
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
    <SubScreen title="Dein Konto" navigation="back" onLeadingPress={goBack}>
      <KaterBubble>{t('Ahoi, {anrede}! Hier trimmst Du Dein Schiff. Tippe einfach auf das, was Du ändern willst.', { anrede: anrede(profile) })}</KaterBubble>
      <ProfileCard
        user={me}
        name={profile.handle || me.name}
        details={[anrede(profile), profile.kiez ?? 'Kiez noch nicht festgelegt']}
        onPress={() => router.push('/account/profile')}
      />
      {/* Funktionen an- und abschalten (Daria, 24.10.2026), direkt unter Deinem Namen (Daria, 27.10.2026) */}
      <NavCard
        title="Funktionen"
        description={featuresOn || 'Nur Me-Challenge'}
        leading={<Icon name="switch" size={size.icon} color={color.text.primary} />}
        onPress={() => router.push('/account/funktionen')}
      />
      <NavCard
        title="Was Du so machst"
        description="Verlauf, Aufgaben und Gruppen"
        // Fashionable Look: Dein Bild wie oben im Feed (Regelwerk: Was Du so machst = Dein Profil)
        leading={isFashionable ? <Avatar user={me} diameter={28} /> : <CrownIcon height={30} />}
        onPress={() => router.push('/reise')}
      />
      <NavCard
        title="Deine Challenges"
        description="Entwürfe, offen, geschlossen"
        leading={<Icon name="ship" size={size.icon} color={color.text.primary} />}
        onPress={() => router.push('/manage')}
      />
      {featureState.groups ? (
      <NavCard
        title="Deine Gruppen"
        description={groups.length === 0 ? 'Gründen oder beitreten' : groups.length === 1 ? '1 Gruppe' : t('{groups} Gruppen', { groups: groups.length })}
        leading={<Icon name="behausung" size={size.icon} color={color.text.primary} />}
        onPress={() => router.push('/gruppen')}
      />
      ) : null}
      {/* Freundschaften, Funktionen, Geschlecht und Look mit Darias Icons (25.10.2026), Sprache mit Phosphor */}
      <NavCard
        title="Freundschaften"
        description={
          friendRequests
            ? t('{n, plural, one {# Anfrage} other {# Anfragen}}', {
                n: friendRequests,
              })
            : 'Freund:innen und Anfragen'
        }
        leading={<Icon name="friends" size={size.icon} color={color.text.primary} />}
        onPress={() => router.push('/account/freunde')}
      />
      <NavCard
        title="Sprache"
        description={languageName}
        leading={<PhIcon name="language" size={size.icon} />}
        onPress={() => router.push('/account/sprache')}
      />
      <NavCard
        title="Grammatisches Geschlecht"
        description={genderLabel(profile.gender)}
        leading={<Icon name="questionmark" size={size.icon} color={color.text.primary} />}
        onPress={() => router.push('/account/geschlecht')}
      />
      {lookSelectable ? (
        <NavCard
          title="Look"
          description={looks.find((l) => l.code === look)?.name}
          leading={<Icon name="look" size={size.icon} color={color.text.primary} />}
          onPress={() => router.push('/account/look')}
        />
      ) : null}
      {/* Kater-Seite als große Karte unter Look (Daria, 25.10.2026); Kiez-Look: Darias Kater-Icon, Fashionable: Logo-Kater */}
      <NavCard
        title="Auf eine Frotzerei"
        description="Sprüche"
        leading={
          isFashionable ? (
            <MonoCat height={size.icon} />
          ) : (
            <View style={styles.catBleed}>
              <Icon name="cat" size={26} color={color.text.primary} />
            </View>
          )
        }
        leadingFill={!isFashionable}
        onPress={() => router.push('/kater')}
      />
      <FieldGroup label="Einstellungen">
        <View style={styles.list}>
          <NavRow label="So geht Kiez Coins" value="Kurze Videos" onPress={() => router.push('/tour')} />
          <NavRow label="Benachrichtigungen" value={profile.push ? 'Push an' : 'Push aus'} onPress={() => router.push('/settings/notifications')} />
          <NavRow label="Zahlungsdaten" value={payoutValue} onPress={() => router.push('/settings/payout')} />
          <NavRow label="Umfrage" value="7 Fragen zur App" onPress={() => setSurvey(true)} />
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
          <NavRow label="Community-Regeln" onPress={() => router.push('/rechtliches/regeln')} />
          <NavRow label="Impressum" onPress={() => router.push('/rechtliches/impressum')} />
          <NavRow label="Datenschutz" onPress={() => router.push('/rechtliches/datenschutz')} />
          <NavRow label="Nutzungsbedingungen" value="Testphase" onPress={() => router.push('/rechtliches/bedingungen')} />
        </View>
      </FieldGroup>
      <SurveyOverlay visible={survey} onClose={() => setSurvey(false)} />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[8] },
  // Kater ragt 2 pt über den Kreisrand hinaus, damit der Kreis seine Unterkante rund abschneidet
  catBleed: { marginBottom: -2 },
});
