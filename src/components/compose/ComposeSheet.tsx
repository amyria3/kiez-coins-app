import { peekRoutinePost } from '../../data/reminders';
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
import { DraftStrip } from './DraftStrip';
import { useComposeSheetContent, type ComposeContent } from './compose';

/** Beitragstypen im Kiez, in dieser Reihenfolge (Daria, 2026-10-31). Alle immer an (Daria, 27.10.2026). */
const PUBLIC_TYPES = [
  // Text vor Bild, in allen Reitern (Daria, 07.11.2026)
  { key: 'text', label: 'Text' },
  { key: 'photo', label: 'Bild' },
  { key: 'before_after', label: 'Me-Challenge' },
  { key: 'individual', label: 'We-Challenge' },
] as const;
/** Privat: ohne We-Challenge, die braucht andere, die sie annehmen (Daria, 27.10.2026) */
const PRIVATE_TYPES = [
  { key: 'text', label: 'Text' },
  { key: 'photo', label: 'Bild' },
  { key: 'before_after', label: 'Me-Challenge' },
] as const;
/** In Gruppen: Aufgabe mit Edensteinen, Vorher-Nachher oder Bild (Daria, 27.10.2026) */
export const GROUP_TYPES = [
  { key: 'text', label: 'Text' },
  { key: 'photo', label: 'Bild' },
  { key: 'before_after', label: 'Me-Challenge' },
  { key: 'task', label: 'We-Challenge' },
] as const;

/** Gewählte Art, gleich für Privat, Kiez und Gruppen: Die We-Challenge heißt im Kiez `individual`, in Gruppen `task`. */
type Kind = 'photo' | 'text' | 'before_after' | 'we';
type KindProps = { kind: Kind; setKind: (kind: Kind) => void };

type Props = {
  /** 'private' (Reiter „Privat“), 'public' (Reiter „Kiez“) oder die gewählte Gruppe */
  target: 'private' | 'public' | string | undefined;
  onDone: () => void;
  /** Der Ort (Pille darüber) ist bestätigt: Jetzt wird der Typ lila, bis die Person ihn berührt (Daria, 2026-10-31) */
  placeConfirmed?: boolean;
};

/**
 * Inhalt des Erstellen-Blatts über dem Feed. Beide Formulare bleiben geladen, damit ein Wechsel der Pille
 * nichts verliert. Die Bewegung (von unten, federnd) macht feed.tsx.
 */
export function ComposeSheet({ target, onDone, placeConfirmed = true }: Props) {
  // Foto, Titel und Text gelten für alle Formulare im Blatt (Daria, 25.10.2026),
  // seit 07.11.2026 auch Blätter, Zusatzfotos, Text auf dem Foto und die gewählte Art
  // Aus einer Erinnerung: Titel und Beschreibung als Me-Challenge vorbelegt (Daria, 2026-11-10)
  const [routine] = useState(peekRoutinePost);
  const shared = useComposeSheetContent(routine ? { title: routine.title, text: routine.text } : {});
  // Vorausgewählt ist überall der Post (Bild), privat wie im Kiez (Daria, 2026-11-05)
  const [kind, setKind] = useState<Kind>(routine ? 'before_after' : 'photo');
  return (
    <View style={styles.sheet}>
      <View style={[styles.flex, target === 'private' ? null : styles.hidden]}>
        <PublicBody onDone={onDone} shared={shared} isPrivate turn={placeConfirmed} kind={kind} setKind={setKind} />
      </View>
      <View style={[styles.flex, target === 'public' ? null : styles.hidden]}>
        <PublicBody onDone={onDone} shared={shared} turn={placeConfirmed} kind={kind} setKind={setKind} />
      </View>
      <View style={[styles.flex, target === 'public' || target === 'private' ? styles.hidden : null]}>
        {target && target !== 'public' && target !== 'private' ? (
          <GroupBody key={target} groupId={target} onDone={onDone} shared={shared} turn={placeConfirmed} kind={kind} setKind={setKind} />
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

/** Nach „Vorher posten“: Blatt zu, weiter zum Timer */
function useOpenTimer(onDone: () => void) {
  const router = useRouter();
  return (id: string) => {
    onDone();
    router.push({ pathname: '/before-after/[id]', params: { id } });
  };
}

function PublicBody({ onDone, shared, isPrivate = false, turn, kind, setKind }: { onDone: () => void; shared: ComposeContent; isPrivate?: boolean; turn: boolean } & KindProps) {
  const options: readonly { key: (typeof PUBLIC_TYPES)[number]['key']; label: string }[] = isPrivate ? PRIVATE_TYPES : PUBLIC_TYPES;
  // Privat gibt es keine We-Challenge: dort zeigt das Blatt das Bild, im Kiez bleibt die We-Challenge gewählt
  const type: (typeof PUBLIC_TYPES)[number]['key'] = kind === 'we' ? (isPrivate ? 'photo' : 'individual') : kind;
  const setType = (key: (typeof PUBLIC_TYPES)[number]['key']) => setKind(key === 'individual' ? 'we' : key);
  const post = usePublicComposeForm(onDone, type === 'photo' ? 'photo' : 'individual', shared, isPrivate);
  const textPost = usePublicComposeForm(onDone, 'photo', shared, isPrivate, true);
  const ba = useBeforeAfterStartForm(undefined, useOpenTimer(onDone), shared, isPrivate);
  const isBa = type === 'before_after';
  const form = type === 'text' ? textPost : post;
  return (
    <SheetScroll actions={isBa ? ba.button : form.buttons}>
      <DraftStrip target={isPrivate ? 'private' : 'public'} onClose={onDone} />
      {options.length > 1 ? <TypeSwitch options={options} value={type} onChange={setType} turn={turn} /> : null}
      {isBa ? ba.fields : form.fields}
    </SheetScroll>
  );
}

function GroupBody({ groupId, onDone, shared, turn, kind, setKind }: { groupId: string; onDone: () => void; shared: ComposeContent; turn: boolean } & KindProps) {
  const router = useRouter();
  const options = GROUP_TYPES;
  const type: (typeof GROUP_TYPES)[number]['key'] = kind === 'we' ? 'task' : kind;
  const setType = (key: (typeof GROUP_TYPES)[number]['key']) => setKind(key === 'task' ? 'we' : key);
  const openPost = (id: string) => {
    onDone();
    router.push(`/challenge/${id}`);
  };
  // Entwurf gespeichert: Blatt zu, wie im Kiez
  const task = useGroupTaskForm(groupId, {}, openPost, shared, onDone);
  const photo = useGroupPhotoForm(groupId, openPost, shared, onDone);
  const textPost = useGroupPhotoForm(groupId, openPost, shared, onDone, undefined, true);
  const ba = useBeforeAfterStartForm(groupId, useOpenTimer(onDone), shared);
  const form = type === 'before_after' ? ba : type === 'photo' ? photo : type === 'text' ? textPost : task;
  return (
    <SheetScroll actions={form.button}>
      <DraftStrip target={groupId} onClose={onDone} />
      {options.length > 1 ? <TypeSwitch options={options} value={type} onChange={setType} turn={turn} /> : null}
      {form.fields}
    </SheetScroll>
  );
}

function NoGroup() {
  const router = useRouter();
  return (
    <View style={styles.content}>
      <GroupsEmpty onCreate={() => router.push('/groups/new')} onJoin={() => router.push('/groups/join')} />
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
  // Oben wenig Luft, damit Ort und Typ als Paar lesen (Daria, 2026-10-31)
  content: { padding: space[16], paddingTop: space[4], gap: space[16], paddingBottom: space[24] },
});
