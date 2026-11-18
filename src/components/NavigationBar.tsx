import { useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './T';

import { color, size, space, text } from '../theme/tokens';
import { Icon } from './icons/Icon';
import { IconButton } from './IconButton';
import { t } from '../data/texts';
import { SectionIndexButton, SectionIndexMenu, useSectionIndex } from './SectionIndex';

type NavigationBarProps =
  | {
      title: string;
      subtitle?: string;
      /** `back` = Push-Navigation (Pfeil), `close` = Modal schließen (X) */
      variant: 'back' | 'close';
      onLeadingPress: () => void;
      /** Rechts statt des leeren Platzes, z. B. „Verwalten“ im Schaufenster */
      trailing?: ReactNode;
    }
  | {
      /** `feed` = Abschluss-Screen: kein Zurück, rechts „Zum Feed“ */
      variant: 'feed';
      onLeadingPress: () => void;
      title?: undefined;
      subtitle?: undefined;
      trailing?: undefined;
    };

/**
 * Figma „NavigationBar“ (Back, Close, Feed): Kopfzeile von Unterseiten.
 * Hat die Seite mindestens zwei Abschnitte, öffnen das Listen-Icon rechts und ein Tipp auf den Titel den
 * Schnellsprung zu den Abschnitten (SectionIndex.tsx, Daria, 2026-11-18). Ein eigenes `trailing` hat Vorrang vor dem Icon.
 */
export function NavigationBar({ title, subtitle, variant, onLeadingPress, trailing }: NavigationBarProps) {
  const sections = useSectionIndex();
  const bar = useRef<View>(null);
  const [menuTop, setMenuTop] = useState<number | null>(null);
  const openSections = () =>
    bar.current?.measureInWindow((_x, y, _w, h) => setMenuTop(y + h));
  if (variant === 'feed') {
    return (
      <Pressable
        style={styles.bar}
        onPress={onLeadingPress}
        accessibilityRole="link"
        accessibilityLabel={t('Zum Feed')}
        hitSlop={{ top: 4, bottom: 4 }}
      >
        <View style={styles.trailingSpace} />
        <View style={styles.titleBlock}>
          <Text style={styles.feedLabel}>Zum Feed</Text>
        </View>
        <View style={[styles.trailingSpace, styles.center]}>
          <Icon name="chevron-right" />
        </View>
      </Pressable>
    );
  }
  const titleContent = (
    <>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </>
  );
  return (
    <View ref={bar} style={styles.bar} collapsable={false}>
      <IconButton
        icon={variant === 'back' ? 'chevron-left' : 'close'}
        accessibilityLabel={variant === 'back' ? t('Zurück') : t('Schließen')}
        onPress={onLeadingPress}
      />
      {sections ? (
        <Pressable
          style={({ pressed }) => [styles.titleBlock, styles.titlePress, pressed && styles.pressed]}
          onPress={openSections}
          accessibilityRole="button"
          accessibilityHint={t('Zeigt die Abschnitte dieser Seite')}
        >
          {titleContent}
        </Pressable>
      ) : (
        <View style={styles.titleBlock} accessibilityRole="header">
          {titleContent}
        </View>
      )}
      {trailing ?? (sections ? <SectionIndexButton onPress={openSections} /> : <View style={styles.trailingSpace} />)}
      {sections && menuTop != null ? (
        <SectionIndexMenu entries={sections} anchor={menuTop} onClose={() => setMenuTop(null)} />
      ) : null}
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
  titlePress: { minHeight: size.touchTarget, justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  title: { ...text.title, color: color.text.primary, textAlign: 'center' },
  subtitle: { ...text.caption, color: color.text.secondary, textAlign: 'center' },
  trailingSpace: { width: size.touchTarget, height: size.touchTarget },
  center: { alignItems: 'center', justifyContent: 'center' },
  feedLabel: { ...text.buttonDarkOnLight, color: color.text.primary, textAlign: 'center' },
});
