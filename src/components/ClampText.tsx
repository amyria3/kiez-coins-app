import { createContext, useContext, useEffect, useState, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from './T';

/**
 * Gekürzte Texte auf einer Karte (Daria, 2026-11-27: „Auf Tipp sollte ich die Karte in der Höhe vollständig sehen, mit
 * allen Infos, wenn Infos ausgeblendet“). Die Karte gibt über `FullCard` vor, ob sie gerade alles zeigt, und erfährt
 * über `report`, ob ein Text gekürzt ist. Ohne Karte darum herum kürzt `ClampText` wie ein normaler Text.
 */
export const FullCard = createContext<{ full: boolean; report: (key: object, cut: boolean) => void } | null>(null);

type Props = ComponentProps<typeof Text> & { lines: number };

/**
 * Text mit höchstens `lines` Zeilen. Eine unsichtbare, ungekürzte Kopie misst die volle Höhe; ist sie höher als der
 * sichtbare Text, ist er gekürzt. So geht es im Browser und in der App gleich.
 */
export function ClampText({ lines, style, children, ...props }: Props) {
  const card = useContext(FullCard);
  const full = !!card?.full;
  const [shown, setShown] = useState(0);
  const [whole, setWhole] = useState(0);
  const [key] = useState(() => ({}));
  const cut = !full && whole > shown + 1;
  const report = card?.report;
  useEffect(() => {
    if (report && !full && shown && whole) report(key, cut);
  }, [report, key, cut, full, shown, whole]);
  useEffect(() => () => report?.(key, false), [report, key]);
  if (!card) {
    return (
      <Text {...props} style={style} numberOfLines={lines}>
        {children}
      </Text>
    );
  }
  return (
    <View style={measure.wrap}>
      <Text {...props} style={style} numberOfLines={full ? undefined : lines} onLayout={(e) => setShown(e.nativeEvent.layout.height)}>
        {children}
      </Text>
      <View style={measure.box} pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text {...props} style={style} onLayout={(e) => setWhole(e.nativeEvent.layout.height)}>
          {children}
        </Text>
      </View>
    </View>
  );
}

const measure = StyleSheet.create({
  wrap: { flexShrink: 1 },
  box: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 },
});
