import { createContext, useCallback, useContext, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert } from 'react-native';
import { Stack, useGlobalSearchParams, useRouter } from 'expo-router';

import { useStore } from '../../../data/store';
import type { Challenge, ImageSource } from '../../../data/types';
import { color } from '../../../theme/tokens';

// Entwurf einer neuen Challenge über beide Schritte hinweg.
// Mit `draftId` (z. B. aus „Deine Challenges“) startet der Flow mit einem gespeicherten Entwurf.
export type Draft = {
  /** ID des gespeicherten Entwurfs in Supabase */
  id?: string;
  photo?: ImageSource;
  /** Pfad des schon hochgeladenen Fotos. Wird beim Ändern des Fotos geleert. */
  imagePath?: string;
  title: string;
  text: string;
  location: string;
  bountyAmount?: number;
  durationDays: number;
};

const emptyDraft: Draft = { title: '', text: '', location: 'Helmholtzplatz, 10437 Berlin', durationDays: 7 };

function fromChallenge(c: Challenge): Draft {
  return {
    id: c.id,
    photo: c.image,
    imagePath: c.imagePath,
    title: c.title,
    text: c.text,
    location: c.location || emptyDraft.location,
    bountyAmount: c.bountyAmount,
    durationDays: emptyDraft.durationDays,
  };
}

/** Hat die Person schon etwas eingegeben? Dann lohnt sich ein Entwurf. */
export const hasContent = (d: Draft) => !!d.photo || !!d.title.trim() || !!d.text.trim();

/** Speichert den Entwurf und schließt den Flow. */
export function useSaveDraft() {
  const router = useRouter();
  const { saveDraft } = useStore();
  const [draft, setDraft] = useDraft();
  const [busy, setBusy] = useState(false);
  const save = useCallback(async () => {
    setBusy(true);
    try {
      const saved = await saveDraft(draft.id, {
        title: draft.title,
        text: draft.text,
        location: draft.location,
        bountyAmount: draft.bountyAmount,
        photo: draft.imagePath ? undefined : draft.photo,
        imagePath: draft.imagePath,
      });
      setDraft((d) => ({ ...d, id: saved.id, imagePath: saved.imagePath }));
      router.dismissTo('/feed');
      router.push('/manage');
    } catch (error) {
      Alert.alert('Entwurf nicht gespeichert', (error as Error).message);
    } finally {
      setBusy(false);
    }
  }, [draft, saveDraft, setDraft, router]);
  return { save, busy };
}

const DraftContext = createContext<[Draft, Dispatch<SetStateAction<Draft>>] | null>(null);

export function useDraft() {
  const value = useContext(DraftContext);
  if (!value) throw new Error('useDraft nur innerhalb von challenge/create verwenden');
  return value;
}

export const unstable_settings = { initialRouteName: 'step-1' };

/** Flow „Challenge erstellen“: als Modal geöffnet, darin Schritte als Push. */
export default function CreateLayout() {
  const { draftId } = useGlobalSearchParams<{ draftId?: string }>();
  const { challenges } = useStore();
  const draft = useState<Draft>(() => {
    const saved = draftId ? challenges.find((c) => c.id === draftId && c.status === 'draft') : undefined;
    return saved ? fromChallenge(saved) : emptyDraft;
  });
  return (
    <DraftContext.Provider value={draft}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg.screen } }}>
        <Stack.Screen name="success" options={{ gestureEnabled: false }} />
      </Stack>
    </DraftContext.Provider>
  );
}
