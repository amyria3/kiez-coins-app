import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';

import { FieldGroup } from '../../components/Content';
import { CrownIcon } from '../../components/icons/Brand';
import { Icon } from '../../components/icons/Icon';

import { NavGroup, NavGroupRow, NavList, NavRow, ProfileHeader } from '../../components/Rows';
import { KATER_AVATAR_YELLOW, katerAvatarSvg } from '../../components/icons/katerAvatarSvg';
import { SubScreen } from '../../components/Screen';
import { TabBar } from '../../components/TabBar';
import { SurveyOverlay } from '../../components/SurveyOverlay';
import { salutation } from '../../data/format';
import { useAuth } from '../../data/auth';
import { isModerator, loadFriends } from '../../data/remote';
import { useCurrentUser, useStore } from '../../data/store';
import { color, space } from '../../theme/tokens';
import { getLanguage, getLanguageChoice, languages, t } from '../../data/texts';
import { look, lookName } from '../../theme/look';
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
  const modesOn = MODES.filter((m) => modes.isVisible(m.key)).length;
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

  // Kiez: eigene Karten für Aktivität, Posts und Schaufenster. Mono: jeder Bereich eine Gruppe, Zeilen durch
  // Trennlinien getrennt, ohne graue Fläche (Daria, 2026-11-27: „Manchmal mit, manchmal ohne Trennlinie“)
  const oneGroup = !!color.accountCards.divider;
  const activityRow = (
    <NavGroupRow
      title="Meine Aktivität"
      description="Geschafft, Ziele und Gruppen"
      leading={<CrownIcon height={24} fill={color.accountCards.ink} />}
      background={color.accountCards.activity}
      onPress={() => router.push('/me')}
    />
  );
  const postsRow = (
    <NavGroupRow
      title="Meine Posts"
      description="Entwürfe, offen, geschlossen"
      leading={<Icon name="ship" size={ROW_ICON} color={color.accountCards.ink} />}
      background={color.accountCards.posts}
      onPress={() => router.push('/manage')}
    />
  );

  const showcaseRow = (
    <NavGroupRow
      title="Schaufenster"
      description="Für Laden, Verein oder Club"
      leading={<Icon name="village" size={ROW_ICON} color={color.accountCards.ink} />}
      background={color.accountCards.showcase}
      onPress={() => router.push('/schaufenster')}
    />
  );

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
      {/* Gruppen nach dem Farbcode der App (Daria, 2026-11-17). Zeilen einer Gruppe in Stufen heller. */}
      <FieldGroup heading label="Du on KiezCoins">
        {oneGroup ? (
          <NavGroup>
            {activityRow}
            {postsRow}
          </NavGroup>
        ) : (
          <>
            <NavGroup>{activityRow}</NavGroup>
            <NavGroup>{postsRow}</NavGroup>
          </>
        )}
      </FieldGroup>
      <FieldGroup heading label="Gemeinsam">
        <NavGroup>
          {/* Kontakte zuerst (Daria, 2026-11-17) */}
          <NavGroupRow
            title="Meine Kontakte"
            description={
              friendRequests
                ? t('{n, plural, one {# Anfrage} other {# Anfragen}}', {
                    n: friendRequests,
                  })
                : 'Einladen, Freund:innen, Gesperrt'
            }
            leading={<Icon name="friends" size={ROW_ICON} color={color.accountCards.ink} />}
            background={color.accountCards.friendship[0]}
            onPress={() => router.push('/account/friends')}
          />
          {modes.isVisible('groups') ? (
            <NavGroupRow
              title="Meine Gruppen"
              description={groups.length === 0 ? 'Gründen oder beitreten' : groups.length === 1 ? '1 Gruppe' : t('{groups} Gruppen', { groups: groups.length })}
              leading={<Icon name="behausung" size={ROW_ICON} color={color.accountCards.ink} />}
              background={color.accountCards.friendship[1]}
              onPress={() => router.push('/groups')}
            />
          ) : null}
          {showcase && oneGroup ? showcaseRow : null}
        </NavGroup>
        {/* „Schaufenster“, wenn Schaufenster für die Person freigeschaltet ist (Daria, 2026-11-10) */}
        {showcase && !oneGroup ? <NavGroup>{showcaseRow}</NavGroup> : null}
      </FieldGroup>
      <FieldGroup heading label="App">
        <NavGroup>
          {/* Funktionen an- und abschalten (Daria, 24.10.2026), einzeilig als Zahl (Daria, 2026-11-17) */}
          <NavGroupRow
            title="Meine Features"
            description={t('{on} von {all} an', { on: modesOn, all: MODES.length })}
            leading={<Icon name="switch" size={ROW_ICON} color={color.accountCards.ink} />}
            background={color.accountCards.functional[0]}
            onPress={() => router.push('/account/features')}
          />
          <NavGroupRow
            title="Sprache"
            description={languageName}
            leading={<Icon name="language" size={ROW_ICON} color={color.accountCards.ink} />}
            background={color.accountCards.functional[1]}
            onPress={() => router.push('/account/language')}
          />
          {/* Look wählen: Kiez, Light-Modus, Mono (Daria, 2026-11-25) */}
          <NavGroupRow
            title="Look"
            description={lookName(look)}
            leading={<Icon name="look" size={ROW_ICON} color={color.accountCards.ink} />}
            background={color.accountCards.functional[2]}
            onPress={() => router.push('/account/look')}
          />
          {/* Tour mit Fragezeichen, Beispiele zum Ausprobieren (Daria, 31.10.2026) */}
          <NavGroupRow
            title="Wie geht KiezCoins"
            description="Beispiele zum Ausprobieren"
            leading={<Icon name="questionmark" size={ROW_ICON} color={color.accountCards.ink} />}
            background={color.accountCards.functional[2]}
            onPress={() => router.push('/tour')}
          />
        </NavGroup>
      </FieldGroup>
      {/* Der Kater steht allein, in der Farbe seiner Sprechblase; im Kreis die Bildmarke (Daria, 2026-11-17) */}
      <View style={styles.catGap}>
        <NavGroup>
          <NavGroupRow
            title="Auf eine Frotzerei"
            description="Sprüche"
            leading={
              <View style={styles.catCircle}>
                <View style={styles.catBleed}>
                  <SvgXml xml={katerAvatarSvg()} width={58} height={58} />
                </View>
              </View>
            }
            background={color.accountCards.cat}
            ink={color.accountCards.catInk}
            inkSoft={color.accountCards.catInkSoft}
            onPress={() => router.push('/cat')}
          />
        </NavGroup>
      </View>
      <FieldGroup heading label="Einstellungen">
        <NavList>
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
        </NavList>
      </FieldGroup>
      <FieldGroup heading label="Konto">
        <NavList>
          <NavRow
            label="Zugangsdaten"
            value={hasPassword ? 'E-Mail und Passwort' : 'Passwort fehlt noch'}
            onPress={() => router.push('/account/credentials')}
          />
          <NavRow label="Abmelden" onPress={toStart} />
          <NavRow label="Konto 3 Monate pausieren" onPress={() => router.push('/account/pause')} />
          <NavRow label="Konto löschen" tone="danger" onPress={() => router.push('/account/delete')} />
        </NavList>
      </FieldGroup>
      <FieldGroup heading label="Rechtliches">
        <NavList>
          <NavRow label="Community-Regeln" onPress={() => router.push('/legal/regeln')} />
          <NavRow label="Impressum" onPress={() => router.push('/legal/impressum')} />
          <NavRow label="Datenschutz" onPress={() => router.push('/legal/datenschutz')} />
          <NavRow label="Nutzungsbedingungen" value="Testphase" onPress={() => router.push('/legal/bedingungen')} />
        </NavList>
      </FieldGroup>
      </Animated.View>
      <SurveyOverlay visible={survey} onClose={() => setSurvey(false)} />
    </SubScreen>
  );
}

/** Icons in den Zeilen der Kontoseite, 24 pt hoch */
const ROW_ICON = 16;

const styles = StyleSheet.create({
  // Derselbe Abstand wie im Inhalt von SubScreen, die Hülle für das Wischen nimmt ihn sonst weg
  slide: { gap: space[16] },
  // Kater der Bildmarke größer als sein gelbgrüner Kreis, der Kreis schneidet Ohren und Unterkante ab
  catCircle: { width: 40, height: 40, alignItems: 'center', justifyContent: 'flex-end', backgroundColor: KATER_AVATAR_YELLOW },
  catBleed: { marginBottom: -10 },
  // Etwas Abstand nach oben, der Kater steht allein
  catGap: { marginTop: space[8] },
});
