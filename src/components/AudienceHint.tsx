import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Text } from './T';
import { IconButton } from './IconButton';
import { t } from '../data/texts';
import { color, isFashionable, radius, space, text } from '../theme/tokens';

/**
 * Hinweis unter dem Umschalter „Privat / Gruppe / Kiez“ (UX-Audit, Daria, 27.10.2026): wer sieht, was Du hier postest.
 * Sichtbar in den ersten fünf Sitzungen (siehe unten).
 * Texte von Daria (27.10.2026). Gruppe = nur Mitglieder laut Policy „Challenges lesen“.
 */
export type Audience = 'private' | 'kiez' | 'groups' | 'everywhere';

const MESSAGE: Record<Audience, string> = {
  private: 'Was Du hier postest, siehst nur Du.',
  kiez: 'Was Du hier postest, sehen alle Nutzer:innen in Deinem Kiez.',
  groups: 'Was Du hier postest, sehen nur die Mitglieder in dieser Gruppe.',
  everywhere: 'Hier siehst Du Beiträge von überall. Mitmachen geht ab 5 km Entfernung nur auf Anfrage.',
};

/**
 * Sichtbar in den ersten fünf Sitzungen, danach dauerhaft weg (Daria, 30.10.2026). Das Kreuz blendet den Hinweis
 * nur für die laufende Sitzung aus. Eine Sitzung beginnt mit dem Start der App oder wenn sie nach mindestens
 * 30 Minuten im Hintergrund wieder nach vorn kommt. Gezählt wird pro Gerät.
 */
const SESSIONS_SHOWN = 5;
const NEW_SESSION_AFTER_MS = 30 * 60 * 1000;
const SESSION_KEY = 'kiez-hinweis-sitzungen';

let session = 0; // 0 = noch nicht gelesen
let closed = new Set<Audience>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

async function startSession() {
  let count = 0;
  try {
    count = Number(await AsyncStorage.getItem(SESSION_KEY)) || 0;
  } catch {
    // ohne Speicher: wie eine erste Sitzung
  }
  session = count + 1;
  closed = new Set();
  AsyncStorage.setItem(SESSION_KEY, String(session)).catch(() => {});
  notify();
}

let started = false;
let backgroundSince: number | null = null;
function ensureStarted() {
  if (started) return;
  started = true;
  startSession();
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      if (backgroundSince !== null && Date.now() - backgroundSince >= NEW_SESSION_AFTER_MS) startSession();
      backgroundSince = null;
    } else if (backgroundSince === null) {
      backgroundSince = Date.now();
    }
  });
}

export function useAudienceHint(audience: Audience): [boolean, () => void] {
  const [, rerender] = useState(0);
  useEffect(() => {
    ensureStarted();
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  const visible = session > 0 && session <= SESSIONS_SHOWN && !closed.has(audience);
  const dismiss = () => {
    closed.add(audience);
    notify();
  };
  return [visible, dismiss];
}

export function AudienceHint({ audience, onClose }: { audience: Audience; onClose: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.hint}>
        <Text style={styles.text}>{MESSAGE[audience]}</Text>
        <IconButton icon="close" iconSize={14} iconColor={color.text.secondary} accessibilityLabel={t('Hinweis schließen')} onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fashionable Look: Liste ohne Abstände, daher eigener Rand oben und unten
  wrap: { paddingHorizontal: space[16], paddingVertical: isFashionable ? space[8] : 0 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    paddingVertical: space[4],
    // Ohne Icon (Daria, 27.10.2026)
    paddingLeft: space[16],
    paddingRight: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.bg.surface,
  },
  text: { ...text.caption, color: color.text.primary, flex: 1 },
});
