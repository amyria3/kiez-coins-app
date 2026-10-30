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

/** Zwei Zeilen je Reiter (Texte von Daria, 30.10.2026) */
const MESSAGE: Record<Audience, [string, string]> = {
  private: ['Das ist Dein privater Space.', 'Diese Posts siehst nur Du.'],
  groups: ['Was Du in einer Gruppe postest, sehen alle Gruppenmitglieder.', 'Du kannst aber auch einen Post als Entwurf speichern.'],
  kiez: ['Deine Posts im Kiez sehen alle im Umkreis von 5 km.', 'Du kannst aber auch einen Post als Entwurf speichern.'],
  everywhere: ['Deine Posts hier sehen alle Nutzer:innen von KiezCoins.', 'Too much Publicity? Wähle aus Kiez, Gruppen oder Privat.'],
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
        <View style={styles.texts}>
          {MESSAGE[audience].map((line) => (
            <Text key={line} style={styles.text}>
              {line}
            </Text>
          ))}
        </View>
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
  texts: { flex: 1, paddingVertical: space[4] },
  text: { ...text.caption, color: color.text.primary },
});
