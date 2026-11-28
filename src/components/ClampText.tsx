import { createContext, useContext, useEffect, useState, type ComponentProps } from 'react';
import { Platform, StyleSheet, View, type NativeSyntheticEvent, type TextLayoutEventData } from 'react-native';

import { Text } from './T';

/**
 * Gekürzte Texte auf einer Karte (Daria, 2026-11-27: „Auf Tipp sollte ich die Karte in der Höhe vollständig sehen, mit
 * allen Infos, wenn Infos ausgeblendet“). Die Karte gibt über `FullCard` vor, ob sie gerade alles zeigt, und erfährt
 * über `report`, ob ein Text gekürzt ist. Ohne Karte darum herum kürzt `ClampText` wie ein normaler Text.
 */
export const FullCard = createContext<{ full: boolean; report: (key: object, cut: boolean) => void } | null>(null);

type Props = ComponentProps<typeof Text> & {
  lines: number;
  /**
   * Zeilen gleichmäßig füllen (Daria, 2026-11-27: „Bei Polina um … hätte man auf 2 gleichmäßigere Zeilen verteilen
   * können“): im Browser `text-wrap: balance`, auf Android der ausgewogene Umbruch, auf iOS eine schmalere Breite, die
   * aus den gemessenen Zeilen folgt.
   */
  balance?: boolean;
};

const BALANCE_WEB = { textWrap: 'balance' } as object;

/**
 * Text mit höchstens `lines` Zeilen. Eine unsichtbare, ungekürzte Kopie misst die volle Höhe; ist sie höher als der
 * sichtbare Text, ist er gekürzt. So geht es im Browser und in der App gleich.
 */
export function ClampText({ lines, style, children, balance, ...props }: Props) {
  const iosBalance = balance && Platform.OS === 'ios';
  // iOS: so breit wie der Schnitt der Zeilen plus Luft; brauchen die Zeilen dann mehr Platz, bleibt die volle Breite
  const [maxWidth, setMaxWidth] = useState<number | undefined>(undefined);
  const [count, setCount] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const balanceLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const found = e.nativeEvent.lines;
    if (!maxWidth) {
      if (found.length < 2 || found.length > lines) return;
      const total = found.reduce((sum, l) => sum + l.width, 0);
      const widest = Math.max(...found.map((l) => l.width));
      const even = Math.ceil(total / found.length) + 12;
      if (even < widest - 8) {
        setCount(found.length);
        setMaxWidth(even);
      }
    } else if (found.length > count) {
      setMaxWidth(undefined);
      setGaveUp(true);
    }
  };
  const balanced = balance
    ? Platform.OS === 'web'
      ? BALANCE_WEB
      : iosBalance && maxWidth && !gaveUp
        ? { maxWidth }
        : null
    : null;
  const textStyle = balanced ? [style, balanced] : style;
  const nativeBalance = balance && Platform.OS === 'android' ? { textBreakStrategy: 'balanced' as const } : null;
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
      <Text {...props} {...nativeBalance} style={textStyle} numberOfLines={lines}>
        {children}
      </Text>
    );
  }
  return (
    <View style={measure.wrap}>
      <Text {...props} {...nativeBalance} style={textStyle} numberOfLines={full ? undefined : lines} onLayout={(e) => setShown(e.nativeEvent.layout.height)}>
        {children}
      </Text>
      <View style={measure.box} pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text
          {...props}
          {...nativeBalance}
          style={textStyle}
          onLayout={(e) => setWhole(e.nativeEvent.layout.height)}
          onTextLayout={iosBalance && !gaveUp ? balanceLayout : undefined}
        >
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
