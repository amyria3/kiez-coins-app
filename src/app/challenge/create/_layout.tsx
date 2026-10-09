import { createContext, useContext, useState, type Dispatch, type SetStateAction } from 'react';
import { Stack } from 'expo-router';

import type { ImageSource } from '../../../data/types';
import { color } from '../../../theme/tokens';

// Entwurf einer neuen Challenge über beide Schritte hinweg.
export type Draft = {
  photo?: ImageSource;
  title: string;
  text: string;
  location: string;
  bountyAmount?: number;
  durationDays: number;
};

const emptyDraft: Draft = { title: '', text: '', location: 'Helmholtzplatz, 10437 Berlin', durationDays: 7 };

const DraftContext = createContext<[Draft, Dispatch<SetStateAction<Draft>>] | null>(null);

export function useDraft() {
  const value = useContext(DraftContext);
  if (!value) throw new Error('useDraft nur innerhalb von challenge/create verwenden');
  return value;
}

export const unstable_settings = { initialRouteName: 'step-1' };

/** Flow „Challenge erstellen“: als Modal geöffnet, darin Schritte als Push. */
export default function CreateLayout() {
  const draft = useState<Draft>(emptyDraft);
  return (
    <DraftContext.Provider value={draft}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg.screen } }}>
        <Stack.Screen name="success" options={{ gestureEnabled: false }} />
      </Stack>
    </DraftContext.Provider>
  );
}
