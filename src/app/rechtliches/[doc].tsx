import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { SubScreen } from '../../components/Screen';
import { isLegalDocKey, legalDoc } from '../../legal';
import { color, space, text } from '../../theme/tokens';

/** Route `rechtliches/[doc]`: Impressum, Datenschutzerklärung, Nutzungsbedingungen (Texte aus `src/legal/texts.json`). */
export default function LegalScreen() {
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const key = isLegalDocKey(doc) ? doc : 'impressum';
  const { title, updated, sections } = legalDoc(key);

  return (
    <SubScreen title={title} navigation="back" onLeadingPress={() => router.back()}>
      <Text style={styles.updated}>Stand: {updated}</Text>
      {sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={styles.heading} accessibilityRole="header">
            {section.heading}
          </Text>
          {section.paragraphs.map((paragraph, i) => (
            <Text key={i} style={styles.paragraph} selectable>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  updated: { ...text.caption, color: color.text.secondary },
  section: { gap: space[8] },
  heading: { ...text.title, color: color.text.primary },
  paragraph: { ...text.body, lineHeight: 21, color: color.text.secondary },
});
