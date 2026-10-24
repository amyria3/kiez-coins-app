import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { isInstagram, color, radius, space } from '../../theme/tokens';
import { ActionBar } from '../ActionBar';
import { GroupsEmpty } from '../GroupBar';
import { NudgeScrollProvider, useNudgeScroll } from '../Nudge';
import { useGroupTaskForm } from './GroupTaskForm';
import { usePublicComposeForm } from './PublicComposeForm';
import { useBeforeAfterStartForm } from './BeforeAfterForm';
import { TypeSwitch } from './TypeSwitch';

/** Beitragstypen im Kiez, in dieser Reihenfolge (Daria, 23.10.2026) */
const PUBLIC_TYPES = [
  { key: 'individual', label: 'We-Challenge' },
  { key: 'before_after', label: 'Me-Challenge' },
  { key: 'photo', label: 'Bild' },
] as const;
/** In Gruppen: Aufgabe mit Edensteinen oder Vorher-Nachher */
const GROUP_TYPES = [
  { key: 'task', label: 'We-Challenge' },
  { key: 'before_after', label: 'Me-Challenge' },
] as const;

type Props = {
  /** 'public' (Reiter „In der Nähe“) oder die gewählte Gruppe */
  target: 'public' | string | undefined;
  onDone: () => void;
};

/**
 * Inhalt des Erstellen-Blatts über dem Feed. Beide Formulare bleiben geladen, damit ein Wechsel der Pille
 * nichts verliert. Die Bewegung (von unten, federnd) macht feed.tsx.
 */
export function ComposeSheet({ target, onDone }: Props) {
  return (
    <View style={styles.sheet}>
      <View style={[styles.flex, target === 'public' ? null : styles.hidden]}>
        <PublicBody onDone={onDone} />
      </View>
      <View style={[styles.flex, target === 'public' ? styles.hidden : null]}>
        {target && target !== 'public' ? <GroupBody key={target} groupId={target} onDone={onDone} /> : <NoGroup />}
      </View>
    </View>
  );
}

function SheetScroll({ children, actions }: { children: React.ReactNode; actions: React.ReactNode }) {
  const scrollRef = useRef<ScrollView>(null);
  const nudge = useNudgeScroll(scrollRef);
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <NudgeScrollProvider value={nudge}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          scrollEventThrottle={32}
          onScroll={(e) => nudge.onScroll(e.nativeEvent.contentOffset.y)}
        >
          {children}
        </ScrollView>
      </NudgeScrollProvider>
      <ActionBar>{actions}</ActionBar>
    </KeyboardAvoidingView>
  );
}

/** Nach „Vorher speichern“: Blatt zu, weiter zum Timer */
function useOpenTimer(onDone: () => void) {
  const router = useRouter();
  return (id: string) => {
    onDone();
    router.push({ pathname: '/vorher-nachher/[id]', params: { id } });
  };
}

function PublicBody({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState<(typeof PUBLIC_TYPES)[number]['key']>('individual');
  const post = usePublicComposeForm(onDone, type === 'photo' ? 'photo' : 'individual');
  const ba = useBeforeAfterStartForm(undefined, useOpenTimer(onDone));
  const isBa = type === 'before_after';
  return (
    <SheetScroll actions={isBa ? ba.button : post.buttons}>
      <TypeSwitch options={PUBLIC_TYPES} value={type} onChange={setType} />
      {isBa ? ba.fields : post.fields}
    </SheetScroll>
  );
}

function GroupBody({ groupId, onDone }: { groupId: string; onDone: () => void }) {
  const router = useRouter();
  const [type, setType] = useState<(typeof GROUP_TYPES)[number]['key']>('task');
  const task = useGroupTaskForm(groupId, {}, (taskId) => {
    onDone();
    router.push(`/challenge/${taskId}`);
  });
  const ba = useBeforeAfterStartForm(groupId, useOpenTimer(onDone));
  const isBa = type === 'before_after';
  return (
    <SheetScroll actions={isBa ? ba.button : task.button}>
      <TypeSwitch options={GROUP_TYPES} value={type} onChange={setType} />
      {isBa ? ba.fields : task.fields}
    </SheetScroll>
  );
}

function NoGroup() {
  const router = useRouter();
  return (
    <View style={styles.content}>
      <GroupsEmpty onCreate={() => router.push('/gruppen/neu')} onJoin={() => router.push('/gruppen/beitreten')} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: color.bg.screen,
    // Instagram-Look: bündig unter den Reitern, ohne runde Ecken, durch die sonst der Feed scheint
    borderTopLeftRadius: isInstagram ? 0 : radius.sheet,
    borderTopRightRadius: isInstagram ? 0 : radius.sheet,
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  hidden: { display: 'none' },
  content: { padding: space[16], gap: space[16], paddingBottom: space[24] },
});
