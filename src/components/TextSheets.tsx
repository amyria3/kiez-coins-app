import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '../data/store';
import {
  SHEET_FONTS,
  SHEET_SIZE_MAX,
  SHEET_SIZE_MIN,
  formatSheetStyle,
  parseSheetStyle,
  sheetFont,
  useSheetFonts,
  type SheetAlign,
} from '../data/sheetFonts';
import { color, font, space, text } from '../theme/tokens';
import { Text } from './T';
import { t } from '../data/texts';
import { openLink } from '../lib/places';

/**
 * Posts nur mit Text (Daria, 07.11.2026): Text auf Blättern in unserem gelblichen Weiß, im Format 4:5 wie
 * Instagram-Slides. Wird ein Blatt voll, geht es auf dem nächsten weiter, höchstens 10 Blätter.
 * Schrift und Ränder wachsen mit der Breite des Blatts, damit jedes Blatt überall gleich umbricht.
 */
export const MAX_PAGES = 10;
/** Höhe zu Breite */
export const SHEET_RATIO = 5 / 4;
/** Blatt: reines Weiß (Daria, 07.11.2026, vorher #FFF8ED) */
export const PAPER = '#FFFFFF';
export const INK = '#232326';
/** Gedämpfte Schrift auf dem Blatt (Seitenzahl, Platzhalter): dunkles Puder, Farbton 342° wie die Schrift der App, kein Grau (Daria, 2026-11-11). Vorher #8E8E93 */
export const INK_MUTED = '#AB7C8A';
/** Links und @Namen: kräftiges Orange ohne Braunstich (Daria, 07.11.2026, vorher Lila #5B5CD6) */
export const INK_LINK = '#E8590C';

export function sheetMetrics(width: number, fontKey?: string) {
  // fontKey: Schrift, dazu wahlweise Größe und Ausrichtung (data/sheetFonts.ts)
  const style = parseSheetStyle(fontKey);
  const f = sheetFont(style.font);
  const pad = Math.round(width * 0.11);
  // Oben und unten deutlich mehr Luft als an den Seiten (Daria, 07.11.2026)
  const padY = Math.round(width * 0.19);
  // 15 % kleiner (Daria, 07.11.2026)
  const fontSize = width * 0.0544 * f.scale * style.size;
  const lineHeight = Math.round(fontSize * f.leading);
  const titleSize = width * 0.0714 * f.scale * style.size;
  const titleLineHeight = Math.round(titleSize * Math.max(1.18, f.leading - 0.2));
  return {
    pad,
    padY,
    innerWidth: width - 2 * pad,
    innerHeight: Math.round(width * SHEET_RATIO) - 2 * padY,
    body: { fontFamily: f.body, fontSize, lineHeight, color: INK, textAlign: style.align },
    title: {
      fontFamily: f.title,
      fontSize: titleSize,
      lineHeight: titleLineHeight,
      color: INK,
      letterSpacing: f.key === 'inter' ? -0.3 : 0,
      textAlign: style.align,
    },
    /** Abstand zwischen Titel und Text */
    titleGap: Math.round(lineHeight * 0.5),
    lineHeight,
  };
}

/** Post nur mit Text: Blätter statt Foto */
export const isTextPost = (c: { pages?: string[] }) => !!c.pages?.length;

/** Ganzer Text eines Text-Posts, z. B. für Vorlesen und Übersetzen */
export const pagesText = (pages: string[]) => pages.join(' ').replace(/\s+/g, ' ').trim();

// Links mit http(s) oder www, @Namen wie in den Kommentaren
export const RICH = /(https?:\/\/[^\s]+|www\.[^\s]+|@[\p{L}\p{N}_]+)/u;
const TRAILING = /[.,!?;:)\]»“"']+$/;

/** Text eines Blatts: Links öffnen sich, @Namen führen zum Profil, wenn es die Person gibt. */
export function RichSheetText({ value, linkStyle }: { value: string; linkStyle?: object }) {
  const router = useRouter();
  const { users } = useStore();
  const parts = value.split(RICH);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        if (part.startsWith('@')) {
          const name = part.slice(1).toLowerCase();
          const user = users.find((u) => u.name.toLowerCase() === name);
          return (
            <Text
              key={i}
              noTranslate
              style={[styles.mention, linkStyle]}
              onPress={user ? () => router.push({ pathname: '/user/[id]', params: { id: user.id } }) : undefined}
            >
              {part}
            </Text>
          );
        }
        const rest = part.match(TRAILING)?.[0] ?? '';
        const link = rest ? part.slice(0, -rest.length) : part;
        return (
          <Text key={i} noTranslate>
            <Text
              noTranslate
              style={[styles.link, linkStyle]}
              accessibilityRole="link"
              onPress={() => openLink(link)}
            >
              {link}
            </Text>
            {rest}
          </Text>
        );
      })}
    </>
  );
}

/** Ein Blatt zum Ansehen. Der Titel steht nur auf dem ersten. */
export function Sheet({
  text,
  title,
  width,
  index,
  count,
  fontKey,
}: {
  text: string;
  title?: string;
  width: number;
  index: number;
  count: number;
  fontKey?: string;
}) {
  useSheetFonts();
  const m = sheetMetrics(width, fontKey);
  return (
    <View style={[styles.sheet, { width, height: Math.round(width * SHEET_RATIO), paddingHorizontal: m.pad, paddingVertical: m.padY }]}>
      {index === 0 && title?.trim() ? (
        <Text noTranslate style={[m.title, { marginBottom: m.titleGap }]}>
          {title.trim()}
        </Text>
      ) : null}
      <Text noTranslate style={m.body}>
        <RichSheetText value={text} />
      </Text>
      {count > 1 ? (
        <Text style={[styles.pageNo, { right: m.pad, bottom: Math.round(m.padY * 0.4), fontSize: width * 0.03 }]}>
          {`${index + 1}/${count}`}
        </Text>
      ) : null}
    </View>
  );
}

/** Blätter nebeneinander zum Wischen, mit Punkten darunter */
export function SheetPager({
  pages,
  title,
  width,
  dots = true,
  fontKey,
}: {
  pages: string[];
  title?: string;
  width: number;
  dots?: boolean;
  fontKey?: string;
}) {
  const [page, setPage] = useState(0);
  if (!width) return null;
  if (pages.length === 1) return <Sheet text={pages[0]} title={title} width={width} index={0} count={1} fontKey={fontKey} />;
  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ width }}
      >
        {pages.map((p, i) => (
          <Sheet key={i} text={p} title={title} width={width} index={i} count={pages.length} fontKey={fontKey} />
        ))}
      </ScrollView>
      {dots ? (
        <View style={styles.dots} pointerEvents="none">
          {pages.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Blätter an der Stelle des Fotos im Detail und in der Vorschau: so groß, wie der Platz zwischen den Knöpfen oben
 * und dem Glasblatt unten erlaubt, mittig.
 */
export function TextHero({ pages, title, fontKey, bottom = 120 }: { pages: string[]; title?: string; fontKey?: string; bottom?: number }) {
  const insets = useSafeAreaInsets();
  const top = insets.top + 64;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const width = Math.floor(Math.max(0, Math.min(size.w - 2 * space[16], (size.h - top - bottom) / SHEET_RATIO)));
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.hero, { paddingTop: top, paddingBottom: bottom }]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {width > 80 ? <SheetPager pages={pages} title={title} width={width} fontKey={fontKey} /> : null}
    </View>
  );
}

type Selection = { page: number; pos: number };

/** Cursor setzen: in der App über `setSelection`, im Browser über das Textfeld selbst */
function placeCursor(input: TextInput | null, pos: number) {
  if (!input) return;
  const target = input as unknown as {
    setSelection?: (start: number, end: number) => void;
    setSelectionRange?: (start: number, end: number) => void;
    value?: string;
  };
  input.focus();
  if (target.setSelectionRange) {
    // Browser: sofort setzen, sonst landen schnelle Tasten an der falschen Stelle. Kommt der neue Text erst
    // mit dem nächsten Rendern an, noch einmal danach.
    target.setSelectionRange(pos, pos);
    requestAnimationFrame(() => target.setSelectionRange?.(pos, pos));
  } else {
    setTimeout(() => target.setSelection?.(pos, pos), 0);
  }
}

/**
 * Blätter zum Schreiben (Daria, 07.11.2026). Jedes Blatt ist ein Textfeld mit fester Höhe. Unsichtbare Kopien
 * messen, wie hoch der Text wirklich ist. Läuft ein Blatt über, wandert der Rest ab dem letzten ganzen Wort aufs
 * nächste Blatt, und der Cursor geht mit. Wird auf einem Blatt Platz frei, rücken Wörter vom nächsten nach.
 */
export function SheetEditor({
  title,
  onTitleChange,
  pages,
  onPagesChange,
  placeholder = 'Was möchtest Du erzählen?',
  fontKey,
  onFontChange,
}: {
  title: string;
  onTitleChange: (title: string) => void;
  pages: string[];
  onPagesChange: (pages: string[]) => void;
  placeholder?: string;
  fontKey?: string;
  /** Neue Schrift, Größe oder Ausrichtung, zusammen als ein Wert (data/sheetFonts.ts) */
  onFontChange?: (font: string) => void;
}) {
  const fontsReady = useSheetFonts();
  const style = parseSheetStyle(fontKey);
  const [width, setWidth] = useState(0);
  const m = sheetMetrics(width || 320, fontKey);
  const inputs = useRef<(TextInput | null)[]>([]);
  // Gemessene Höhe je Blatt, zusammen mit dem Text, für den sie gilt
  const [heights, setHeights] = useState<Record<number, { text: string; h: number }>>({});
  const [titleHeight, setTitleHeight] = useState(0);
  const focus = useRef<Selection | null>(null);
  // Blätter, die gerade übergelaufen sind: Dort rücken keine Wörter nach, bis jemand dort tippt
  const noPull = useRef(new Set<number>());
  // Nach einem Blattwechsel: Tasten, die noch im alten Blatt landen, gehen ans neue
  const redirect = useRef<{ from: number; keep: string; to: number; pos: number } | null>(null);
  const [full, setFull] = useState(false);
  const list = pages.length ? pages : [''];
  // Blätter liegen nebeneinander zum Wischen (Daria, 07.11.2026). `current` ist das Blatt mit dem Cursor,
  // `shown` das Blatt, das gerade zu sehen ist.
  const pager = useRef<ScrollView>(null);
  const [current, setCurrent] = useState(0);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (width && current < list.length) pager.current?.scrollTo({ x: current * width, animated: true });
  }, [current, width, list.length]);

  const update = (next: string[]) => onPagesChange(next.slice(0, MAX_PAGES));

  // Andere Schrift oder Größe: Wörter dürfen wieder nachrücken. Die Höhen nicht löschen: Bleibt eine Höhe gleich,
  // meldet die Messung sie nicht neu, und die Blätter blieben ungeprüft.
  useEffect(() => {
    noPull.current.clear();
  }, [fontKey, fontsReady]);

  useEffect(() => {
    if (!width || !fontsReady) return;
    for (let k = 0; k < list.length; k++) {
      const measured = heights[k];
      if (!measured || measured.text !== list[k]) return;
      const avail = k === 0 ? m.innerHeight - (title.trim() ? titleHeight + m.titleGap : 0) : m.innerHeight;
      const text = list[k];
      if (measured.h > avail + 1 && text.length > 1) {
        // Schätzen, wie viel passt, und ab dem letzten Leerzeichen davor abschneiden
        const target = Math.max(1, Math.floor((text.length * avail) / measured.h));
        let cut = -1;
        for (let i = Math.min(target, text.length - 1); i > 0; i--) {
          if (/\s/.test(text[i])) {
            cut = i;
            break;
          }
        }
        const keep = cut > 0 ? text.slice(0, cut) : text.slice(0, target);
        const tail = cut > 0 ? text.slice(cut + 1) : text.slice(target);
        const next = [...list];
        next[k] = keep;
        noPull.current.add(k);
        if (k === MAX_PAGES - 1) {
          setFull(true);
          update(next);
          return;
        }
        const following = list[k + 1];
        next[k + 1] = following === undefined ? tail : following ? `${tail} ${following}` : tail;
        update(next);
        // Wer am Ende tippt, schreibt auf dem neuen Blatt weiter
        const f = focus.current;
        if (f && f.page === k && f.pos > keep.length) {
          const atEnd = f.pos >= text.length - 1;
          const pos = atEnd ? tail.length : Math.max(0, Math.min(tail.length, f.pos - (cut > 0 ? cut + 1 : target)));
          focus.current = { page: k + 1, pos };
          setCurrent(k + 1);
          // Was noch auf diesem Blatt ankommt, bevor der Cursor drüben ist, gehört aufs nächste Blatt
          redirect.current = { from: k, keep, to: k + 1, pos };
          placeCursor(inputs.current[k + 1], pos);
        }
        return;
      }
      const following = list[k + 1];
      if (following === undefined || noPull.current.has(k) || focus.current?.page === k + 1) continue;
      // Leeres letztes Blatt ohne Cursor fällt weg
      if (!following && k + 1 === list.length - 1) {
        update(list.slice(0, -1));
        return;
      }
      if (measured.h + m.lineHeight <= avail) {
        const word = following.match(/^\s*\S+/)?.[0];
        if (!word) continue;
        const sep = /\n/.test(word.match(/^\s*/)?.[0] ?? '') ? '\n' : ' ';
        const next = [...list];
        next[k] = text ? `${text}${sep}${word.trim()}` : word.trim();
        next[k + 1] = following.slice(word.length).replace(/^ /, '');
        update(next);
        return;
      }
    }
    // Jede neue Messung oder Eingabe prüft die Blätter neu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, pages, heights, titleHeight, title, fontKey, fontsReady]);

  const onChange = (k: number, value: string) => {
    const rd = redirect.current;
    if (rd && rd.from === k && value.length > rd.keep.length && value.startsWith(rd.keep)) {
      const extra = value.slice(rd.keep.length);
      const next = [...list];
      next[k] = rd.keep;
      const target = next[rd.to] ?? '';
      next[rd.to] = target.slice(0, rd.pos) + extra + target.slice(rd.pos);
      rd.pos += extra.length;
      focus.current = { page: rd.to, pos: rd.pos };
      update(next);
      placeCursor(inputs.current[rd.to], rd.pos);
      return;
    }
    redirect.current = null;
    noPull.current.delete(k);
    if (k > 0) noPull.current.delete(k - 1);
    setFull(false);
    const next = [...list];
    next[k] = value;
    update(next);
  };

  const onKeyPress = (k: number) => (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key !== 'Backspace' || k === 0) return;
    const f = focus.current;
    if (list[k] === '') {
      // Leeres Blatt weg, weiter am Ende des Blatts davor
      const next = list.filter((_, i) => i !== k);
      update(next);
      focus.current = { page: k - 1, pos: next[k - 1].length };
      setCurrent(k - 1);
      placeCursor(inputs.current[k - 1], next[k - 1].length);
    } else if (f && f.page === k && f.pos === 0) {
      // Am Anfang eines Blatts löscht Zurück das letzte Zeichen des Blatts davor
      const next = [...list];
      next[k - 1] = next[k - 1].slice(0, -1);
      noPull.current.delete(k - 1);
      update(next);
    }
  };

  return (
    <View onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))} style={styles.editor}>
      {onFontChange ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fonts}>
          {SHEET_FONTS.map((f) => {
            const selected = style.font === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => onFontChange(formatSheetStyle({ ...style, font: f.key }))}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Schrift ${f.label}`}
                style={[styles.fontChip, selected && styles.fontChipSelected]}
              >
                <Text noTranslate style={[styles.fontChipText, { fontFamily: f.body }, selected && styles.fontChipTextSelected]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      {onFontChange ? (
        <View style={styles.tools}>
          <AlignChoice value={style.align} onChange={(align) => onFontChange(formatSheetStyle({ ...style, align }))} />
          <SizeSlider value={style.size} onChange={(size) => onFontChange(formatSheetStyle({ ...style, size }))} />
        </View>
      ) : null}
      {width ? (
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={32}
          onScroll={(e) => setShown(Math.round(e.nativeEvent.contentOffset.x / width))}
          style={{ width }}
        >
          {list.map((value, k) => {
            const firstAvail = m.innerHeight - (title.trim() ? titleHeight + m.titleGap : 0);
            return (
              <View key={k} style={[styles.sheet, { width, height: Math.round(width * SHEET_RATIO), paddingHorizontal: m.pad, paddingVertical: m.padY }]}>
                {k === 0 ? (
                  <>
                    <TextInput
                      value={title}
                      onChangeText={onTitleChange}
                      placeholder={t('Titel (freiwillig)')}
                      placeholderTextColor={INK_MUTED}
                      maxLength={60}
                      multiline
                      scrollEnabled={false}
                      submitBehavior="blurAndSubmit"
                      style={[m.title, styles.input, { height: (titleHeight || m.title.lineHeight) + 4, marginBottom: m.titleGap - 4 }]}
                      accessibilityLabel={t('Titel')}
                    />
                    <Text
                      // Neu einhängen bei jeder Änderung: onLayout meldet sonst nur, wenn sich die Höhe ändert
                      key={`${fontKey}|${title}`}
                      noTranslate
                      style={[m.title, styles.measure, { width: m.innerWidth }]}
                      onLayout={(e) => setTitleHeight(Math.ceil(e.nativeEvent.layout.height))}
                    >
                      {`${title}​`}
                    </Text>
                  </>
                ) : null}
                <TextInput
                  ref={(r) => {
                    inputs.current[k] = r;
                  }}
                  value={value}
                  onChangeText={(v) => onChange(k, v)}
                  onKeyPress={onKeyPress(k)}
                  onFocus={() => {
                    setCurrent(k);
                    if (redirect.current?.to === k) redirect.current = null;
                    if (focus.current?.page !== k) focus.current = { page: k, pos: value.length };
                  }}
                  onSelectionChange={(e) => {
                    focus.current = { page: k, pos: e.nativeEvent.selection.end };
                  }}
                  onBlur={() => {
                    if (focus.current?.page === k) focus.current = null;
                  }}
                  placeholder={k === 0 ? t(placeholder) : undefined}
                  placeholderTextColor={INK_MUTED}
                  multiline
                  scrollEnabled={false}
                  textAlignVertical="top"
                  style={[m.body, styles.input, { height: k === 0 ? firstAvail : m.innerHeight }]}
                  accessibilityLabel={`Blatt ${k + 1}`}
                />
                <Text
                  key={`${fontKey}|${value}`}
                  noTranslate
                  style={[m.body, styles.measure, { width: m.innerWidth }]}
                  onLayout={(e) => {
                    const h = Math.ceil(e.nativeEvent.layout.height);
                    setHeights((all) => (all[k]?.text === value && all[k]?.h === h ? all : { ...all, [k]: { text: value, h } }));
                  }}
                >
                  {`${value}​`}
                </Text>
                <Text style={[styles.pageNo, { right: m.pad, bottom: Math.round(m.padY * 0.4), fontSize: width * 0.03 }]}>
                  {`${k + 1}/${list.length}`}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      ) : null}
      {width && list.length > 1 ? (
        <View style={styles.dots}>
          {list.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => pager.current?.scrollTo({ x: i * width, animated: true })}
              accessibilityRole="button"
              accessibilityLabel={`Zu Blatt ${i + 1}`}
              hitSlop={8}
            >
              <View style={[styles.dot, i === shown && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
      ) : null}
      {full ? <Text style={styles.full}>Mehr als 10 Blätter gehen nicht. Der Rest passt nicht mehr drauf.</Text> : null}
    </View>
  );
}

/** Links oder mittig: zwei Knöpfe mit gezeichneten Zeilen */
function AlignChoice({ value, onChange }: { value: SheetAlign; onChange: (align: SheetAlign) => void }) {
  return (
    <View style={styles.alignRow} accessibilityRole="radiogroup">
      {(['left', 'center'] as const).map((a) => {
        const selected = value === a;
        return (
          <Pressable
            key={a}
            onPress={() => onChange(a)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={a === 'left' ? 'Linksbündig' : 'Zentriert'}
            style={[styles.alignButton, selected && styles.fontChipSelected]}
          >
            {[16, 11, 16, 9].map((w, i) => (
              <View
                key={i}
                style={[
                  styles.alignLine,
                  { width: w, alignSelf: a === 'left' ? 'flex-start' : 'center' },
                  { backgroundColor: selected ? INK : color.text.primary },
                ]}
              />
            ))}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Schriftgröße stufenlos von 90 % bis 130 % (Daria, 07.11.2026). Ziehen oder Tippen auf die Leiste. */
function SizeSlider({ value, onChange }: { value: number; onChange: (size: number) => void }) {
  const [trackW, setTrackW] = useState(0);
  const start = useRef({ x: 0, value: 1 });
  const range = SHEET_SIZE_MAX - SHEET_SIZE_MIN;
  const clamp = (v: number) => Math.round(Math.min(SHEET_SIZE_MAX, Math.max(SHEET_SIZE_MIN, v)) * 100) / 100;
  const ratio = (value - SHEET_SIZE_MIN) / range;
  const KNOB = 22;
  return (
    <View style={styles.sizeRow}>
      {/* Ausnahme: kleines und großes „A“ zeigen die Spanne des Reglers, sie sind Bild statt Text */}
      {/* eslint-disable-next-line no-restricted-syntax */}
      <Text style={[styles.sizeA, { fontSize: 13 }]}>A</Text>
      <View
        style={styles.track}
        onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          const v = trackW ? clamp(SHEET_SIZE_MIN + ((e.nativeEvent.locationX - KNOB / 2) / (trackW - KNOB)) * range) : value;
          start.current = { x: e.nativeEvent.pageX, value: v };
          if (v !== value) onChange(v);
        }}
        onResponderMove={(e) => {
          if (!trackW) return;
          const v = clamp(start.current.value + ((e.nativeEvent.pageX - start.current.x) / (trackW - KNOB)) * range);
          if (v !== value) onChange(v);
        }}
        accessibilityRole="adjustable"
        accessibilityLabel={t('Schriftgröße')}
        accessibilityValue={{ text: `${Math.round(value * 100)} %` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(clamp(value + (e.nativeEvent.actionName === 'increment' ? 0.05 : -0.05)))}
      >
        <View style={styles.trackLine} pointerEvents="none" />
        <View
          pointerEvents="none"
          style={[styles.knob, { width: KNOB, height: KNOB, borderRadius: KNOB / 2, left: ratio * Math.max(0, trackW - KNOB) }]}
        />
      </View>
      {/* Ausnahme: kleines und großes „A“ zeigen die Spanne des Reglers, sie sind Bild statt Text */}
      {/* eslint-disable-next-line no-restricted-syntax */}
      <Text style={[styles.sizeA, { fontSize: 20 }]}>A</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: space[12] },
  fonts: { gap: space[8] },
  fontChip: {
    paddingHorizontal: space[12],
    height: 36,
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: color.line.hairline,
  },
  tools: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  alignRow: { flexDirection: 'row', gap: space[8] },
  alignButton: {
    width: 44,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: color.line.hairline,
    justifyContent: 'center',
    paddingHorizontal: 13,
    gap: 3,
  },
  alignLine: { height: 2, borderRadius: 1 },
  sizeRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[8] },
  sizeA: { fontFamily: font.regular, color: color.text.secondary },
  track: { flex: 1, height: 36, justifyContent: 'center', cursor: 'pointer' } as object,
  trackLine: { height: 2, borderRadius: 1, backgroundColor: color.line.hairline },
  knob: { position: 'absolute', top: 7, backgroundColor: PAPER },
  fontChipSelected: { backgroundColor: PAPER, borderColor: PAPER },
  fontChipText: { ...text.body, color: color.text.primary },
  fontChipTextSelected: { color: INK },
  hero: { alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: PAPER, borderRadius: 6, overflow: 'hidden' },
  input: { padding: 0, margin: 0, borderWidth: 0, outlineStyle: 'none' } as object,
  measure: { position: 'absolute', opacity: 0, left: -10000, top: 0 },
  mention: { color: INK_LINK },
  link: { color: INK_LINK, textDecorationLine: 'underline' },
  pageNo: { position: 'absolute', fontFamily: font.regular, color: INK_MUTED },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space[6], paddingTop: space[8] },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.text.secondary, opacity: 0.4 },
  dotActive: { backgroundColor: color.text.primary },
  full: { ...text.bodySm, color: color.accent.error },
});
