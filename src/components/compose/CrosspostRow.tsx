import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CROSSPOST_ACTIVE, CROSSPOST_PLATFORMS, useCrosspostInterest } from '../../data/crosspost';
import { color, radius, scheme, size, space, stroke, text } from '../../theme/tokens';
import { Button } from '../Button';
import { Icon } from '../icons/Icon';
import { Text } from '../T';

/**
 * Zeile „Weiterposten“ im Erstellen-Blatt öffentlicher Posts (Entwurf Daria, 05.11.2026): Die Auswahl der
 * Plattformen steckt hinter dem Zahnrad und öffnet sich als Blatt. Noch nicht freigegeben (`CROSSPOST_ACTIVE`):
 * Alle Plattformen stehen als „Kommt bald“ da, darunter der Knopf, der Interesse an Meta und X zählt.
 */
export function CrosspostRow() {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const [counted, count] = useCrosspostInterest();

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Weiterposten"
        onPress={() => setOpen(true)}
      >
        <Icon name="settings" size={size.icon} color={color.text.secondary} />
        <View style={styles.flex}>
          <Text style={styles.label}>Weiterposten</Text>
          <Text style={styles.caption}>{CROSSPOST_ACTIVE ? 'BlueSky, Mastodon' : 'Kommt bald'}</Text>
        </View>
        <Icon name="chevron-right" size={size.icon} color={color.text.secondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <BlurView intensity={18} tint={scheme} style={StyleSheet.absoluteFill} />
        <Pressable style={styles.backdrop} accessibilityLabel="Schließen" onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space[20] }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <Text style={styles.title}>Weiterposten</Text>
          <Text style={styles.caption}>Deinen Post zusätzlich auf anderen Plattformen veröffentlichen, mit Link zurück zu KiezCoins.</Text>
          <View style={styles.card}>
            {CROSSPOST_PLATFORMS.map((p, i) => (
              <View key={p.key} style={[styles.platform, i > 0 && styles.divider]}>
                <View style={[styles.badge, { backgroundColor: p.tint }]}>
                  <Text noTranslate style={styles.letter}>{p.letter}</Text>
                </View>
                <View style={styles.flex}>
                  <Text noTranslate style={styles.label}>{p.label}</Text>
                  <Text style={styles.caption}>{p.free ? 'Kostenlos' : 'Im Paket'}</Text>
                </View>
                <Text style={styles.soon}>Kommt bald</Text>
              </View>
            ))}
          </View>
          {counted ? (
            <Text style={styles.thanks}>Danke! Wir zählen Dich mit.</Text>
          ) : (
            <Button label="Ich würde diese Funktion für Meta & X nutzen" variant="secondary" onPress={count} />
          )}
          <Button label="Fertig" onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    minHeight: size.touchTarget,
    paddingHorizontal: space[16],
    paddingVertical: space[12],
    borderRadius: radius.lg,
    borderWidth: stroke.thin,
    borderColor: color.line.raised,
    backgroundColor: color.bg.surface,
  },
  pressed: { opacity: 0.7 },
  flex: { flex: 1, gap: space[2] },
  label: { ...text.body, fontSize: 15, color: color.text.primary },
  caption: { ...text.caption, color: color.text.secondary },
  backdrop: { flex: 1, backgroundColor: color.bg.scrim },
  sheet: {
    gap: space[12],
    paddingHorizontal: space[16],
    paddingTop: space[8],
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: stroke.thin,
    borderColor: color.line.raised,
    backgroundColor: color.bg.screen,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: radius.full, backgroundColor: color.bg.surface, marginBottom: space[4] },
  title: { ...text.title, color: color.text.primary },
  card: {
    paddingHorizontal: space[16],
    borderRadius: radius.lg,
    borderWidth: stroke.thin,
    borderColor: color.line.raised,
    backgroundColor: color.bg.surface,
  },
  platform: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[8] },
  divider: { borderTopWidth: stroke.thin, borderTopColor: color.line.hairline },
  badge: { width: 32, height: 32, borderRadius: radius.md, borderWidth: stroke.thin, borderColor: color.line.hairline, alignItems: 'center', justifyContent: 'center' },
  letter: { ...text.title, fontSize: 15, color: '#FFFFFF' },
  soon: { ...text.caption, color: color.text.secondary },
  thanks: { ...text.body, color: color.accent.confirmation, textAlign: 'center' },
});
