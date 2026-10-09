import { StyleSheet, Text, View } from 'react-native';

import { color, size, space, text } from '../theme/tokens';
import { IconButton } from './IconButton';

type NavigationBarProps = {
  title: string;
  subtitle?: string;
  /** `back` = Push-Navigation (Pfeil), `close` = Modal schließen (X) */
  variant: 'back' | 'close';
  onLeadingPress: () => void;
};

/** Figma „NavigationBar“: Kopfzeile von Unterseiten. */
export function NavigationBar({ title, subtitle, variant, onLeadingPress }: NavigationBarProps) {
  return (
    <View style={styles.bar}>
      <IconButton
        icon={variant === 'back' ? 'chevron-left' : 'close'}
        accessibilityLabel={variant === 'back' ? 'Zurück' : 'Schließen'}
        onPress={onLeadingPress}
      />
      <View style={styles.titleBlock} accessibilityRole="header">
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailingSpace} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 52,
    padding: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.bg.screen,
  },
  titleBlock: { flex: 1, alignItems: 'center' },
  title: { ...text.title, color: color.text.primary, textAlign: 'center' },
  subtitle: { ...text.caption, color: color.text.secondary, textAlign: 'center' },
  trailingSpace: { width: size.touchTarget, height: size.touchTarget },
});
