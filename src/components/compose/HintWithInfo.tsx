import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '../../data/texts';
import { color, space, text } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { Text } from '../T';

/**
 * Hinweis oben im Formular mit Info-Icon. Die Erklärung erscheint erst nach einem Tipp aufs Icon
 * und verschwindet beim zweiten Tipp (Daria, 27.10.2026: „nur bei Bedarf“).
 */
export function HintWithInfo({ hint, info }: { hint: string; info: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[styles.hint, styles.flex]}>{hint}</Text>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('Erklärung')}
          accessibilityState={{ expanded: open }}
          style={styles.info}
        >
          <Icon name="info" size={18} color={open ? color.accent.primary : color.text.secondary} />
        </Pressable>
      </View>
      {open ? <Text style={[styles.hint, styles.explain]}>{info}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[6] },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space[8] },
  flex: { flex: 1 },
  hint: { ...text.body, fontSize: 14, lineHeight: 19, color: color.text.secondary },
  explain: { color: color.text.primary },
  info: { paddingTop: 1 },
});
