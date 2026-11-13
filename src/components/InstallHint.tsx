import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Frost } from './Glass';
import { Text } from './T';
import { t } from '../data/texts';

import { Icon } from './icons/Icon';
import { color, radius, space, text } from '../theme/tokens';
import { KaterRund } from './Content';

/**
 * Hinweis „Auf den Home-Bildschirm legen“ (Daria, 23.10.2026).
 * iOS-Safari bietet das nie von selbst an, deshalb erklärt der Kater die Handgriffe.
 * Chrome auf Android meldet `beforeinstallprompt`, dann installiert ein Knopf die App direkt.
 * Erscheint nur im Browser, nicht in der installierten App. Nach „Schließen“ nie wieder.
 */
const KEY = 'kiez-install-hint-weg';
const DELAY_MS = 4500;

type InstallEvent = Event & { prompt: () => Promise<void> };

function installed(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

function dismissed(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function InstallHint() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'ios' | 'android' | null>(null);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || installed() || dismissed()) return;
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (ios) timer = setTimeout(() => setMode('ios'), DELAY_MS);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
      timer = setTimeout(() => setMode('android'), DELAY_MS);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onPrompt);
    };
  }, []);

  // Über den Abzeichen-Szenen bleibt der Hinweis weg, damit er die Animation nicht verdeckt (Daria, 2026-11-02)
  const pathname = usePathname();
  if (!mode || pathname.startsWith('/badge')) return null;

  const close = () => {
    try {
      window.localStorage.setItem(KEY, '1');
    } catch {}
    setMode(null);
  };

  const install = async () => {
    await installEvent?.prompt().catch(() => {});
    close();
  };

  return (
    <View style={[styles.wrap, { top: insets.top + space[8] }]} pointerEvents="box-none">
      <Frost style={styles.card} contentStyle={styles.cardContent}>
        {<KaterRund size={36} />}
        <View style={styles.body}>
          <Text style={styles.title}>Lege mich auf Deinen Home-Bildschirm!</Text>
          {mode === 'ios' ? (
            <Text style={styles.steps}>Tippe in Safari auf Teilen (zuerst auf „…“, falls Du es nicht siehst) und dann auf „Zum Home-Bildschirm“.</Text>
          ) : (
            <Pressable onPress={install} style={styles.button} accessibilityRole="button">
              <Text style={styles.buttonText}>Installieren</Text>
            </Pressable>
          )}
        </View>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('Hinweis schließen')}>
          <Icon name="close" size={16} color={color.text.secondary} />
        </Pressable>
      </Frost>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space[16], right: space[16], zIndex: 20 },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.line.hairline,
  },
  cardContent: { flexDirection: 'row', alignItems: 'flex-start', gap: space[12], padding: space[16] },
  body: { flex: 1, gap: space[6] },
  title: { ...text.cardTitleCompact, color: color.text.primary },
  steps: { ...text.body, color: color.text.secondary },
  button: {
    alignSelf: 'flex-start',
    marginTop: space[4],
    backgroundColor: color.accent.primary,
    borderRadius: radius.md,
    paddingVertical: space[8],
    paddingHorizontal: space[16],
  },
  buttonText: { ...text.buttonDarkOnLight, color: color.text.onAccent },
});
