import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '../../data/texts';
import { color, space, text } from '../../theme/tokens';
import { Text } from '../T';
import { CardActions } from './CardActions';
import { DigitalCard } from './DigitalCard';

type Props = ComponentProps<typeof CardActions> & {
  /** Hinweis unter der Karte, z. B. nach „Folgen“ */
  notice?: ReactNode;
  /** Desktop (Daria, 2026-11-28): Karte links in 620 px, Hinweis und Knöpfe rechts daneben in 340 px, 40 px Abstand */
  wide?: boolean;
};

/**
 * Die Digitale Visitenkarte mit ihren Knöpfen, überall gleich (Daria, 2026-11-23: „Still not the same component“):
 * in der Schaufenster-Übersicht, unter `schaufenster/[id]/visitenkarte` und für Gäste unter `s/[slug]/visitenkarte`.
 * Karte, Hinweis fürs Team, Abstände und Knöpfe kommen nur von hier. Welche Knöpfe erscheinen, entscheidet
 * data/cardActions.mjs nach Betrachter:in und Herkunft.
 */
export function BusinessCard({ notice, wide, ...actions }: Props) {
  const side = (
    <>
      {actions.viewer === 'team' ? (
        <Text style={styles.body}>
          {t('So sieht Eure Digitale Visitenkarte aus. Ändern kannst Du die Angaben unter „Inhalte bearbeiten“.')}
        </Text>
      ) : null}
      {notice}
      <CardActions {...actions} />
    </>
  );
  if (wide) {
    return (
      <View style={styles.wide}>
        <View style={styles.wideCard}>
          <DigitalCard showcase={actions.showcase} />
        </View>
        <View style={styles.wideSide}>{side}</View>
      </View>
    );
  }
  return (
    <View style={styles.page}>
      <DigitalCard showcase={actions.showcase} />
      {side}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[24] },
  // Spaltenbreiten wie die Desktop-Fassung der App und kiezcoins.de/s/<kurzname> (WEB_WIDE_MAX_WIDTH)
  wide: { flexDirection: 'row', alignItems: 'flex-start', gap: space[40] },
  wideCard: { flex: 1, maxWidth: 620 },
  wideSide: { width: 340, gap: space[24] },
  body: { ...text.body, color: color.text.primary },
});
