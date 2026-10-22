import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useStore } from '../data/store';
import { t } from '../data/texts';
import type { ImageSource } from '../data/types';
import { color, space, text } from '../theme/tokens';
import { FieldGroup } from './Content';
import { Segments } from './FeedHeader';
import { Chip, ChipGroup } from './Form';
import { IconButton } from './IconButton';
import { Text } from './T';

export type Carry = { title?: string; text?: string; photo?: ImageSource };

const uriOf = (photo?: ImageSource) =>
  typeof photo === 'object' && photo && 'uri' in photo && typeof photo.uri === 'string' ? photo.uri : undefined;

/** Zwischen öffentlicher Challenge und Gruppenaufgabe wechseln. Titel, Text und Foto kommen mit. */
export function switchPostTarget(target: 'public' | string, carry: Carry) {
  const params = {
    ...(carry.title ? { title: carry.title } : {}),
    ...(carry.text ? { text: carry.text } : {}),
    ...(uriOf(carry.photo) ? { photo: uriOf(carry.photo) } : {}),
  };
  router.dismissTo('/feed');
  setTimeout(() => {
    if (target === 'public') router.push({ pathname: '/challenge/create/step-1', params });
    else router.push({ pathname: '/gruppen/[id]/aufgabe', params: { id: target, ...params } });
  }, 50);
}

type CreateHeaderProps = {
  /** Was Du gerade machst, z. B. „Challenge erstellen · Schritt 1 von 2“ */
  line: string;
  /** 'public' oder die ID der Gruppe */
  current: 'public' | string;
  carry: Carry;
  leading: 'close' | 'back';
  onLeadingPress: () => void;
  /** Ohne Wechsel (z. B. Entwurf bearbeiten): Pille zeigt nur an */
  locked?: boolean;
};

/**
 * Kopf beim Erstellen (Daria, 22.10.2026): der Feed-Kopf in schmal. Statt Logo und Begrüßung eine Zeile, was Du
 * gerade machst; sie gleitet von oben herein. Die Pille „In der Nähe“ / „Gruppen“ bleibt wie im Feed und wechselt
 * zwischen öffentlicher Challenge und Gruppenaufgabe.
 */
export function CreateHeader({ line, current, carry, leading, onLeadingPress, locked }: CreateHeaderProps) {
  const { groups } = useStore();
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter]);

  const choose = (key: 'nearby' | 'groups') => {
    if (locked) return;
    if (key === 'nearby' && current !== 'public') switchPostTarget('public', carry);
    if (key === 'groups' && current === 'public') {
      if (groups.length) switchPostTarget(groups[0].id, carry);
      else {
        router.dismissTo('/feed');
        setTimeout(() => router.push('/gruppen'), 50);
      }
    }
  };

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.row,
          {
            opacity: enter,
            transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
          },
        ]}
      >
        <IconButton
          icon={leading === 'back' ? 'chevron-left' : 'close'}
          accessibilityLabel={leading === 'back' ? t('Zurück') : t('Schließen')}
          onPress={onLeadingPress}
        />
        <Text style={styles.line} numberOfLines={1} accessibilityRole="header">
          {line}
        </Text>
      </Animated.View>
      <View style={styles.tabs}>
        <Segments
          tabs={[
            { key: 'nearby', label: 'In der Nähe' },
            { key: 'groups', label: 'Gruppen' },
          ]}
          selectedKey={current === 'public' ? 'nearby' : 'groups'}
          onChange={choose}
        />
      </View>
    </View>
  );
}

/** Bei mehreren Gruppen: in welche Gruppe. Nur im Gruppenmodus. */
export function GroupChoice({ current, carry }: { current: string; carry: Carry }) {
  const { groups } = useStore();
  if (groups.length < 2) return null;
  return (
    <FieldGroup label="Gruppe">
      <ChipGroup>
        {groups.map((g) => (
          <Chip key={g.id} label={g.name} selected={current === g.id} onPress={() => g.id !== current && switchPostTarget(g.id, carry)} />
        ))}
      </ChipGroup>
    </FieldGroup>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[8], paddingBottom: space[8] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[8], minHeight: 52 },
  line: { ...text.title, flex: 1, color: color.text.primary },
  tabs: { paddingHorizontal: space[16] },
});
