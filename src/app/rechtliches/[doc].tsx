import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { NavRow } from '../../components/Rows';
import { SubScreen } from '../../components/Screen';
import { LEGAL_STAND, legalDocIds, legalDocs, type LegalDocId } from '../../data/legal';
import { color, space, text } from '../../theme/tokens';

/**
 * Route `rechtliches/[doc]` mit `impressum`, `datenschutz` oder `bedingungen`.
 * Erreichbar ohne Anmeldung (Start, Kodex) und aus „Dein Konto“. Texte in `data/legal.ts`.
 */
export default function LegalScreen() {
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const id: LegalDocId = legalDocIds.includes(doc as LegalDocId) ? (doc as LegalDocId) : 'impressum';
  const current = legalDocs[id];

  return (
    <SubScreen title={current.title} subtitle={`Stand ${LEGAL_STAND}`} navigation="back" onLeadingPress={() => router.back()}>
      {current.intro ? <Text style={styles.intro}>{current.intro}</Text> : null}
      {current.sections.map((section, index) => (
        <View key={index} style={styles.section}>
          {section.heading ? (
            <Text style={styles.heading} accessibilityRole="header">
              {section.heading}
            </Text>
          ) : null}
          {section.paragraphs.map((paragraph, p) => (
            <Text key={p} style={styles.paragraph} selectable>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
      <View style={styles.more}>
        {legalDocIds
          .filter((other) => other !== id)
          .map((other) => (
            <NavRow key={other} label={legalDocs[other].title} onPress={() => router.replace(`/rechtliches/${other}`)} />
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
