import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { Notice } from '../../../components/Content';
import { SubScreen } from '../../../components/Screen';
import { BusinessCard } from '../../../components/showcase/BusinessCard';
import { useAuth } from '../../../data/auth';
import { cardOrigin } from '../../../data/cardActions.mjs';
import { acceptsFriends, loadPublicShowcase, showcasePublicLink, type Showcase } from '../../../data/showcase';
import { countShowcaseVisit } from '../../../data/showcaseCard';
import { useWideWeb, WEB_WIDE_FROM, WEB_WIDE_MAX_WIDTH } from '../../../theme/layout';
import { color, space } from '../../../theme/tokens';

/**
 * Route `s/[slug]/visitenkarte`: die Digitale Visitenkarte für alle, auch ohne Anmeldung (Daria, 2026-11-23: eine
 * Komponente für App und Web). kiezcoins.de/s/<kurzname>/visitenkarte leitet hierher (api/s.mjs), der QR-Code der
 * Karte also auch. Karte und Knöpfe sind dieselben wie in `schaufenster/[id]/visitenkarte`.
 * - Angemeldet: weiter zu `schaufenster/[id]/visitenkarte`, dort erkennt die App Team und Mitglieder.
 * - Gast: Kontakt speichern, schicken und tauschen, QR-Code, Mail, folgen über die Anmeldung.
 * - `?als=team`: Das Team öffnet die Karte aus der App im Browser ohne Anmeldung (Schaufenster › „Im Web ansehen“).
 *   Die Kennung ist kein Schutz: Wer sie von Hand anhängt, sieht nur die Knöpfe zum Weitergeben.
 */
export default function PublicBusinessCard() {
  const { slug, von, via, als } = useLocalSearchParams<{ slug: string; von?: string; via?: string; als?: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [showcase, setShowcase] = useState<Showcase | null | undefined>(undefined);
  const [friendable, setFriendable] = useState(false);
  const team = als === 'team';
  // Desktop (Daria, 2026-11-28): Die Seite nutzt im Browser die volle Breite, ab 1040 px Karte links, Knöpfe rechts
  useWideWeb();
  const { width } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= WEB_WIDE_FROM;
  const origin = cardOrigin({ via, von });

  useEffect(() => {
    if (!slug) return;
    loadPublicShowcase(String(slug).toLowerCase()).then(setShowcase, () => setShowcase(null));
  }, [slug]);
  // „Anfreunden“ kommt nach, damit die Karte nicht darauf wartet
  useEffect(() => {
    if (!showcase || session) return;
    acceptsFriends(showcase.id).then(setFriendable, () => setFriendable(false));
  }, [showcase, session]);

  // Aufruf zählt einmal pro Öffnen, das Team nicht (Angemeldete zählt die Ansicht, zu der sie weitergeleitet werden)
  const counted = useRef(false);
  useEffect(() => {
    if (!showcase || session || team || counted.current) return;
    counted.current = true;
    countShowcaseVisit(showcase.slug, 'card');
  }, [showcase, session, team]);

  // Zurück: im Verlauf zurück, sonst zum Schaufenster im Web
  const publicPage = showcase ? showcasePublicLink(showcase.slug) : 'https://kiezcoins.de';
  const openPublic = (path = '') => {
    const url = `${publicPage}${path}`;
    if (Platform.OS === 'web') window.location.assign(url);
    else Linking.openURL(url).catch(() => {});
  };
  const back = () => (router.canGoBack() ? router.back() : openPublic());

  const frame = (children: ReactNode) => (
    <View style={styles.outer}>
      <View style={[styles.inner, wide && styles.innerWide]}>
        <SubScreen title="Digitale Visitenkarte" navigation="back" onLeadingPress={back}>
          {children}
        </SubScreen>
      </View>
    </View>
  );

  if (showcase === undefined) {
    return frame(<ActivityIndicator color={color.text.secondary} />);
  }
  if (!showcase) {
    return frame(<Notice message="Zu diesem Schaufenster gibt es gerade keine Digitale Visitenkarte." />);
  }
  const s = showcase;
  if (session) {
    return (
      <Redirect
        href={{
          pathname: '/schaufenster/[id]/visitenkarte',
          params: { id: s.id, ...(via === 'karte' ? { via } : {}), ...(von === 'schaufenster' ? { von } : {}) },
        }}
      />
    );
  }

  const app = (param: 'folgen' | 'anfreunden') => router.push({ pathname: '/schaufenster/[id]', params: { id: s.id, [param]: '1' } });
  return frame(
    <BusinessCard
      showcase={s}
      viewer={team ? 'team' : 'guest'}
      origin={team ? 'manage' : origin}
      canBefriend={friendable}
      onFollow={() => app('folgen')}
      onBefriend={() => app('anfreunden')}
      onShowcase={() => openPublic()}
      wide={wide}
    />,
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: color.bg.screen, alignItems: 'center' },
  inner: { flex: 1, width: '100%', maxWidth: WEB_WIDE_MAX_WIDTH },
  // Außen 40 px, dazu 16 px Innenabstand von SubScreen: Inhalt 1000 px breit wie kiezcoins.de/s/<kurzname>
  innerWide: { paddingHorizontal: space[40] - space[16] },
});
