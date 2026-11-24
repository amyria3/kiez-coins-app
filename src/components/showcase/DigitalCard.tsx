import { Pressable, StyleSheet, View } from 'react-native';

import { contactGroups, placeLine, serviceItems, socialLink } from '../../data/digitalCard.mjs';
import { shortLink, type Showcase } from '../../data/showcase';
import { t } from '../../data/texts';
import { openLink } from '../../lib/places';
import { font, radius, space, text } from '../../theme/tokens';
import { ShowcaseLogo } from '../ShowcasePlaceholder';
import { Text } from '../T';

// Inhaltspalette der Visitenkarte (wie die Druckbare Visitenkarte und kiezcoins.de/s/…/visitenkarte): Gelbgrün, Tinte
const CARD = '#F0FFA6';
const INK = '#000027';
const INK_SOFT = 'rgba(0, 0, 39, 0.66)';

/**
 * Die Digitale Visitenkarte in der App (Daria, 2026-11-23): dieselben Angaben wie kiezcoins.de/s/<kurzname>/visitenkarte,
 * vollständig und ohne Höhengrenze. Logo, Name und Ort, alle Services, Adresse, Öffnungszeiten, Kontakt, Webseiten und
 * soziale Netzwerke (antippbar). Das kleine Vorschaubild (visitenkarte.png) bleibt nur für die Linkvorschau in Messengern.
 * Mit `onPress` ist die ganze Karte ein Knopf, z. B. in der Verwaltung zu ihrer eigenen Ansicht.
 */
export function DigitalCard({ showcase: s, onPress }: { showcase: Showcase; onPress?: () => void }) {
  const place = placeLine({ kiez: s.kiez, address: s.address });
  const services = serviceItems(s.services);
  // Kontakt, Webseiten und soziale Netzwerke getrennt wie auf der Schaufenster-Seite (Daria, 2026-11-23)
  const { email, websites, social } = contactGroups(s);
  const linkRow = (label: string, links: { href: string; text: string }[]) =>
    links.length ? (
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        {links.map((l) => (
          <Text
            key={l.href}
            noTranslate
            style={styles.link}
            accessibilityRole="link"
            onPress={onPress ? undefined : () => openLink(l.href)}
            suppressHighlighting
          >
            {l.text}
          </Text>
        ))}
      </View>
    ) : null;
  const card = (
    <View style={styles.card}>
      <View style={styles.head}>
        <ShowcaseLogo image={s.logo} size={64} tone={{ circle: INK, mask: CARD }} />
        <View style={styles.flex}>
          <Text noTranslate style={styles.name}>
            {s.name}
          </Text>
          {place ? (
            <Text noTranslate style={styles.place}>
              {place}
            </Text>
          ) : null}
        </View>
      </View>
      {services.length ? (
        <View style={styles.chips} accessibilityLabel={t('Kompetenzen und Services')}>
          {services.map((x) => (
            <Text key={x} noTranslate style={styles.chip}>
              {x}
            </Text>
          ))}
        </View>
      ) : null}
      {s.address?.trim() ? <Row label={t('Adresse')} value={s.address.trim()} /> : null}
      {s.openingHours?.trim() ? <Row label={t('Öffnungszeiten')} value={s.openingHours.trim()} /> : null}
      {linkRow(t('Kontakt'), email ? [{ href: `mailto:${email}`, text: email }] : [])}
      {linkRow(t(websites.length === 1 ? 'Webseite' : 'Webseiten'), websites.map((l) => ({ href: l, text: shortLink(l) })))}
      {linkRow(
        t('Soziale Netzwerke'),
        social.map((l) => {
          const n = socialLink(l);
          return { href: l, text: n ? `${n.network} ${n.handle}` : shortLink(l) };
        }),
      )}
      <View style={styles.foot}>
        <Text style={styles.brand}>KiezCoins</Text>
        <Text style={styles.kind}>{t('Digitale Visitenkarte')}</Text>
      </View>
    </View>
  );
  if (!onPress) return card;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t('Digitale Visitenkarte öffnen')} style={({ pressed }) => pressed && styles.pressed}>
      {card}
    </Pressable>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text noTranslate selectable style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[16], padding: space[20], borderRadius: radius.md, backgroundColor: CARD },
  pressed: { opacity: 0.85 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  flex: { flex: 1, gap: space[2] },
  name: { ...text.display, color: INK },
  place: { ...text.body, color: INK },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  chip: {
    ...text.caption,
    color: INK,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: radius.full,
    paddingHorizontal: space[12],
    paddingVertical: space[4],
    overflow: 'hidden',
  },
  row: { gap: space[2] },
  label: { ...text.caption, fontFamily: font.semiBold, color: INK_SOFT },
  value: { ...text.body, color: INK },
  link: { ...text.body, color: INK, textDecorationLine: 'underline' },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: space[4] },
  brand: { ...text.bodyStrong, fontFamily: font.onPhoto, color: INK },
  kind: { ...text.caption, color: INK },
});
