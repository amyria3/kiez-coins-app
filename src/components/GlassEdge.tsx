import { useId, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

/*
 * Kanten und Linien für Milchglas, angelehnt an superhuman.com (Daria, 2026-11-05):
 * halbtransparent und mit Verlauf statt einer festen Farbe.
 */

/** Heller Schein oben links, fast unsichtbar in der Mitte, leichtes Herz-Grün unten rechts */
const EDGE_STOPS = [
  { offset: 0, color: "#FFFFFF", opacity: 0.32 },
  { offset: 0.45, color: "#FFFFFF", opacity: 0.05 },
  { offset: 1, color: "#93F4A7", opacity: 0.28 },
];

/** Linie, die zu beiden Enden ausläuft und in der Mitte am deutlichsten ist */
const LINE_STOPS = [
  { offset: 0, color: "#93F4A7", opacity: 0 },
  { offset: 0.5, color: "#93F4A7", opacity: 0.45 },
  { offset: 1, color: "#93F4A7", opacity: 0 },
];

/** Rand aus Verlauf um eine Glasfläche. Als letztes Kind in eine Fläche mit `borderRadius` legen. */
export function GlassEdge({
  radius,
  width = 1,
}: {
  radius: number;
  width?: number;
}) {
  const id = useId().replace(/:/g, "");
  const [box, setBox] = useState({ w: 0, h: 0 });
  const inset = width / 2;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setBox((old) => (old.w === w && old.h === h ? old : { w, h }));
      }}
    >
      {box.w > 0 ? (
        <Svg width={box.w} height={box.h}>
          <Defs>
            <LinearGradient id={`edge${id}`} x1="0" y1="0" x2="1" y2="1">
              {EDGE_STOPS.map((s) => (
                <Stop
                  key={s.offset}
                  offset={s.offset}
                  stopColor={s.color}
                  stopOpacity={s.opacity}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect
            x={inset}
            y={inset}
            width={box.w - width}
            height={box.h - width}
            rx={Math.max(0, Math.min(radius, box.w / 2, box.h / 2) - inset)}
            fill="none"
            stroke={`url(#edge${id})`}
            strokeWidth={width}
          />
        </Svg>
      ) : null}
    </View>
  );
}

/** Trennlinie mit Verlauf. `vertical` für Striche zwischen Spalten. */
export function GradientLine({
  vertical = false,
  style,
}: {
  vertical?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <View
      pointerEvents="none"
      style={[vertical ? styles.vertical : styles.horizontal, style]}
    >
      <Svg
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient
            id={`line${id}`}
            x1="0"
            y1="0"
            x2={vertical ? "0" : "1"}
            y2={vertical ? "1" : "0"}
          >
            {LINE_STOPS.map((s) => (
              <Stop
                key={s.offset}
                offset={s.offset}
                stopColor={s.color}
                stopOpacity={s.opacity}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#line${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  horizontal: { height: 1, alignSelf: "stretch" },
  vertical: { width: 1, alignSelf: "stretch" },
});
