import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { FieldGroup } from '../../components/Content';
import { CrownIcon } from '../../components/icons/Brand';
import { Icon, ICON_SCALE } from '../../components/icons/Icon';

import { NavCard, NavRow, ProfileHeader } from '../../components/Rows';
import { SubScreen } from '../../components/Screen';
import { TabBar } from '../../components/TabBar';
import { SurveyOverlay } from '../../components/SurveyOverlay';
import { salutation } from '../../data/format';
import { useAuth } from '../../data/auth';
import { isModerator, loadFriends } from '../../data/remote';
import { useCurrentUser, useStore } from '../../data/store';
import { color, size, space } from '../../theme/tokens';
import { getLanguage, getLanguageChoice, languages, t } from '../../data/texts';
import { MODES, useModes } from '../../data/features';
import { useGoBack } from '../../lib/goBack';
import { useShowcaseEnabled } from '../../data/showcase';
import { installedVersionLabel } from '../../data/appRelease';
import { PageSlideProvider, usePageSlide } from '../../lib/pageSlide';

/** Route `account` (Push, aus dem Burger-Menü im Feed). Figma: `account`, `account--edit-*`. */
export default function Account() {
  const router = useRouter();
  const goBack = useGoBack();
  const { profile, groups, mode, blockedIds } = useStore();
  const me = useCurrentUser();
  const { signOut, hasPassword } = useAuth();
  const modes = useModes();
  // „Schaufenster“ unter Meine Gruppen (nicht „Mein“, es gehört zur Gruppe, Daria, 2026-11-12), wenn Schaufenster für die Person freigeschaltet ist (Daria, 2026-11-10)
  const showcase = useShowcaseEnabled();
  const modesShown = MODES.filter((m) => modes.isVisible(m.key)).map((m) => t(m.label)).join(', ');
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

  // Wischen nach rechts zu den Nachrichten, wie zwischen den Reitern im Feed (lib/pageSlide, Daria, 2026-11-17)
  const slide = usePageSlide({ prev: () => router.dismissTo('/chat') });

  const toStart = async () => {
    await signOut();
    router.dismissAll();
    router.replace('/onboarding/welcome');
  };

  return (
    <SubScreen
      title="Dein Konto"
      navigation="back"
      onLeadingPress={goBack}
      // Untere Leiste bleibt sichtbar, das Menü ist markiert (Daria, 2026-11-11)
      tabBar={
        <PageSlideProvider value={slide.leave}>
          <TabBar active="menu" onFeedPress={() => router.dismissTo({ pathname: '/feed', params: { reiter: 'standard' } })} onMenuPress={() => {}} />
        </PageSlideProvider>
      }
    >
      <Animated.View style={[styles.slide, slide.style]} {...slide.panHandlers}>
      {/* Kopfbereich ohne Karte (Daria, 2026-11-17) */}
      <ProfileHeader
        user={me}
        name={profile.handle || me.name}
        details={[salutation(profile), profile.kiez ?? 'Kiez noch nicht festgelegt']}
        onPress={() => router.push('/account/profile')}
      />
      {/* Reihenfolge und Namen (Daria, 30.10.2026): Me, Meine Gruppen, Meine Posts (2026-11-02), Meine Features,
          Meine Kontakte (vorher Meine Freundschaften, 2026-11-17), Sprache, Look, danach der Rest */}
      <NavCard
        title="Me"
        description="Geschafft, Ziele und Gruppen"
        leading={<CrownIcon height={30} fill={color.accountCards.ink} />}
        accent={color.accountCards.me}
        onPress={() => router.push('/me')}
      />
      {modes.isVisible('groups') ? (
      <NavCard
        title="Meine Gruppen"
        description={groups.length === 0 ? 'Gründen oder beitreten' : groups.length === 1 ? '1 Gruppe' : t('{groups} Gruppen', { groups: groups.length })}
        leading={<Icon name="behausung" size={size.icon} color={color.accountCards.ink} />}
        accent={color.accountCards.groups}
        onPress={() => router.push('/groups')}
      />
      ) : null}
      {showcase ? (
        <NavCard
          title="Schaufenster"
          description="Für Laden, Verein oder Club"
          // Dorf groß und leicht nach rechts, der Kreis schneidet das rechte Haus und die Unterkante rund ab,
          // der gerade Rand der Zeichnung liegt außerhalb (Daria, 2026-11-11)
          leading={
            (
              <View style={styles.villageBleed}>
                <Icon name="village" size={38 / ICON_SCALE} color={color.accountCards.ink} />
              </View>
            )
          }
          leadingFill={true}
          accent={color.accountCards.showcase}
          onPress={() => router.push('/schaufenster')}
        />
      ) : null}
      <NavCard
        title="Meine Posts"
        description="Entwürfe, offen, geschlossen"
        leading={<Icon name="ship" size={size.icon} color={color.accountCards.ink} />}
        accent={color.accountCards.posts}
        onPress={() => router.push('/manage')}
      />
      {/* Funktionen an- und abschalten (Daria, 24.10.2026) */}
      <NavCard
        title="Meine Features"
        description={modesShown}
        leading={<Icon name="switch" size={size.icon} color={color.accountCards.ink} />}
        accent={color.accountCards.features}
        onPress={() => router.push('/account/features')}
      />
      {/* Freundschaften, Funktionen und Look mit Darias Icons (25.10.2026), Sprache mit Phosphor.
          Grammatisches Geschlecht steht nur noch unter Persönliche Angaben (Daria, 27.10.2026). */}
      <NavCard
        title="Meine Kontakte"
        description={
          friendRequests
            ? t('{n, plural, one {# Anfrage} other {# Anfragen}}', {
                n: friendRequests,
              })
            : 'Einladen, Freund:innen, Gesperrt'
        }
        leading={<Icon name="friends" size={size.icon} color={color.accountCards.ink} />}
        accent={color.accountCards.contacts}
        onPress={() => router.push('/account/friends')}
      />
      <NavCard
        title="Sprache"
        description={languageName}
        leading={<Icon name="language" size={size.icon} color={color.accountCards.ink} />}
        accent={color.accountCards.language}
        onPress={() => router.push('/account/language')}
      />
      {/* Tour als große Karte mit Fragezeichen, Beispiele zum Ausprobieren (Daria, 31.10.2026) */}
      <NavCard
        title="Wie geht KiezCoins"
        description="Beispiele zum Ausprobieren"
        leading={<Icon name="questionmark" size={size.icon} color={color.accountCards.ink} />}
        accent={color.accountCards.tour}
        onPress={() => router.push('/tour')}
      />
      {/* Kater-Seite als große Karte unter Look (Daria, 25.10.2026); Kiez-Look: Darias Kater-Icon, Fashionable: Logo-Kater */}
      <NavCard
        title="Auf eine Frotzerei"
        description="Sprüche"
        leading={
          (
            <View style={styles.catBleed}>
              <Icon name="cat" size={26} color={color.accountCards.ink} />
            </View>
          )
        }
        leadingFill={true}
        accent={color.accountCards.cat}
        onPress={() => router.push('/cat')}
      />
      <FieldGroup heading label="Einstellungen">
        <View style={styles.list}>
          <NavRow label="Benachrichtigungen" value={profile.push ? 'Push an' : 'Push aus'} onPress={() => router.push('/account/notifications')} />
          <NavRow label="Zahlungsdaten" value={payoutValue} onPress={() => router.push('/account/payout')} />
          <NavRow label="Umfrage" value="7 Fragen zur App" onPress={() => setSurvey(true)} />
          <NavRow label="Support" value="Frage oder Problem" onPress={() => router.push('/account/support')} />
          {/* Installierte Version, Updates und neue APK (Daria, 2026-11-10) */}
          <NavRow label="App-Version" value={installedVersionLabel()} onPress={() => router.push('/account/version')} />
          <NavRow
            label="Blockierte Personen"
            value={blockedIds.length === 0 ? 'Niemand' : t('{blockedIds} blockiert', { blockedIds: blockedIds.length })}
            onPress={() => router.push({ pathname: '/account/friends', params: { reiter: 'gesperrt' } })}
          />
          {/* Ob jemand aus dem Team Deine Daten abgerufen hat (Daria, 27.10.2026) */}
          <NavRow label="Abrufe Deiner Daten" value="Durchs Team" onPress={() => router.push('/account/data-access')} />
          {moderator ? <NavRow label="Moderation" value="Meldungen prüfen" onPress={() => router.push('/moderation')} /> : null}
          {moderator ? <NavRow label="Umfrage-Ergebnis" value="Antworten zählen" onPress={() => router.push('/account/survey/results')} /> : null}
          {moderator ? <NavRow label="Texte" value="Buttons, Kater, Rechtstexte" onPress={() => router.push('/texts')} /> : null}
        </View>
      </FieldGroup>
      <FieldGroup heading label="Konto">
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
      <FieldGroup heading label="Rechtliches">
        <View style={styles.list}>
          <NavRow label="Community-Regeln" onPress={() => router.push('/legal/regeln')} />
          <NavRow label="Impressum" onPress={() => router.push('/legal/impressum')} />
          <NavRow label="Datenschutz" onPress={() => router.push('/legal/datenschutz')} />
          <NavRow label="Nutzungsbedingungen" value="Testphase" onPress={() => router.push('/legal/bedingungen')} />
        </View>
      </FieldGroup>
      </Animated.View>
      <SurveyOverlay visible={survey} onClose={() => setSurvey(false)} />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  // Derselbe Abstand wie im Inhalt von SubScreen, die Hülle für das Wischen nimmt ihn sonst weg
  slide: { gap: space[16] },
  list: { gap: space[8] },
  // Kater ragt 2 pt über den Kreisrand hinaus, damit der Kreis seine Unterkante rund abschneidet
  catBleed: { marginBottom: -2 },
  villageBleed: { marginBottom: space[6], transform: [{ translateX: 4 }] },
});
