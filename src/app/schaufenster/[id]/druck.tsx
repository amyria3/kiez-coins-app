import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Button } from '../../../components/Button';
import { Explanation, Notice } from '../../../components/Content';
import { SubScreen } from '../../../components/Screen';
import { Text } from '../../../components/T';
import { WEB_APP_URL } from '../../../data/groups';
import { loadShowcase, type Showcase } from '../../../data/showcase';
import { useStore } from '../../../data/store';
import { t } from '../../../data/texts';
import { CARD_H, CARD_W, cardData, downloadCard, drawBusinessCard, printCard, type CardSides } from '../../../lib/businessCard';
import { useGoBack } from '../../../lib/goBack';
import { color, radius, space, text } from '../../../theme/tokens';

const web = Platform.OS === 'web';

/**
 * Route `schaufenster/[id]/druck`: die druckbare Visitenkarte als PDF (2026-11-23), abgesetzt von der digitalen
 * Visitenkarte mit ihren Weiterleitungsoptionen. Vorder- und Rückseite im Format 85 × 55 mm, Herunterladen als Bilder
 * und Drucken oder als PDF sichern, am Rechner und am Handy. Die Karte wird im Browser gezeichnet
 * (lib/businessCardCanvas.ts); in der Android-App öffnet der Knopf dieselbe Seite im Browser. Nur fürs Team.
 */
export default function PrintableBusinessCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack();
  const { currentUserId } = useStore();
  const [showcase, setShowcase] = useState<Showcase | null | undefined>(undefined);
  const [team, setTeam] = useState(false);
  const [sides, setSides] = useState<CardSides | null>(null);
  const [preview, setPreview] = useState<{ front: string; back: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadShowcase(id, currentUserId).then(
        (d) => {
          setShowcase(d?.showcase ?? null);
          setTeam(!!d?.access.team);
        },
        () => setShowcase(null),
      );
    }, [id, currentUserId]),
  );

  useEffect(() => {
    if (!showcase || !web) return;
    let off = false;
    drawBusinessCard(cardData(showcase)).then((s) => {
      if (off || !s) return;
      setSides(s);
      setPreview({ front: s.front.toDataURL('image/png'), back: s.back.toDataURL('image/png') });
    });
    return () => {
      off = true;
    };
  }, [showcase]);

  const title = 'Druckbare Visitenkarte';
  if (showcase === undefined) {
    return (
      <SubScreen title={title} navigation="back" onLeadingPress={goBack}>
        <ActivityIndicator color={color.text.secondary} />
      </SubScreen>
    );
  }
  if (showcase === null || !team) {
    return (
      <SubScreen title={title} navigation="back" onLeadingPress={goBack}>
        <Notice message="Die druckbare Visitenkarte gibt es nur für das Team des Schaufensters." />
      </SubScreen>
    );
  }

  return (
    <SubScreen title={title} navigation="back" onLeadingPress={goBack}>
      <View style={styles.page}>
        <Explanation
          question="Was ist die druckbare Visitenkarte?"
          answer="Eine Karte aus Papier im Format 85 × 55 mm wie eine Scheckkarte. Vorne stehen Name, Kiez und ein QR-Code zu Eurer digitalen Visitenkarte, hinten Adresse, Öffnungszeiten, Services und Links. Ändern kannst Du die Angaben unter „Seite bearbeiten“."
        />
        {web ? (
          preview ? (
            <View style={styles.sides}>
              <Text style={styles.label}>Vorne</Text>
              <Image source={{ uri: preview.front }} style={styles.card} contentFit="contain" accessibilityLabel={t('Vorderseite der Visitenkarte')} />
              <Text style={styles.label}>Hinten</Text>
              <Image source={{ uri: preview.back }} style={styles.card} contentFit="contain" accessibilityLabel={t('Rückseite der Visitenkarte')} />
            </View>
          ) : (
            <ActivityIndicator color={color.text.secondary} />
          )
        ) : null}
        {web ? (
          <View style={styles.buttons}>
            <Button label="Drucken oder als PDF" disabled={!sides} onPress={() => sides && printCard(sides, showcase.name)} />
            <Button label="Als Bilder herunterladen" variant="secondary" disabled={!sides} onPress={() => sides && downloadCard(sides, showcase.name)} />
            <Notice message="Für die Druckerei im Druckdialog „Als PDF sichern“ wählen: Das PDF hat zwei Seiten, vorne und hinten." />
          </View>
        ) : (
          <Button
            label="Im Browser öffnen"
            iconEnd="external"
            onPress={() => Linking.openURL(`${WEB_APP_URL}/schaufenster/${showcase.id}/druck`).catch(() => {})}
          />
        )}
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[24] },
  sides: { gap: space[8] },
  label: { ...text.caption, color: color.text.secondary },
  card: { width: '100%', aspectRatio: CARD_W / CARD_H, borderRadius: radius.md, marginBottom: space[12] },
  buttons: { gap: space[12] },
});
