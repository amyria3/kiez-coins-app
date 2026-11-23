import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { Notice } from '../../../components/Content';
import { SubScreen } from '../../../components/Screen';
import { CardActions } from '../../../components/showcase/CardActions';
import { DigitalCard } from '../../../components/showcase/DigitalCard';
import { Text } from '../../../components/T';
import { useAuth } from '../../../data/auth';
import { cardOrigin } from '../../../data/cardActions.mjs';
import { loadPublicShowcase, showcasePublicLink, type Showcase } from '../../../data/showcase';
import { countShowcaseVisit } from '../../../data/showcaseCard';
import { t } from '../../../data/texts';
import { color, space, text } from '../../../theme/tokens';

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
  const [data, setData] = useState<{ showcase: Showcase; acceptsFriends: boolean } | null | undefined>(undefined);
  const team = als === 'team';
  const origin = cardOrigin({ via, von });

  useEffect(() => {
    if (!slug) return;
    loadPublicShowcase(String(slug).toLowerCase()).then(setData, () => setData(null));
  }, [slug]);

  // Aufruf zählt einmal pro Öffnen, das Team nicht (Angemeldete zählt die Ansicht, zu der sie weitergeleitet werden)
  const counted = useRef(false);
  useEffect(() => {
    if (!data || session || team || counted.current) return;
    counted.current = true;
    countShowcaseVisit(data.showcase.slug, 'card');
  }, [data, session, team]);

  // Zurück: im Verlauf zurück, sonst zum Schaufenster im Web
  const publicPage = data ? showcasePublicLink(data.showcase.slug) : 'https://kiezcoins.de';
  const openPublic = (path = '') => {
    const url = `${publicPage}${path}`;
    if (Platform.OS === 'web') window.location.assign(url);
    else Linking.openURL(url).catch(() => {});
  };
  const back = () => (router.canGoBack() ? router.back() : openPublic());

  if (data === undefined) {
    return (
      <SubScreen title="Digitale Visitenkarte" navigation="back" onLeadingPress={back}>
        <ActivityIndicator color={color.text.secondary} />
      </SubScreen>
    );
  }
  if (!data) {
    return (
      <SubScreen title="Digitale Visitenkarte" navigation="back" onLeadingPress={back}>
        <Notice message="Zu diesem Schaufenster gibt es gerade keine Digitale Visitenkarte." />
      </SubScreen>
    );
  }
  const s = data.showcase;
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
  return (
    <SubScreen title="Digitale Visitenkarte" navigation="back" onLeadingPress={back}>
      <View style={styles.page}>
        {team ? (
          <Text style={styles.body}>
            {t('So sieht Deine Digitale Visitenkarte aus. Knöpfe, die nur für andere gedacht sind, wie Folgen oder Kontakt schicken, sind hier ausgeblendet.')}
          </Text>
        ) : null}
        <DigitalCard showcase={s} />
        <CardActions
          showcase={s}
          viewer={team ? 'team' : 'guest'}
          origin={team ? 'manage' : origin}
          canBefriend={data.acceptsFriends}
          onFollow={() => app('folgen')}
          onBefriend={() => app('anfreunden')}
          onShowcase={() => openPublic()}
        />
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[24] },
  body: { ...text.body, color: color.text.primary },
});
