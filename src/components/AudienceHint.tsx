import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Text } from './T';
import { IconButton } from './IconButton';
import { Icon } from './icons/Icon';
import { t } from '../data/texts';
import { color, isFashionable, radius, space, text } from '../theme/tokens';

/**
 * Hinweis unter dem Umschalter „Im Kiez / In Gruppen“ (UX-Audit, Daria, 27.10.2026): wer sieht, was Du hier postest.
 * Das Kreuz blendet ihn aus, je Reiter einmal und dauerhaft auf diesem Gerät.
 * Sichtbarkeit laut Policy „Challenges lesen“: Kiez = alle Angemeldeten, Gruppe = nur Mitglieder.
 */
export type Audience = 'kiez' | 'groups';

const KEY = (audience: Audience) => `kiez-hinweis-sichtbarkeit-${audience}`;

const MESSAGE: Record<Audience, string> = {
  kiez: 'Was Du hier postest, sehen alle, die bei Kiez Coins angemeldet sind.',
  groups: 'Was Du hier postest, sehen nur die Mitglieder der gewählten Gruppe.',
};

export function useAudienceHint(audience: Audience): [boolean, () => void] {
  const [hidden, setHidden] = useState<Record<Audience, boolean>>({ kiez: true, groups: true });
  useEffect(() => {
    let alive = true;
    Promise.all((['kiez', 'groups'] as const).map((a) => AsyncStorage.getItem(KEY(a)).catch(() => null))).then(([kiez, groups]) => {
      if (alive) setHidden({ kiez: !!kiez, groups: !!groups });
    });
    return () => {
      alive = false;
    };
  }, []);
  const dismiss = () => {
    setHidden((h) => ({ ...h, [audience]: true }));
    AsyncStorage.setItem(KEY(audience), '1').catch(() => {});
  };
  return [!hidden[audience], dismiss];
}

export function AudienceHint({ audience, onClose }: { audience: Audience; onClose: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.hint}>
        <Icon name="info" color={color.text.primary} />
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
    paddingLeft: space[12],
    paddingRight: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.bg.surface,
  },
  text: { ...text.caption, color: color.text.primary, flex: 1 },
});
