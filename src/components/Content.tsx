import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './T';

import { color, font, isFashionable, radius, space, stroke, text, withAlpha } from '../theme/tokens';
import { t as translate, useTexts } from '../data/texts';
import { openLink } from '../lib/places';
import { Cat, type CatMood } from './icons/Brand';
import { Icon, type IconName } from './icons/Icon';
import Svg, { Rect, SvgXml } from 'react-native-svg';
import { KATER_AVATAR_GELB, katerAvatarSvg, katerHerzenSvg } from './icons/katerAvatarSvg';
import { IconButton } from './IconButton';

// Systemmeldungen als hellblaue Chatblase der App, wie die Antworten auf die Fragen; Icon dunkel wie der Text, nur bei Warnungen (Daria, 2026-11-09)
const SKY_TEXT = '#1F2123';
/** Fläche der Systemmeldungen im Kiez-Look: probeweise das Gelbgrün aus dem Kreis hinter dem Kater (Cat.svg, Startbild) statt Himmelblau #A9DBFF (Daria, 2026-11-09) */
const SKY_BG = '#F0FFA6';
/**
 * Nur Hinweise im Feed: grau in der Kartenfarbe, ohne Rand, helle Schrift (Daria, 2026-11-12). Das Gelbgrün mit 80 %
 * wurde dort neben dem hellen Switch zu Olive. Alle übrigen Systemblasen bleiben gelbgrün.
 */
const FEED_TEXT = color.text.primary;
const FEED_BG = color.bg.surface;

/**
 * Einblenden der Nachrichten im Kiez-Look (Daria, 2026-11-09). Erscheinen mehrere zugleich, kommen sie nacheinander
 * im Abstand von MESSAGE_STAGGER. Systemblasen kommen mit 70 % Deckkraft, leuchten kurz auf 100 % auf und bleiben
 * bei 80 %, die grauen im Feed bleiben bei 100 %. Dabei wachsen sie aus der Ecke beim Avatar. Bei „Bewegung reduzieren“ steht alles sofort im Endzustand.
 */
const SKY_RGB = '240, 255, 166';
const FEED_RGB = (() => {
  const hex = FEED_BG.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ');
})();
const MESSAGE_STAGGER = 320;
let nextMessageAt = 0;
/** Reserviert den nächsten freien Zeitpunkt und gibt die Wartezeit bis dahin zurück */
function messageDelay(): number {
  const now = Date.now();
  const start = Math.max(now, nextMessageAt);
  nextMessageAt = start + MESSAGE_STAGGER;
  return start - now;
}

/**
 * Pause nach einer eigenen Nachricht (Daria, 2026-11-10: „Verzögerung bis zur nächsten Bubble grundsätzlich einbauen“):
 * Fragt man etwas oder tippt „Ja, los!“, kommt die Antwort erst nach REPLY_PAUSE, wie wenn jemand tippt.
 */
const REPLY_PAUSE = 700;
function pauseAfterOwnMessage() {
  nextMessageAt = Math.max(nextMessageAt, Date.now() + REPLY_PAUSE);
}

function useMessageIn(feed = false) {
  const shown = useRef(new Animated.Value(isFashionable ? 1 : 0)).current;
  const t = useRef(new Animated.Value(isFashionable ? 2 : 0)).current;
  useEffect(() => {
    if (isFashionable) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!alive) return;
        if (reduce) {
          shown.setValue(1);
          t.setValue(2);
          return;
        }
        timer = setTimeout(() => {
          Animated.parallel([
            Animated.timing(shown, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: false }),
            Animated.sequence([
              Animated.timing(t, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
              Animated.timing(t, { toValue: 2, duration: 460, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
            ]),
          ]).start();
        }, messageDelay());
      });
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [shown, t]);
  return {
    opacity: shown,
    backgroundColor: t.interpolate({
      inputRange: [0, 1, 2],
      outputRange: feed
        ? [`rgba(${FEED_RGB}, 0.7)`, `rgba(${FEED_RGB}, 1)`, `rgba(${FEED_RGB}, 1)`]
        : [`rgba(${SKY_RGB}, 0.7)`, `rgba(${SKY_RGB}, 1)`, `rgba(${SKY_RGB}, 0.8)`],
    }),
    scale: t.interpolate({ inputRange: [0, 1, 2], outputRange: [0.9, 1.04, 1] }),
  };
}

/** Eigene Nachricht wird lila (gefragt, „Ja, los!“): leuchtet wie die Systemblasen auf, 70 → 100 → 80 % (Daria, 2026-11-09) */
const ACCENT_RGB = (() => {
  const hex = color.accent.primary.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ');
})();
function useSentGlow(on: boolean) {
  const t = useRef(new Animated.Value(on ? 2 : 0)).current;
  const was = useRef(on);
  useEffect(() => {
    if (was.current === on) return;
    was.current = on;
    if (!on) {
      t.setValue(0);
      return;
    }
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!alive) return;
        if (reduce) {
          t.setValue(2);
          return;
        }
        t.setValue(0);
        Animated.sequence([
          Animated.timing(t, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
          Animated.timing(t, { toValue: 2, duration: 460, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ]).start();
      });
    return () => {
      alive = false;
    };
  }, [on, t]);
  return {
    backgroundColor: t.interpolate({
      inputRange: [0, 1, 2],
      outputRange: [`rgba(${ACCENT_RGB}, 0.7)`, `rgba(${ACCENT_RGB}, 1)`, `rgba(${ACCENT_RGB}, 0.8)`],
    }),
    scale: t.interpolate({ inputRange: [0, 1, 2], outputRange: [0.9, 1.04, 1] }),
  };
}

/** Eigene Nachricht rechts (Frage oder Antwort zum Antippen); `purple`: gefragt bzw. gesendet */
function UserBubble({
  children,
  purple,
  onPress,
  disabled,
  accessibilityState,
}: {
  children: string;
  purple: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityState?: { expanded?: boolean; disabled?: boolean };
}) {
  const on = purple && !isFashionable;
  const glow = useSentGlow(on);
  // Läuft vor dem Einblenden der Antwort, die erst nach dem Prüfen von „Bewegung reduzieren“ ihren Platz bucht
  useEffect(() => {
    if (purple) pauseAfterOwnMessage();
  }, [purple]);
  return (
    <Animated.View
      style={[
        styles.question,
        on && styles.questionOpen,
        on && { backgroundColor: glow.backgroundColor, transform: [{ scale: glow.scale }] },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={accessibilityState}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.questionInner, pressed && styles.questionPressed]}
      >
        <Text style={[styles.questionText, on && styles.questionTextOpen]}>{children}</Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Überschrift eines Abschnitts (Daria, 2026-11-10): feierlich statt technisch, daher im Kiez-Look in der Unbounded
 * der großen Überschriften, 18 pt, hell. Steht 12 über dem Inhalt (`SectionBlock`).
 */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={styles.sectionLabel} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Abschnitt mit Überschrift, 8 Abstand darunter */
export function SectionBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.sectionBlock}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </View>
  );
}

/**
 * Abschnitt, der sich auf Wunsch einklappen lässt (Daria, 2026-11-10: Services im Schaufenster). Mit `collapsible`
 * steht nur die Überschrift mit Pfeil da; ein Tipp klappt den Inhalt auf und wieder zu. Ohne wie `SectionBlock`.
 */
export function CollapsibleSection({ label, collapsible, children }: { label: string; collapsible: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!collapsible) return <SectionBlock label={label}>{children}</SectionBlock>;
  return (
    <View style={styles.sectionBlock}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={translate(label)}
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [styles.collapseHead, pressed && { opacity: 0.6 }]}
      >
        <SectionLabel>{label}</SectionLabel>
        <View style={[styles.collapseIcon, open && styles.collapseIconOpen]}>
          <Icon name="chevron-right" size={20} color={color.text.primary} />
        </View>
      </Pressable>
      {open ? children : null}
    </View>
  );
}

/** Adressen im Text: mit https:// oder als Domain wie developers.facebook.com, nicht Teil eines @-Handles */
const LINK = /https?:\/\/[^\s]+|(?:[a-z0-9-]+\.)+(?:com|de|org|net|social|app|io|eu)(?:\/[^\s]*)?/gi;

function linkParts(value: string): (string | { label: string; url: string })[] {
  const parts: (string | { label: string; url: string })[] = [];
  let rest = 0;
  for (const m of value.matchAll(LINK)) {
    const start = m.index ?? 0;
    const before = value[start - 1];
    if (before === '@' || before === '.' || (before && /[\w/]/.test(before))) continue;
    // Satzzeichen am Ende gehören nicht zur Adresse
    const label = m[0].replace(/[.,;:!?)»“]+$/, '');
    if (start > rest) parts.push(value.slice(rest, start));
    parts.push({ label, url: /^https?:/i.test(label) ? label : `https://${label}` });
    rest = start + label.length;
  }
  if (rest < value.length) parts.push(value.slice(rest));
  return parts;
}

/**
 * Text mit Adressen als Links (Daria, 2026-11-09): unterstrichen, ein Tipp öffnet sie. Ohne Adresse ganz normaler
 * Text. Übersetzt wird vor dem Aufteilen, damit die Übersetzung den ganzen Satz findet.
 */
export function LinkedText({ value, style }: { value: string; style?: StyleProp<TextStyle> }) {
  useTexts();
  const text = translate(value);
  const parts = linkParts(text);
  // Systemnachrichten lassen sich kopieren, z. B. Namen und Befugnisse aus Anleitungen (Daria, 2026-11-09)
  if (parts.length === 1 && typeof parts[0] === 'string') return <Text style={style} selectable>{value}</Text>;
  return (
    <Text style={style} noTranslate selectable>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          part
        ) : (
          <Text key={i} noTranslate accessibilityRole="link" style={styles.link} onPress={() => openLink(part.url)}>
            {part.label}
          </Text>
        ),
      )}
    </Text>
  );
}

/**
 * Rolle „System“ (Daria, 2026-11-09): Absender der gelbgrünen Systemnachrichten, links neben jeder Blase wie ein Absender im Chat.
 * Avatar als eigene Pixel-Krabbe im Sticker-Stil statt Emoji 👾 im schwarzen Kreis (Daria, 2026-11-10): Grüner Körper (seit 2026-11-11, vorher Lila),
 * dunkle Kontur und helle Sticker-Kante, damit sie sich auf dem dunklen Grund abhebt. Ohne Kreis dahinter.
 */
// P = Körper, E = Auge. Die dunkle Kontur und die helle Kante entstehen darum herum (je ein Pixel, auch über Eck).
const KRABBE = [
  '.PP.......PP.',
  'P.....P.....P',
  'P...PPPPP...P',
  'PP.PPPPPPP.PP',
  '.PPPPPPPPPPP.',
  '..PPEPPPEPP..',
  '...PPPPPPP...',
  '...P.P.P.P...',
  '..PP.....PP..',
];
const KRABBE_PIXEL = (() => {
  const h = KRABBE.length + 4;
  const w = KRABBE[0].length + 4;
  // 0 leer, 1 Kante, 2 Kontur, 3 Körper
  const g = Array.from({ length: h }, () => Array<number>(w).fill(0));
  KRABBE.forEach((row, y) => [...row].forEach((c, x) => (g[y + 2][x + 2] = c === 'P' ? 3 : c === 'E' ? 2 : 0)));
  const ring = (from: number, value: number) => {
    const add: [number, number][] = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (g[y][x]) continue;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) if ((g[y + dy]?.[x + dx] ?? 0) >= from) add.push([x, y]);
      }
    add.forEach(([x, y]) => (g[y][x] = value));
  };
  ring(2, 2);
  ring(1, 1);
  const pixels: { x: number; y: number; v: number }[] = [];
  g.forEach((row, y) => row.forEach((v, x) => v && pixels.push({ x, y, v })));
  return { w, h, pixels };
})();
/** Etwas kleiner als ein Profilbild (Daria, 2026-11-10) */
const KRABBE_BREITE = 28;
/**
 * Grüner Körper statt Lila (Daria, 2026-11-11): Lila tragen die eigenen Nachrichten, die Krabbe hebt sich davon ab.
 * Derselbe Farbton wie die Systemblase (SKY_BG, Gelbgrün 70°), nur kräftiger (Daria, 2026-11-11: „gleiche Farbe, nur andere Intensität“).
 */
const KRABBE_GRUEN = '#DDFF33';
const KRABBE_FARBE: Record<number, string> = {
  1: color.text.primary,
  2: color.bg.screen,
  3: isFashionable ? color.accent.confirmation : KRABBE_GRUEN,
};

export function SystemAvatar() {
  const { w, h, pixels } = KRABBE_PIXEL;
  return (
    <View style={styles.systemAvatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={KRABBE_BREITE} height={(KRABBE_BREITE * h) / w} viewBox={`0 0 ${w} ${h}`}>
        {pixels.map(({ x, y, v }) => (
          // etwas überlappend, damit beim Skalieren keine Haarlinien zwischen den Pixeln entstehen
          <Rect key={`${x}-${y}`} x={x} y={y} width={1.04} height={1.04} fill={KRABBE_FARBE[v]} />
        ))}
      </Svg>
    </View>
  );
}

/** Kiez-Look: Systemnachricht mit Avatar links, unten bündig wie im Chat */
function FromSystem({
  children,
  style,
  opacity,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Avatar und Blase erscheinen gemeinsam (useMessageIn) */
  opacity?: Animated.Value;
}) {
  if (isFashionable) return <>{children}</>;
  return (
    <Animated.View style={[styles.systemRow, style, opacity ? { opacity } : null]}>
      <SystemAvatar />
      {children}
    </Animated.View>
  );
}

/**
 * Figma „Notice“: `info` für Erklärungen, `warning` für Dinge mit Folgen. Mit `onClose` ein Kreuz rechts.
 * Jede Blase hat unten links die spitze Ecke wie eine Sprechblase, da jede ihren Avatar hat (Daria, 2026-11-09).
 * `tail` ist deshalb ohne Wirkung. `feed` macht die Blase grau statt gelbgrün, nur für Hinweise im Feed (Daria, 2026-11-12).
 */
export function Notice({
  message,
  variant = 'info',
  onClose,
  feed = false,
}: {
  message: string;
  variant?: 'info' | 'warning';
  onClose?: () => void;
  tail?: boolean;
  feed?: boolean;
}) {
  const t = useTexts();
  const sky = useMessageIn(feed);
  const ink = feed ? FEED_TEXT : SKY_TEXT;
  return (
    <FromSystem opacity={sky.opacity}>
    <Animated.View
      style={[
        styles.notice,
        !isFashionable && styles.noticeSky,
        !isFashionable && { backgroundColor: sky.backgroundColor, transform: [{ scale: sky.scale }] },
      ]}
      accessibilityRole={variant === 'warning' ? 'alert' : undefined}
    >
      {/* Kiez-Look: Icon nur bei Warnungen, sonst sähen Warnung und Info gleich aus (Daria, 2026-11-09).
          Feste Größe, sonst schrumpft das Icon neben langem Text. */}
      {isFashionable || variant === 'warning' ? (
        <View style={styles.noticeIcon}>
          <Icon
            name="info-filled"
            size={isFashionable ? undefined : 17}
            color={isFashionable ? (variant === 'warning' ? color.accent.signal : color.text.primary) : ink}
          />
        </View>
      ) : null}
      <LinkedText style={[styles.noticeText, !isFashionable && styles.noticeTextSky, !isFashionable && feed && { color: ink }]} value={message} />
      {onClose ? (
        <IconButton
          icon="close"
          iconSize={14}
          iconColor={isFashionable ? color.text.secondary : ink}
          accessibilityLabel={t('Hinweis schließen')}
          onPress={onClose}
          style={styles.noticeClose}
        />
      ) : null}
    </Animated.View>
    </FromSystem>
  );
}

/**
 * Abstände im Chat (Daria, 2026-11-09): zwischen Nachrichten derselben Seite klein, beim Wechsel zwischen Frage
 * und App etwas größer. Wechsel von 12 auf 6 verringert (Daria, 2026-11-11: „reduce spacing between bubbles“).
 */
export const CHAT_GAP_SAME = space[4];
/** Rundung der Chatblasen (Frage, Antwort, Systemmeldung): im Kiez-Look runder als radius.xl (Daria, 2026-11-09) */
const CHAT_RADIUS = isFashionable ? radius.xl : 26;
export const CHAT_GAP_CHANGE = space[6];

/**
 * Hinweis als Frage (Daria, 2026-11-09): blasse Chatnachricht rechts, wie selbst gefragt. Ein Tipp zeigt darunter
 * links die Antwort als Chatnachricht, ein zweiter Tipp blendet sie wieder aus.
 * `then`: weitere Nachrichten der App (z. B. eine Warnung). Sie folgen dicht auf die Antwort, bei zugeklappter
 * Frage mit dem größeren Abstand. Offen bekommt das Ganze unten Luft, da danach meist wieder eine Frage folgt.
 */
export function QuestionHint({ question, answer, then }: { question: string; answer: string; then?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const shown = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!open) return;
    shown.setValue(0);
    // Nur im Fashionable Look, im Kiez-Look blendet SkyAnswer selbst ein
    Animated.timing(shown, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [open, shown]);
  return (
    <View style={open ? styles.qaOpen : undefined}>
      <UserBubble purple={open} accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)}>
        {question}
      </UserBubble>
      {open ? (
        isFashionable ? (
          <Animated.View
            style={[
              styles.answer,
              styles.afterChange,
              { opacity: shown, transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] },
            ]}
          >
            <LinkedText style={styles.answerText} value={answer} />
          </Animated.View>
        ) : (
          <SkyAnswer answer={answer} />
        )
      ) : null}
      {then ? <View style={open ? styles.afterSame : styles.afterChange}>{then}</View> : null}
    </View>
  );
}

/** Antwort im Kiez-Look: blendet ein und leuchtet auf wie die übrigen Systemblasen (useMessageIn) */
function SkyAnswer({ answer }: { answer: string }) {
  const sky = useMessageIn();
  return (
    <FromSystem style={styles.afterChange} opacity={sky.opacity}>
      <Animated.View
        style={[styles.answer, styles.answerSky, { backgroundColor: sky.backgroundColor, transform: [{ scale: sky.scale }] }]}
      >
        <LinkedText style={[styles.answerText, styles.answerTextSky]} value={answer} />
      </Animated.View>
    </FromSystem>
  );
}

/**
 * Frage, mit der eine Erklärung beginnt (Daria, 2026-11-11): rechts wie eine eigene Nachricht. Erst blass, die
 * Person stellt sie mit einem Tipp, dann wird sie lila wie gesendet und bleibt so stehen. Was danach kommt, zeigt der
 * Aufrufer erst mit `asked` (Daria, 2026-11-11: „bei einer Frage immer auf den Tipp warten“).
 * Für Anleitungen (`SetupSteps`, Weiterposten) und `Explanation`. Zum Auf- und Zuklappen dient `QuestionHint`.
 */
export function AskedQuestion({ question, asked, onAsk }: { question: string; asked: boolean; onAsk: () => void }) {
  return (
    <UserBubble purple={asked} disabled={asked} accessibilityState={{ disabled: asked }} onPress={onAsk}>
      {question}
    </UserBubble>
  );
}

/**
 * Erklärung oben auf einem Screen (Daria, 2026-11-11): rechts die Frage, nach einem Tipp darauf links die Antwort
 * der App mit der Krabbe. Ersetzt die graue Kater-Karte überall dort, wo sie erklärt, was der Screen tut
 * (Designsystem › So schreibt die App Erklärungen, Regel 1).
 */
export function Explanation({ question, answer }: { question: string; answer: string }) {
  const [asked, setAsked] = useState(false);
  return (
    <View>
      <AskedQuestion question={question} asked={asked} onAsk={() => setAsked(true)} />
      {asked ? (
        <View style={styles.afterChange}>
          <Notice message={answer} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Antwort zum Antippen (Daria, 2026-11-09): rechts wie eine eigene Nachricht, z. B. „Ja, los!“. Angetippt wird sie
 * lila wie gesendet und bleibt so stehen.
 */
export function ChatReply({ label, sent, onPress }: { label: string; sent: boolean; onPress: () => void }) {
  const tx = useTexts();
  // Kommt nach den Systemnachrichten davor an die Reihe (useMessageIn)
  const { opacity } = useMessageIn();
  return (
    <Animated.View style={{ opacity }}>
      <UserBubble purple={sent} accessibilityState={{ disabled: sent }} disabled={sent} onPress={onPress}>
        {tx(label)}
      </UserBubble>
    </Animated.View>
  );
}

/** Figma „InfoRow“: Wert links, Icon rechts in einer 24er-Box. */
/** `placeholder`: graue, kursive Zeile für eine fehlende Angabe, z. B. im leeren Schaufenster (Daria, 2026-11-11) */
export function InfoRow({ icon, value, placeholder }: { icon: IconName; value: string; placeholder?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoText, placeholder && styles.infoPlaceholder]}>{value}</Text>
      <View style={styles.iconBox}>
        <Icon name={icon} size={icon === 'map-pin' ? 22 : 24} />
      </View>
    </View>
  );
}

/** Lila hell in der Farbe des Katers, nicht grün wie die Systemblasen der Krabbe (Daria, 2026-11-11) */
const KATER_BLASE = withAlpha(color.accent.primary, 0.22);
/** Derselbe Ton deckend, für Blasen, die über anderem Inhalt schweben (lila hell auf dem Grund #232326) */
const KATER_BLASE_DECKEND = '#3B3B55';
const KATER_KREUZ = '#C9C9FF';
/** Etwas größer als ein Profilbild in der Liste (Daria, 2026-11-11) */
const KATER_AVATAR = 44;

/**
 * Der Kater spricht (Daria, 2026-11-11). Eine Komponente für alles, was der Kater sagt.
 * Kiez-Look: Sprechblase wie im Chat, lila hell, Kater im Kreis links unten bündig, die spitze Ecke unten links
 * zeigt auf ihn. Optional mit fetter Überschrift. Ein Tipp auf die Blase führt weiter (`onPress`), das Kreuz
 * schließt sie (`onClose`).
 * Fashionable Look bleibt wie bisher: Blase mit Spitze, Kater nach `mood` in der Kachel daneben (Daria, 30.10.2026).
 * Erklärungen, was ein Screen tut, schreibt nicht der Kater, sondern die Krabbe (`Explanation`, `Notice`).
 */
export function KaterCard({
  children,
  title,
  mood = 'default',
  onPress,
  onClose,
  accessibilityHint,
  floating,
}: {
  children: ReactNode;
  title?: string;
  mood?: CatMood;
  onPress?: () => void;
  onClose?: () => void;
  accessibilityHint?: string;
  /** Schwebt über anderem Inhalt: Blase deckend statt durchscheinend */
  floating?: boolean;
}) {
  // Texte aus dem CMS (Tabelle app_texts). Nur reiner Text lässt sich ersetzen; Texte mit Namen
  // setzen die Screens selbst über t() mit Platzhaltern zusammen.
  const tx = useTexts();
  if (typeof children === 'string') children = tx(children);
  if (title) title = tx(title);
  const role = onPress ? ('button' as const) : undefined;
  if (isFashionable) {
    return (
      <Pressable accessibilityRole={role} accessibilityHint={accessibilityHint} onPress={onPress} disabled={!onPress} style={styles.speech}>
        <View style={[styles.speechBubble, styles.speechBubbleFashionable]}>
          <View style={styles.speechTexts}>
            {title ? <Text style={styles.speechTitle}>{title}</Text> : null}
            <Text style={styles.speechText}>{children}</Text>
          </View>
          <View style={styles.speechTail} />
        </View>
        <View style={styles.speechCatFashionable} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Cat mood={mood} height={36} tint={color.text.primary} />
        </View>
      </Pressable>
    );
  }
  return (
    <View style={styles.katerRow}>
      <KaterRund size={KATER_AVATAR} />
      <Pressable accessibilityRole={role} accessibilityHint={accessibilityHint} onPress={onPress} disabled={!onPress} style={[styles.katerBlase, floating && styles.katerBlaseDeckend]}>
        <View style={styles.speechTexts}>
          {title ? <Text style={styles.speechTitle}>{title}</Text> : null}
          <Text style={styles.katerText}>{children}</Text>
        </View>
        {onClose ? (
          <IconButton
            icon="close"
            iconSize={14}
            iconColor={KATER_KREUZ}
            accessibilityLabel={tx('Hinweis schließen')}
            onPress={onClose}
            style={styles.katerKreuz}
          />
        ) : null}
      </Pressable>
    </View>
  );
}

/**
 * Kater im Kreis: Darias Kater-Avatar (2026-11-11), lila Kater mit grünen Herzen in der Brille auf gelbem Kreis.
 * Er fährt beim Erscheinen sanft von unten in den Kreis herein. Der gelbe Kreis pulsiert langsam und unregelmäßig,
 * dabei scheint darunter ein Farbverlauf durch. Die Herzen in der Brille blenden ab und zu ein und wieder aus
 * (Daria, 2026-11-11: „Puls weniger regelmäßig, weniger schnell“, „Herzen nicht ständig zeigen“).
 * Mit „Bewegung reduzieren“ sitzt der Kater still, der Kreis bleibt voll und die Herzen bleiben sichtbar.
 */
/** Farbverlauf unter dem Gelb: scheint durch, wenn der Kreis beim Atmen durchsichtiger wird (Daria, 2026-11-11) */
const RUND_GRUND = require('../../assets/kater/kater-avatar-grund.png');
const RUND = 64;
/** Zufallszahl zwischen a und b */
const zwischen = (a: number, b: number) => a + Math.random() * (b - a);
/** `bg`: feste Farbe statt Verlauf und Gelb, z. B. die Kartenfarbe in Routine (Daria, 2026-11-12) */
export function KaterRund({ size = RUND, bg }: { size?: number; bg?: string } = {}) {
  const [still, setStill] = useState<boolean | null>(null);
  const rein = useRef(new Animated.Value(0)).current;
  const puls = useRef(new Animated.Value(1)).current;
  const herzen = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(setStill);
  }, []);
  // Von unten herein
  useEffect(() => {
    if (still === null) return;
    if (still) {
      rein.setValue(1);
      return;
    }
    const a = Animated.timing(rein, { toValue: 1, duration: 750, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [still, rein]);
  // Gelber Kreis atmet: jeder Atemzug anders lang und anders tief, dazwischen kurze Ruhe
  useEffect(() => {
    if (still !== false) return;
    let aus = false;
    let a: Animated.CompositeAnimation | null = null;
    const atem = () => {
      if (aus) return;
      a = Animated.sequence([
        Animated.timing(puls, { toValue: zwischen(0.35, 0.65), duration: zwischen(2400, 4200), easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(puls, { toValue: 1, duration: zwischen(2400, 4200), easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.delay(zwischen(400, 2600)),
      ]);
      a.start(({ finished }) => finished && atem());
    };
    atem();
    return () => {
      aus = true;
      a?.stop();
      puls.setValue(1);
    };
  }, [still, puls]);
  // Herzen: nach einer Weile sanft einblenden, kurz stehen lassen, wieder ausblenden, dann länger Pause
  useEffect(() => {
    if (still === null) return;
    if (still) {
      herzen.setValue(1);
      return;
    }
    let aus = false;
    let a: Animated.CompositeAnimation | null = null;
    const blinken = () => {
      if (aus) return;
      a = Animated.sequence([
        Animated.delay(zwischen(2500, 7000)),
        Animated.timing(herzen, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.delay(zwischen(1200, 2400)),
        Animated.timing(herzen, { toValue: 0, duration: 900, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]);
      a.start(({ finished }) => finished && blinken());
    };
    blinken();
    return () => {
      aus = true;
      a?.stop();
    };
  }, [still, herzen]);
  return (
    <View
      style={[styles.rund, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {bg ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} />
      ) : (
        <>
          <Image source={RUND_GRUND} style={StyleSheet.absoluteFill} contentFit="cover" />
          <Animated.View style={[StyleSheet.absoluteFill, styles.rundGrund, { opacity: puls }]} />
        </>
      )}
      <Animated.View
        style={{
          opacity: still === null ? 0 : 1,
          transform: [{ translateY: rein.interpolate({ inputRange: [0, 1], outputRange: [size, 0] }) }],
        }}
      >
        <SvgXml xml={katerAvatarSvg({ herzen: false })} width={size} height={size} />
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: herzen }]}>
          <SvgXml xml={katerHerzenSvg()} width={size} height={size} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/** Figma „OperationTag“: Operationsname oben links auf dem Foto, nur für die annehmende Person. */
export function OperationTag({ name }: { name: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

/**
 * Abschnitt mit kleiner Überschrift (z. B. „Coins (optional)“, „Notiz“). `large`: etwas größere Überschrift für
 * Seiten aus mehreren Abschnitten (Daria, 2026-11-09). `heading`: Abschnittsüberschrift auf Einstellungsseiten wie
 * Funktionen und Kalender, deutlich größer und mit mehr Luft darüber (Daria, 2026-11-10).
 */
export function FieldGroup({
  label,
  children,
  large,
  heading,
}: {
  label: string;
  children: ReactNode;
  large?: boolean;
  heading?: boolean;
}) {
  return (
    <View style={styles.group}>
      <Text
        style={[styles.groupLabel, large && styles.groupLabelLarge, heading && styles.groupHeading]}
        accessibilityRole={large || heading ? 'header' : undefined}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: isFashionable
    ? { ...text.caption, letterSpacing: 1, textTransform: 'uppercase', color: color.text.secondary }
    : // 16 zusätzlich über der Überschrift: mit dem üblichen Abstand von 24 trennen 40 die Abschnitte (Daria, 2026-11-10)
      { fontFamily: font.onPhoto, fontSize: 18, lineHeight: 24, color: color.text.primary, marginTop: space[16] },
  sectionBlock: { gap: isFashionable ? space[8] : space[12] },
  collapseHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space[12] },
  collapseIcon: { paddingBottom: 2 },
  collapseIconOpen: { transform: [{ rotate: '90deg' }] },
  qaOpen: { paddingBottom: CHAT_GAP_CHANGE - CHAT_GAP_SAME },
  afterSame: { marginTop: CHAT_GAP_SAME },
  afterChange: { marginTop: CHAT_GAP_CHANGE },
  // Rahmen und Fläche außen, damit sie aufleuchten können; der Innenabstand gehört zur Tippfläche
  question: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    transformOrigin: 'right bottom',
    borderRadius: CHAT_RADIUS,
    borderBottomRightRadius: space[4],
    borderWidth: stroke.ultraThin,
    borderColor: color.line.hairline,
  },
  questionInner: { paddingVertical: space[8], paddingHorizontal: 14 },
  questionPressed: { opacity: 0.6 },
  questionText: { ...text.body, color: color.text.secondary },
  answer: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: CHAT_RADIUS,
    borderBottomLeftRadius: space[4],
    backgroundColor: color.bg.surface,
  },
  answerText: { ...text.body, color: color.text.primary },
  notice: {
    flexDirection: 'row',
    gap: space[8],
    padding: space[12],
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
  },
  noticeText: { ...text.caption, color: color.text.primary, flex: 1 },
  // Gestellte Frage lila wie eine eigene Nachricht, die Antwort der App helles Himmelblau (Daria, 2026-11-09)
  questionOpen: { backgroundColor: color.accent.primary, borderColor: color.accent.primary },
  questionTextOpen: { color: color.text.onAccent },
  answerSky: { backgroundColor: SKY_BG, flexShrink: 1, transformOrigin: 'left bottom' },
  noticeSky: {
    alignSelf: 'flex-start',
    transformOrigin: 'left bottom',
    flexShrink: 1,
    maxWidth: '88%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: CHAT_RADIUS,
    borderBottomLeftRadius: space[4],
    backgroundColor: SKY_BG,
  },
  // Avatar unten bündig mit der Blase, die Blase schrumpft um seine Breite
  systemRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space[8] },
  systemAvatar: { flexShrink: 0 },
  // Kreuz ragt in den Innenabstand, damit die Blase nicht höher wird als der Text
  noticeIcon: { flexShrink: 0 },
  link: { textDecorationLine: 'underline' },
  noticeClose: { marginVertical: -10, marginRight: -10, marginLeft: -4 },
  noticeTextSky: { ...text.body, color: SKY_TEXT, flexGrow: 0, flexShrink: 1, flexBasis: 'auto' },
  answerTextSky: { color: '#1F2123' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: space[8], minHeight: 24 },
  iconBox: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  infoText: { ...text.body, color: color.text.primary, flex: 1 },
  infoPlaceholder: { color: color.text.secondary, fontStyle: 'italic' },
  flex: { flex: 1 },
  tag: {
    position: 'absolute',
    top: space[12],
    left: space[12],
    maxWidth: '80%',
    paddingVertical: space[4],
    paddingHorizontal: space[12],
    borderRadius: radius.full,
    backgroundColor: color.accent.signal,
  },
  tagText: { fontFamily: font.semiBold, fontSize: 11, lineHeight: 16, color: color.bg.screen },
  speechBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[12],
    paddingLeft: space[16],
    paddingRight: space[12],
    borderRadius: radius.xl,
    backgroundColor: color.bg.surface,
    borderWidth: stroke.thin,
    borderColor: color.line.raised,
  },
  speechTexts: { flex: 1, gap: space[4] },
  katerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space[8] },
  katerBlase: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: '88%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: CHAT_RADIUS,
    borderBottomLeftRadius: space[4],
    backgroundColor: KATER_BLASE,
  },
  // Größer als der Fließtext, der Kater spricht laut (Daria, 2026-11-11)
  katerBlaseDeckend: { backgroundColor: KATER_BLASE_DECKEND },
  katerText: { ...text.body, fontSize: 17, lineHeight: 23, color: color.text.primary, flexShrink: 1 },
  // Kreuz ragt in den Innenabstand, damit die Blase nicht höher wird als der Text
  katerKreuz: { marginVertical: -10, marginRight: -10, marginLeft: space[4] },
  speech: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  speechBubbleFashionable: { flex: 1, paddingRight: space[16] },
  // Spitze rechts zur Katze: gedrehtes Quadrat in der Farbe der Blase (nur Fashionable)
  speechTail: {
    position: 'absolute',
    right: -7,
    top: '50%',
    marginTop: -8,
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: color.bg.surface,
    transform: [{ rotate: '45deg' }],
  },
  // Fashionable: Kachel 68 pt, Kater 36 pt (Daria, 24.10.2026)
  speechCatFashionable: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: color.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speechTitle: { ...text.cardTitleCompact, color: color.text.primary },
  speechText: { fontFamily: font.text, fontSize: 15, lineHeight: 21, color: color.text.primary },
  rund: { overflow: 'hidden' },
  rundGrund: { backgroundColor: KATER_AVATAR_GELB },
  group: { gap: space[8] },
  groupLabel: { ...text.caption, color: color.text.secondary },
  groupLabelLarge: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 20, marginBottom: space[4] },
  // 20 mehr Luft darüber: mit dem Abstand von 40 zwischen den Abschnitten 60, also 50 % mehr (Daria, 2026-11-10)
  groupHeading: { ...text.settingsHeading, marginTop: space[20], marginBottom: space[4] },
});
