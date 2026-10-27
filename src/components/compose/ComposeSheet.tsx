import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { isFashionable, color, radius, space } from '../../theme/tokens';
import { ActionBar } from '../ActionBar';
import { GroupsEmpty } from '../GroupBar';
import { NudgeScrollProvider, useNudgeScroll } from '../Nudge';
import { useGroupTaskForm } from './GroupTaskForm';
import { useGroupPhotoForm } from './GroupPhotoForm';
import { usePublicComposeForm } from './PublicComposeForm';
import { useBeforeAfterStartForm } from './BeforeAfterForm';
import { TypeSwitch } from './TypeSwitch';
import { useComposeContent, type ComposeContent } from './compose';

/** Beitragstypen im Kiez, in dieser Reihenfolge (Daria, 23.10.2026). Alle immer an (Daria, 27.10.2026). */
const PUBLIC_TYPES = [
  { key: 'individual', label: 'We-Challenge' },
  { key: 'before_after', label: 'Me-Challenge' },
  { key: 'photo', label: 'Bild' },
] as const;
/** Privat: ohne We-Challenge, die braucht andere, die sie annehmen (Daria, 27.10.2026) */
const PRIVATE_TYPES = [
  { key: 'before_after', label: 'Me-Challenge' },
  { key: 'photo', label: 'Bild' },
] as const;
/** In Gruppen: Aufgabe mit Edensteinen, Vorher-Nachher oder Bild (Daria, 27.10.2026) */
export const GROUP_TYPES = [
  { key: 'task', label: 'We-Challenge' },
  { key: 'before_after', label: 'Me-Challenge' },
  { key: 'photo', label: 'Bild' },
] as const;

type Props = {
  /** 'private' (Reiter „Privat“), 'public' (Reiter „Kiez“) oder die gewählte Gruppe */
  target: 'private' | 'public' | string | undefined;
  onDone: () => void;
};

/**
 * Inhalt des Erstellen-Blatts über dem Feed. Beide Formulare bleiben geladen, damit ein Wechsel der Pille
 * nichts verliert. Die Bewegung (von unten, federnd) macht feed.tsx.
 */
export function ComposeSheet({ target, onDone }: Props) {
  // Foto, Titel und Text gelten für alle Formulare im Blatt (Daria, 25.10.2026)
  const shared = useComposeContent();
  return (
    <View style={styles.sheet}>
      <View style={[styles.flex, target === 'private' ? null : styles.hidden]}>
        <PublicBody onDone={onDone} shared={shared} isPrivate />
      </View>
      <View style={[styles.flex, target === 'public' ? null : styles.hidden]}>
        <PublicBody onDone={onDone} shared={shared} />
      </View>
      <View style={[styles.flex, target === 'public' || target === 'private' ? styles.hidden : null]}>
        {target && target !== 'public' && target !== 'private' ? (
          <GroupBody key={target} groupId={target} onDone={onDone} shared={shared} />
        ) : (
          <NoGroup />
        )}
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
        <ActionBar>{actions}</ActionBar>
      </NudgeScrollProvider>
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

function PublicBody({ onDone, shared, isPrivate = false }: { onDone: () => void; shared: ComposeContent; isPrivate?: boolean }) {
  const options: readonly { key: (typeof PUBLIC_TYPES)[number]['key']; label: string }[] = isPrivate ? PRIVATE_TYPES : PUBLIC_TYPES;
  const [type, setType] = useState<(typeof PUBLIC_TYPES)[number]['key']>(isPrivate ? 'before_after' : 'individual');
  const post = usePublicComposeForm(onDone, type === 'photo' ? 'photo' : 'individual', shared, isPrivate);
  const ba = useBeforeAfterStartForm(undefined, useOpenTimer(onDone), shared, isPrivate);
  const isBa = type === 'before_after';
  return (
    <SheetScroll actions={isBa ? ba.button : post.buttons}>
      {options.length > 1 ? <TypeSwitch options={options} value={type} onChange={setType} /> : null}
      {isBa ? ba.fields : post.fields}
    </SheetScroll>
  );
}

function GroupBody({ groupId, onDone, shared }: { groupId: string; onDone: () => void; shared: ComposeContent }) {
  const router = useRouter();
  const options = GROUP_TYPES;
  const [type, setType] = useState<(typeof GROUP_TYPES)[number]['key']>('task');
  const openPost = (id: string) => {
    onDone();
    router.push(`/challenge/${id}`);
  };
  const task = useGroupTaskForm(groupId, {}, openPost, shared);
  const photo = useGroupPhotoForm(groupId, openPost, shared);
  const ba = useBeforeAfterStartForm(groupId, useOpenTimer(onDone), shared);
  const form = type === 'before_after' ? ba : type === 'photo' ? photo : task;
  return (
    <SheetScroll actions={form.button}>
      {options.length > 1 ? <TypeSwitch options={options} value={type} onChange={setType} /> : null}
      {form.fields}
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
    // Fashionable Look: bündig unter den Reitern, ohne runde Ecken, durch die sonst der Feed scheint
    borderTopLeftRadius: isFashionable ? 0 : radius.sheet,
    borderTopRightRadius: isFashionable ? 0 : radius.sheet,
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  hidden: { display: 'none' },
  content: { padding: space[16], gap: space[16], paddingBottom: space[24] },
});
