import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CROSSPOST_PLATFORMS,
  isLivePlatform,
  loadCrosspostAccounts,
  loadCrosspostSelection,
  saveCrosspostSelection,
  useCrosspostEnabled,
  useCrosspostInterest,
  type CrosspostAccount,
  type LivePlatform,
} from '../../data/crosspost';
import { color, radius, scheme, size, space, stroke, text } from '../../theme/tokens';
import { Button } from '../Button';
import { Toggle } from '../Form';
import { Icon } from '../icons/Icon';
import { Text } from '../T';
import { t } from '../../data/texts';

/**
 * Zeile „Weiterposten“ im Erstellen-Blatt öffentlicher Posts (Entwurf Daria, 05.11.2026): Die Auswahl der
 * Plattformen steckt hinter dem Zahnrad und öffnet sich als Blatt. Freigegeben für alle (`CROSSPOST_ACTIVE`, 09.11.2026):
 * Schalter für verbundene Konten bei BlueSky, Mastodon, Instagram und Facebook. X steht als „Kommt bald“ da,
 * darunter der Knopf, der Interesse an X zählt. Die Wahl
 * bleibt auf dem Gerät gespeichert; nach dem Veröffentlichen postet die Vorschau dorthin weiter.
 */
export function CrosspostRow() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const [counted, count] = useCrosspostInterest();
  const enabled = useCrosspostEnabled();
  const [accounts, setAccounts] = useState<CrosspostAccount[]>([]);
  const [selected, setSelected] = useState<LivePlatform[]>([]);

  useEffect(() => {
    if (!enabled) return;
    loadCrosspostAccounts().then(setAccounts);
    loadCrosspostSelection().then(setSelected);
  }, [enabled, open]);

  const connected = (p: LivePlatform) => accounts.some((a) => a.platform === p);
  const active = selected.filter(connected);
  const toggle = (p: LivePlatform, on: boolean) => {
    const next = on ? [...selected.filter((x) => x !== p), p] : selected.filter((x) => x !== p);
    setSelected(next);
    saveCrosspostSelection(next);
  };
  const summary = !enabled
    ? 'Kommt bald'
    : active.length
      ? active.map((p) => CROSSPOST_PLATFORMS.find((x) => x.key === p)?.label).join(', ')
      : 'Aus';

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={t('Weiterposten')}
        onPress={() => setOpen(true)}
      >
        <Icon name="settings" size={size.icon} color={color.text.secondary} />
        <View style={styles.flex}>
          <Text style={styles.label}>Weiterposten</Text>
          <Text style={styles.caption}>{summary}</Text>
        </View>
        <Icon name="chevron-right" size={size.icon} color={color.text.secondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <BlurView intensity={18} tint={scheme} style={StyleSheet.absoluteFill} />
        <Pressable style={styles.backdrop} accessibilityLabel={t('Schließen')} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space[20] }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <Text style={styles.title}>Weiterposten</Text>
          <Text style={styles.caption}>Deinen Post zusätzlich auf anderen Plattformen veröffentlichen, mit Link zurück zu KiezCoins.</Text>
          <View style={styles.card}>
            {CROSSPOST_PLATFORMS.map((p, i) => {
              const live = enabled && isLivePlatform(p.key);
              const isConnected = live && connected(p.key as LivePlatform);
              return (
              <View key={p.key} style={[styles.platform, i > 0 && styles.divider]}>
                <View style={[styles.badge, { backgroundColor: p.tint }]}>
                  <Text noTranslate style={styles.letter}>{p.letter}</Text>
                </View>
                <View style={styles.flex}>
                  <Text noTranslate style={styles.label}>{p.label}</Text>
                  <Text noTranslate={isConnected} style={styles.caption}>
                    {isConnected ? accounts.find((a) => a.platform === p.key)?.handle : p.free ? 'Kostenlos' : 'Im Paket'}
                  </Text>
                </View>
                {isConnected ? (
                  <Toggle
                    label={p.label}
                    value={selected.includes(p.key as LivePlatform)}
                    onValueChange={(on) => toggle(p.key as LivePlatform, on)}
                  />
                ) : live ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setOpen(false);
                      router.push('/account/weiterposten');
                    }}
                  >
                    <Text style={styles.connect}>Verbinden</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.soon}>Kommt bald</Text>
                )}
              </View>
              );
            })}
          </View>
          {counted ? (
            <Text style={styles.thanks}>Danke! Wir zählen Dich mit.</Text>
          ) : (
            <Button label="Ich würde diese Funktion für X nutzen" variant="secondary" onPress={count} />
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
  connect: { ...text.caption, color: color.accent.primary },
  thanks: { ...text.body, color: color.accent.confirmation, textAlign: 'center' },
});
