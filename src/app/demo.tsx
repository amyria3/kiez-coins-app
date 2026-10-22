import { StyleSheet, View } from 'react-native';
import { Text } from '../components/T';
import { useRouter, type Href } from 'expo-router';

import { Button } from '../components/Button';
import { FieldGroup, Notice } from '../components/Content';
import { Chip, ChipGroup, RadioOption } from '../components/Form';
import { SubScreen } from '../components/Screen';
import { useAuth } from '../data/auth';
import { useStore } from '../data/store';
import type { FeedState } from '../data/types';
import { color, text } from '../theme/tokens';

// prototyp-only: Nicht Teil des Figma-Designs. Ersetzt Push-Benachrichtigungen und zeigt auf Wunsch
// Beispieldaten (nur auf diesem Gerät), mit Rollenwechsel. Öffnen: Logo im Feed lange drücken.

const feedStates: { key: FeedState; label: string }[] = [
  { key: 'filled', label: 'Gefüllt' },
  { key: 'loading', label: 'Lädt' },
  { key: 'empty', label: 'Leer' },
  { key: 'error', label: 'Fehler' },
  { key: 'offline', label: 'Offline' },
];

export default function DemoMenu() {
  const router = useRouter();
  const { users, challenges, currentUserId, feedState, mode, dispatch, load } = useStore();
  const { session } = useAuth();
  const demo = mode === 'demo';

  const tasks: { label: string; href: Href }[] = [];
  for (const c of challenges) {
    if (c.authorId === currentUserId && c.status === 'reported')
      tasks.push({ label: `Erledigung prüfen: ${c.title}`, href: `/challenge/${c.id}/review` });
    if (c.authorId === currentUserId && c.status === 'payment_open')
      tasks.push({ label: `Coins bezahlen: ${c.title}`, href: `/challenge/${c.id}/pay` });
    if (c.assigneeId === currentUserId && c.status === 'paid_marked')
      tasks.push({ label: `Coins angekommen? ${c.title}`, href: `/challenge/${c.id}/payment` });
  }

  const open = (href: Href) => {
    router.back();
    router.push(href);
  };

  return (
    <SubScreen
      title="Demo"
      subtitle={demo ? 'Beispieldaten' : 'Echte Daten'}
      navigation="close"
      onLeadingPress={() => router.back()}
    >
      <Notice message="Dieses Menü gibt es nur im Prototyp. Es ersetzt Benachrichtigungen und zeigt auf Wunsch Beispieldaten." />
      <FieldGroup label="Daten">
        <RadioOption
          label="Echte Daten (Supabase)"
          selected={!demo}
          onPress={() => {
            if (!demo || !session) return;
            dispatch({ type: 'setFeedState', feedState: 'loading' });
            load(session.user.id);
          }}
        />
        <RadioOption
          label="Beispieldaten, nur auf diesem Gerät"
          selected={demo}
          onPress={() => dispatch({ type: 'useSampleData' })}
        />
      </FieldGroup>
      {demo ? (
        <FieldGroup label="Du bist">
          {users.filter((u) => u.id !== 'lena').map((u) => (
            <RadioOption
              key={u.id}
              label={u.name}
              selected={u.id === currentUserId}
              onPress={() => dispatch({ type: 'setCurrentUser', userId: u.id })}
            />
          ))}
        </FieldGroup>
      ) : null}
      <FieldGroup label="Benachrichtigungen">
        {tasks.length === 0 ? (
          <Text style={styles.empty}>Gerade nichts zu tun.</Text>
        ) : (
          <View style={styles.list}>
            {tasks.map((t) => (
              <Button key={String(t.href)} variant="secondary" label={t.label} onPress={() => open(t.href)} />
            ))}
          </View>
        )}
      </FieldGroup>
      <FieldGroup label="Weitere Screens">
        <View style={styles.list}>
          <Button
            variant="secondary"
            label="Onboarding ansehen"
            onPress={() => {
              router.back();
              router.replace('/onboarding/welcome');
            }}
          />
          <Button variant="secondary" label="Was Du so machst" onPress={() => open('/reise')} />
          <Button variant="secondary" label="Zahlungsdaten" onPress={() => open('/settings/payout')} />
          {demo ? (
            <Button variant="secondary" label="Person melden" onPress={() => open('/user/peter/report')} />
          ) : null}
        </View>
      </FieldGroup>
      <FieldGroup label="Zustand des Feeds">
        <ChipGroup>
          {feedStates.map((s) => (
            <Chip
              key={s.key}
              label={s.label}
              selected={feedState === s.key}
              onPress={() => dispatch({ type: 'setFeedState', feedState: s.key })}
            />
          ))}
        </ChipGroup>
      </FieldGroup>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  empty: { ...text.body, color: color.text.secondary },
});
