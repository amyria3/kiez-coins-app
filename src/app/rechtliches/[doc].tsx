import { StyleSheet, View } from 'react-native';
import { Text } from '../../components/T';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { NavRow } from '../../components/Rows';
import { SubScreen } from '../../components/Screen';
import { getLanguage, useTexts } from '../../data/texts';
import { Notice } from '../../components/Content';
import { LEGAL_STAND, legalDocIds, legalDocs, type LegalDocId } from '../../data/legal';
import { color, space, text } from '../../theme/tokens';

/**
 * Route `rechtliches/[doc]` mit `impressum`, `datenschutz` oder `bedingungen`.
 * Erreichbar ohne Anmeldung (Start, Kodex) und aus „Dein Konto“. Texte in `data/legal.ts`,
 * Daria ändert sie über das Texte-CMS (Tabelle `app_texts`, Ort „Rechtstexte“).
 */
export default function LegalScreen() {
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const id: LegalDocId = legalDocIds.includes(doc as LegalDocId) ? (doc as LegalDocId) : 'impressum';
  const current = legalDocs[id];
  const tx = useTexts();

  return (
    <SubScreen title={tx(current.title)} subtitle={tx(`Stand ${LEGAL_STAND}`)} navigation="back" onLeadingPress={() => router.back()}>
      {getLanguage() !== 'de' ? <Notice message="Übersetzung zur Orientierung. Verbindlich ist die deutsche Fassung." /> : null}
      {current.intro ? <Text style={styles.intro}>{tx(current.intro)}</Text> : null}
      {current.sections.map((section, index) => (
        <View key={index} style={styles.section}>
          {section.heading ? (
            <Text style={styles.heading} accessibilityRole="header">
              {tx(section.heading)}
            </Text>
          ) : null}
          {section.paragraphs.map((paragraph, p) => (
            <Text key={p} style={styles.paragraph} selectable>
              {tx(paragraph)}
            </Text>
          ))}
        </View>
      ))}
      <View style={styles.more}>
        {legalDocIds
          .filter((other) => other !== id)
          .map((other) => (
            <NavRow key={other} label={tx(legalDocs[other].title)} onPress={() => router.replace(`/rechtliches/${other}`)} />
          ))}
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  intro: { ...text.body, color: color.text.primary },
  section: { gap: space[8] },
  heading: { ...text.title, color: color.text.primary },
  paragraph: { ...text.body, color: color.text.secondary },
  more: { gap: space[8], paddingTop: space[16] },
});
