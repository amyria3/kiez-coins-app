import { createContext, useCallback, useContext, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert } from 'react-native';
import { Stack, useGlobalSearchParams, useRouter } from 'expo-router';

import { findPlace, roundCoords, type Coords } from '../../../data/location';
import { useStore } from '../../../data/store';
import type { Challenge, ExtraPhoto, ImageSource } from '../../../data/types';
import { color } from '../../../theme/tokens';

// Entwurf einer neuen Challenge über beide Schritte und die Vorschau hinweg.
// Mit `draftId` (z. B. aus „Deine Challenges“) startet der Flow mit einem gespeicherten Entwurf.
// Mit `copyOf` startet er als neue Challenge mit Fotos, Titel, Text, Ort und Bounty einer alten.
export type Draft = {
  /** ID des gespeicherten Entwurfs in Supabase */
  id?: string;
  /** `individual`: Challenge, hier muss etwas getan werden. `photo`: nur ein schönes Bild, ohne Coins. */
  type: 'individual' | 'photo';
  photo?: ImageSource;
  /** Pfad des schon hochgeladenen Fotos. Wird beim Ändern des Fotos geleert. */
  imagePath?: string;
  /** Bis zu 2 weitere Fotos */
  extras: ExtraPhoto[];
  title: string;
  text: string;
  location: string;
  bountyAmount?: number;
  durationDays: number;
  /** Auf rund 100 m gerundeter Punkt für Entfernungen im Feed */
  coords?: Coords;
  /** Modus „Privat“: nur Bild, nur für Dich sichtbar (Daria, 27.10.2026) */
  private?: boolean;
};

const emptyDraft = (kiez?: string): Draft => ({ type: 'individual', title: '', text: '', location: kiez ?? '', durationDays: 7, extras: [] });

function fromChallenge(c: Challenge): Draft {
  return {
    id: c.id,
    type: c.type === 'photo' ? 'photo' : 'individual',
    photo: c.image,
    imagePath: c.imagePath,
    extras: c.extraImages ?? [],
    title: c.title,
    text: c.text,
    location: c.location,
    bountyAmount: c.bountyAmount,
    durationDays: 7,
    coords: c.coords,
    private: c.private,
  };
}

/** Kopie einer Challenge: ohne id und Pfade, damit die Fotos neu hochgeladen werden. */
function copyOf(c: Challenge): Draft {
  return {
    ...fromChallenge(c),
    id: undefined,
    imagePath: undefined,
    extras: (c.extraImages ?? []).map((e) => ({ photo: e.photo })),
  };
}

/** Hat die Person schon etwas eingegeben? Dann lohnt sich ein Entwurf. */
export const hasContent = (d: Draft) => !!d.photo || d.extras.length > 0 || !!d.title.trim() || !!d.text.trim();

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
        type: draft.type,
        title: draft.title,
        text: draft.text,
        location: draft.location,
        bountyAmount: draft.type === 'photo' ? undefined : draft.bountyAmount,
        photo: draft.imagePath ? undefined : draft.photo,
        imagePath: draft.imagePath,
        coords: draft.coords,
        extras: draft.extras,
        private: draft.private,
      });
      setDraft((d) => ({ ...d, id: saved.id, imagePath: saved.imagePath, extras: saved.extraImages?.length ? saved.extraImages : d.extras }));
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
  const { draftId, copyOf: copyId, title, text, photo, type, extras, privat } = useGlobalSearchParams<{
    draftId?: string;
    copyOf?: string;
    /** Aus dem Erstellen-Blatt über dem Feed mitgebracht (components/compose) */
    title?: string;
    text?: string;
    photo?: string;
    type?: string;
    /** JSON-Liste mit Adressen weiterer Fotos */
    extras?: string;
    /** `1`: Modus „Privat“ */
    privat?: string;
  }>();
  const { challenges, profile } = useStore();
  const draft = useState<Draft>(() => {
    const saved = draftId ? challenges.find((c) => c.id === draftId && c.status === 'draft') : undefined;
    if (saved) return fromChallenge(saved);
    const original = copyId ? challenges.find((c) => c.id === copyId) : undefined;
    if (original) return copyOf(original);
    let extraUris: string[] = [];
    try {
      extraUris = extras ? (JSON.parse(extras) as string[]) : [];
    } catch {
      extraUris = [];
    }
    return {
      ...emptyDraft(profile.kiez),
      // Privat gibt es nur als Bild
      type: type === 'photo' || privat === '1' ? 'photo' : 'individual',
      private: privat === '1' || undefined,
      title: title ?? '',
      text: text ?? '',
      ...(photo ? { photo: { uri: photo } } : {}),
      extras: extraUris.map((uri) => ({ photo: { uri } })),
    };
  });
  const [, setDraft] = draft;
  // Neue Challenge: Ort aus dem Standort vorschlagen. Ohne Freigabe bleibt der Kiez stehen.
  useEffect(() => {
    if (draftId || copyId) return;
    let active = true;
    findPlace()
      .then((place) => {
        if (!active) return;
        setDraft((d) => ({
          ...d,
          coords: roundCoords(place.coords),
          // Nur ersetzen, solange die Person den Ort nicht selbst geändert hat
          location: d.location === (profile.kiez ?? '') ? (place.street ?? place.kiez) : d.location,
        }));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <DraftContext.Provider value={draft}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg.screen } }}>
        <Stack.Screen name="success" options={{ gestureEnabled: false }} />
        {/* Kein Zurückwischen: seitlich ziehen gehört in der Vorschau den Fotos. Zurück über „Bearbeiten“. */}
        <Stack.Screen name="preview" options={{ gestureEnabled: false }} />
      </Stack>
    </DraftContext.Provider>
  );
}
