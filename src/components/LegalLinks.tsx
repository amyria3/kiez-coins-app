import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { color, space, text } from '../theme/tokens';

const LINKS = [
  { doc: 'nutzungsbedingungen', label: 'Nutzungsbedingungen' },
  { doc: 'datenschutz', label: 'Datenschutz' },
  { doc: 'impressum', label: 'Impressum' },
] as const;

/** Kleine Textlinks zu den Rechtstexten, z. B. unter dem Anmeldeformular. */
export function LegalLinks() {
  const router = useRouter();
  return (
    <View style={styles.row}>
      {LINKS.map((link) => (
        <Pressable
          key={link.doc}
          accessibilityRole="link"
          hitSlop={8}
          onPress={() => router.push({ pathname: '/rechtliches/[doc]', params: { doc: link.doc } })}
        >
          <Text style={styles.link}>{link.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[16] },
  link: { ...text.caption, color: color.text.secondary, textDecorationLine: 'underline' },
});
