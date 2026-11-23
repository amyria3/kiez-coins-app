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
};

/**
 * Die Digitale Visitenkarte mit ihren Knöpfen, überall gleich (Daria, 2026-11-23: „Still not the same component“):
 * in der Schaufenster-Übersicht, unter `schaufenster/[id]/visitenkarte` und für Gäste unter `s/[slug]/visitenkarte`.
 * Karte, Hinweis fürs Team, Abstände und Knöpfe kommen nur von hier. Welche Knöpfe erscheinen, entscheidet
 * data/cardActions.mjs nach Betrachter:in und Herkunft.
 */
export function BusinessCard({ notice, ...actions }: Props) {
  return (
    <View style={styles.page}>
      <DigitalCard showcase={actions.showcase} />
      {actions.viewer === 'team' ? (
        <Text style={styles.body}>
          {t('So sieht Eure Digitale Visitenkarte aus. Ändern kannst Du die Angaben unter „Inhalte bearbeiten“.')}
        </Text>
      ) : null}
      {notice}
      <CardActions {...actions} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[24] },
  body: { ...text.body, color: color.text.primary },
});
