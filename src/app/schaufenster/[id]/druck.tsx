import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Button } from '../../../components/Button';
import { Explanation, FieldGroup, Notice } from '../../../components/Content';
import { CheckOption } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { Text } from '../../../components/T';
import { WEB_APP_URL } from '../../../data/groups';
import { loadShowcase, type Showcase } from '../../../data/showcase';
import { useStore } from '../../../data/store';
import { t } from '../../../data/texts';
import { CARD_H, CARD_W, cardData, downloadCard, drawBusinessCard, printCard, printLink, servicesPlain, type CardSides } from '../../../lib/businessCard';
import { useGoBack } from '../../../lib/goBack';
import { color, radius, space, text } from '../../../theme/tokens';

const web = Platform.OS === 'web';

/**
 * Route `schaufenster/[id]/druck`: die druckbare Visitenkarte als PDF (2026-11-23), abgesetzt von der digitalen
 * Visitenkarte mit ihren Weiterleitungsoptionen. Vorder- und Rückseite im Format 85 × 55 mm, Herunterladen als Bilder
 * und Drucken oder als PDF sichern, am Rechner und am Handy. Die Karte wird im Browser gezeichnet
 * (lib/businessCardCanvas.ts); in der Android-App öffnet der Knopf dieselbe Seite im Browser. Nur fürs Team.
 *
 * „Auf der Karte zeigen“ (Daria, 2026-11-23): Häkchen bei Links und Services. Vorausgewählt sind die ersten Einträge
 * der Liste, so viele wie ganz auf die Karte passen. Die Reihenfolge der Links legt „Seite bearbeiten“ fest. Passt eine
 * Auswahl nicht ganz, sagt der Bildschirm, was fehlt, statt es still wegzulassen.
 */
export default function PrintableBusinessCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack();
  const { currentUserId } = useStore();
  const [showcase, setShowcase] = useState<Showcase | null | undefined>(undefined);
  const [team, setTeam] = useState(false);
  const [sides, setSides] = useState<CardSides | null>(null);
  const [preview, setPreview] = useState<{ front: string; back: string } | null>(null);
  // Auswahl je Eintrag; null, bis die erste Zeichnung zeigt, wie viel passt
  const [linkOn, setLinkOn] = useState<boolean[] | null>(null);
  const [serviceOn, setServiceOn] = useState<boolean[] | null>(null);
  const links = useMemo(() => showcase?.links ?? [], [showcase]);
  const services = useMemo(() => servicesPlain(showcase?.services), [showcase]);

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
    const chosen = linkOn && serviceOn;
    const data = chosen
      ? { ...cardData(showcase), links: links.filter((_, i) => linkOn[i]), serviceLines: services.filter((_, i) => serviceOn[i]) }
      : cardData(showcase);
    drawBusinessCard(data).then((s) => {
      if (off || !s) return;
      if (!chosen) {
        // Erste Zeichnung mit allem: vorausgewählt sind die ersten Einträge, so viele wie passen
        setLinkOn(links.map((_, i) => i < s.fit.links));
        setServiceOn(services.map((_, i) => i < s.fit.services));
        return;
      }
      setSides(s);
      setPreview({ front: s.front.toDataURL('image/png'), back: s.back.toDataURL('image/png') });
    });
    return () => {
      off = true;
    };
  }, [showcase, links, services, linkOn, serviceOn]);

  // Gewählt, aber nicht (ganz) auf der Karte
  const missingLinks = sides && linkOn ? linkOn.filter(Boolean).length - sides.fit.links : 0;
  const missingServices = sides && serviceOn ? serviceOn.filter(Boolean).length - sides.fit.services : 0;
  const toggle = (list: boolean[] | null, set: (v: boolean[]) => void, i: number) => list && set(list.map((v, j) => (j === i ? !v : v)));

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
        {web && linkOn && serviceOn && (links.length || services.length) ? (
          <FieldGroup label="Auf der Karte zeigen">
            {links.length ? (
              <View style={styles.choices}>
                <Text style={styles.label}>{t('Links, in der Reihenfolge aus „Seite bearbeiten“')}</Text>
                {links.map((l, i) => (
                  <CheckOption key={`l${i}`} label={printLink(l)} selected={linkOn[i]} onPress={() => toggle(linkOn, setLinkOn, i)} />
                ))}
              </View>
            ) : null}
            {services.length ? (
              <View style={styles.choices}>
                <Text style={styles.label}>Services</Text>
                {services.map((v, i) => (
                  <CheckOption key={`s${i}`} label={v.replace(/^· /, '')} selected={serviceOn[i]} onPress={() => toggle(serviceOn, setServiceOn, i)} />
                ))}
              </View>
            ) : null}
            {missingLinks > 0 || missingServices > 0 ? (
              <Notice
                variant="warning"
                message={missingText(missingLinks, missingServices)}
              />
            ) : null}
          </FieldGroup>
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

/** „Nicht alles passt“ mit den Zahlen, die fehlen; Einzahl und Mehrzahl stehen im Text, damit die Übersetzung stimmt */
function missingText(links: number, services: number): string {
  const parts = [
    links === 1 ? t('1 Link') : links > 1 ? t('{count} Links', { count: String(links) }) : '',
    services === 1 ? t('1 Service') : services > 1 ? t('{count} Services', { count: String(services) }) : '',
  ].filter(Boolean);
  return t('Nicht alles passt auf die Karte, es fehlen: {what}. Wähle weniger aus oder kürze die Services.', { what: parts.join(', ') });
}

const styles = StyleSheet.create({
  page: { gap: space[24] },
  sides: { gap: space[8] },
  label: { ...text.caption, color: color.text.secondary },
  card: { width: '100%', aspectRatio: CARD_W / CARD_H, borderRadius: radius.md, marginBottom: space[12] },
  buttons: { gap: space[12] },
  choices: { gap: space[8] },
});
