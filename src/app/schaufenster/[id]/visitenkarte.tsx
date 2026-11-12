import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Button } from '../../../components/Button';
import { Notice } from '../../../components/Content';
import { SubScreen } from '../../../components/Screen';
import { Text } from '../../../components/T';
import { WEB_APP_URL } from '../../../data/groups';
import { loadShowcase, type Showcase } from '../../../data/showcase';
import { useStore } from '../../../data/store';
import { t } from '../../../data/texts';
import { CARD_H, CARD_W, cardData, downloadCard, drawBusinessCard, printCard, shareCard, type CardSides } from '../../../lib/businessCard';
import { useGoBack } from '../../../lib/goBack';
import { color, radius, space, text } from '../../../theme/tokens';

const web = Platform.OS === 'web';

/**
 * Route `schaufenster/[id]/visitenkarte` (Daria, 2026-11-12): Visitenkarte des Schaufensters zum Teilen und Drucken.
 * Vorschau beider Seiten, darunter „Als Bild teilen“, „Bilder herunterladen“ und „Drucken oder als PDF“.
 * Gezeichnet wird im Browser (lib/businessCard.ts). In der Android-App öffnet der Knopf dieselbe Seite im Browser.
 */
export default function ShowcaseBusinessCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack();
  const { currentUserId } = useStore();
  const [showcase, setShowcase] = useState<Showcase | null | undefined>(undefined);
  const [team, setTeam] = useState(false);
  const [sides, setSides] = useState<CardSides | null>(null);
  const [preview, setPreview] = useState<{ front: string; back: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadShowcase(id, currentUserId).then((d) => {
        setShowcase(d?.showcase ?? null);
        setTeam(!!d?.access.team);
      });
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

  if (showcase === undefined) {
    return (
      <SubScreen title="Visitenkarte" navigation="back" onLeadingPress={goBack}>
        <ActivityIndicator color={color.text.secondary} />
      </SubScreen>
    );
  }
  if (showcase === null || !team) {
    return (
      <SubScreen title="Visitenkarte" navigation="back" onLeadingPress={goBack}>
        <Notice message="Die Visitenkarte kann nur das Team des Schaufensters exportieren." />
      </SubScreen>
    );
  }

  if (!web) {
    return (
      <SubScreen title="Visitenkarte" navigation="back" onLeadingPress={goBack}>
        <View style={styles.page}>
          <Text style={styles.body}>
            {t('Die Visitenkarte entsteht im Browser. Dort teilst Du sie als Bild oder speicherst sie als PDF für die Druckerei.')}
          </Text>
          <Button
            label="Im Browser öffnen"
            onPress={() => Linking.openURL(`${WEB_APP_URL}/schaufenster/${showcase.id}/visitenkarte`).catch(() => {})}
          />
        </View>
      </SubScreen>
    );
  }

  const share = async () => {
    if (!sides) return;
    setBusy(true);
    const r = await shareCard(sides, showcase.name);
    setBusy(false);
    setNote(r === 'downloaded' ? t('Beide Seiten liegen jetzt in Deinen Downloads.') : null);
  };

  return (
    <SubScreen title="Visitenkarte" navigation="back" onLeadingPress={goBack}>
      <View style={styles.page}>
        <Text style={styles.body}>
          {t('Vorne stehen Name, Kiez und ein Instant-Code zu Eurem Schaufenster, hinten Adresse, Öffnungszeiten, Services und Links. Ändern kannst Du die Angaben unter „Schaufenster bearbeiten“.')}
        </Text>
        {preview ? (
          <View style={styles.sides}>
            <Text style={styles.label}>Vorne</Text>
            <Image source={{ uri: preview.front }} style={styles.card} contentFit="contain" accessibilityLabel={t('Vorderseite der Visitenkarte')} />
            <Text style={styles.label}>Hinten</Text>
            <Image source={{ uri: preview.back }} style={styles.card} contentFit="contain" accessibilityLabel={t('Rückseite der Visitenkarte')} />
          </View>
        ) : (
          <ActivityIndicator color={color.text.secondary} />
        )}
        <View style={styles.buttons}>
          <Button label="Als Bild teilen" busy={busy} disabled={!sides} onPress={share} />
          <Button label="Drucken oder als PDF" variant="secondary" disabled={!sides} onPress={() => sides && printCard(sides, showcase.name)} />
          <Button label="Bilder herunterladen" variant="ghost" disabled={!sides} onPress={() => sides && downloadCard(sides, showcase.name)} />
        </View>
        {note ? <Text style={styles.meta}>{note}</Text> : null}
        <Text style={styles.meta}>
          {t('Format 85 × 55 mm wie eine Scheckkarte. Für die Druckerei im Druckdialog „Als PDF sichern“ wählen: Das PDF hat zwei Seiten, vorne und hinten.')}
        </Text>
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[24] },
  sides: { gap: space[8] },
  body: { ...text.body, color: color.text.primary },
  label: { ...text.caption, color: color.text.secondary },
  card: { width: '100%', aspectRatio: CARD_W / CARD_H, borderRadius: radius.md, marginBottom: space[12] },
  buttons: { gap: space[12] },
  meta: { ...text.caption, color: color.text.secondary },
});
