import { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Text } from './T';
import { Cat } from './icons/Brand';
import { Icon } from './icons/Icon';
import { apkDownloadUrl, fetchRelease, installedVersionCode } from '../data/appRelease';
import { useAuth } from '../data/auth';
import { useStore } from '../data/store';
import { color, radius, space, text } from '../theme/tokens';

/**
 * Hinweis „Neue Version da“ in der Android-App (Daria, 2026-10-25).
 * Erscheint, wenn im Bucket `downloads` eine neuere APK liegt als die installierte. Der Knopf lädt sie herunter,
 * Android installiert sie über die alte, die Daten bleiben. „Schließen“ blendet den Hinweis für einen Tag aus.
 * Ist die installierte APK älter als `min_version_code`, deckt der Hinweis die App ab und lässt sich nicht schließen.
 * Prüft beim Start und jedes Mal, wenn die App wieder nach vorn kommt.
 */
const KEY = 'kiez-update-hint-weg';
const DAY_MS = 24 * 60 * 60 * 1000;

type Hint = { latest: number; required: boolean };

async function dismissedFor(latest: number): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as { version: number; at: number }) : null;
    return !!saved && saved.version === latest && Date.now() - saved.at < DAY_MS;
  } catch {
    return false;
  }
}

export function UpdateHint() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { mode } = useStore();
  const installed = installedVersionCode();
  const live = mode === 'live' && !!session && installed !== null;
  const [hint, setHint] = useState<Hint | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!live || installed === null) return;
    let running = false;
    const check = async () => {
      if (running) return;
      running = true;
      try {
        const { latest, min } = await fetchRelease();
        if (latest === null || latest <= installed) return setHint(null);
        const required = min !== null && installed < min;
        if (!required && (await dismissedFor(latest))) return;
        setHint({ latest, required });
      } catch {
        // kein Netz: beim nächsten Mal
      } finally {
        running = false;
      }
    };
    check();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => sub.remove();
  }, [live, installed]);

  if (!hint) return null;

  const close = () => {
    AsyncStorage.setItem(KEY, JSON.stringify({ version: hint.latest, at: Date.now() })).catch(() => {});
    setHint(null);
  };

  const download = async () => {
    setBusy(true);
    try {
      await Linking.openURL(await apkDownloadUrl());
    } catch {
      // Browser ließ sich nicht öffnen: Knopf bleibt, die Person versucht es noch einmal
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={hint.required ? styles.cover : [styles.wrap, { top: insets.top + space[8] }]}
      pointerEvents={hint.required ? 'auto' : 'box-none'}
    >
      <View style={[styles.card, hint.required && { marginTop: insets.top + space[8] }]}>
        <Cat height={34} />
        <View style={styles.body}>
          <Text style={styles.title}>{hint.required ? 'Diese Version ist zu alt.' : 'Jo, meine Friends haben eine neue Version für Dich!'}</Text>
          <Text style={styles.steps}>Lade sie herunter und installiere sie über die alte. Deine Daten bleiben.</Text>
          <Pressable onPress={download} disabled={busy} style={[styles.button, busy && styles.busy]} accessibilityRole="button">
            <Text style={styles.buttonText}>Herunterladen</Text>
          </Pressable>
        </View>
        {hint.required ? null : (
          <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Hinweis schließen">
            <Icon name="close" size={16} color={color.text.secondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space[16], right: space[16], zIndex: 20 },
  cover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    paddingHorizontal: space[16],
    backgroundColor: color.bg.screen,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[12],
    padding: space[16],
    borderRadius: radius.lg,
    backgroundColor: color.bg.surface,
    borderWidth: 1,
    borderColor: color.line.hairline,
  },
  body: { flex: 1, gap: space[6] },
  title: { ...text.title, fontSize: 16, lineHeight: 21, color: color.text.primary },
  steps: { ...text.body, color: color.text.secondary },
  button: {
    alignSelf: 'flex-start',
    marginTop: space[4],
    backgroundColor: color.accent.primary,
    borderRadius: radius.md,
    paddingVertical: space[8],
    paddingHorizontal: space[16],
  },
  busy: { opacity: 0.6 },
  buttonText: { ...text.buttonDarkOnLight, color: color.text.onAccent },
});
