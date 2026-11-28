import { createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '../../theme/tokens';
import { isLight } from '../../theme/look';

/**
 * Galerie-Rahmen (Daria, 2026-11-28, Variante A „Passepartout“): In der Desktop-Wand hängen die Bilder wie in einer
 * Galerie mit sehr dunklen Wänden, mit breitem weißem Rahmen, eckigen Kanten und weichem Schatten. Nur in der breiten
 * Wand („Nur nicht für schmale Formate“), nicht am Handy und nicht in schmalen Fenstern. In den hellen Looks gibt es
 * keine dunkle Wand, dort bleibt das Bild ohne Rahmen.
 */
const Wall = createContext(false);

/** Die Feed-Wand schaltet den Rahmen für ihre Posts ein */
export const GalleryWall = Wall.Provider;

/** Hängt der Post gerade gerahmt in der Wand? Dann sind seine Bilder eckig. */
export const useGalleryFramed = () => useContext(Wall) && !isLight;

/** Umschließt das Bild eines Posts. Außerhalb der Wand ändert sich nichts. */
export function GalleryFrame({ children }: { children: ReactNode }) {
  const on = useGalleryFramed();
  if (!on) return <>{children}</>;
  return <View style={styles.frame}>{children}</View>;
}

/** Papierweiß des Rahmens, fest wie ein echtes Passepartout */
const PAPER = '#FBF7EE';

const styles = StyleSheet.create({
  frame: {
    padding: space[12],
    backgroundColor: PAPER,
    boxShadow: '0 18px 40px rgba(0, 0, 0, 0.45)',
  },
});
