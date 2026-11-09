import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './T';

import { color, font, isFashionable, radius, space, stroke, text } from '../theme/tokens';
import { useTexts } from '../data/texts';
import { Cat, type CatMood } from './icons/Brand';
import { Icon, type IconName } from './icons/Icon';
import { iconSvgs } from './icons/svgs';
import { SvgXml } from 'react-native-svg';
import { Herz } from './Herz';
import { IconButton } from './IconButton';

// Systemmeldungen als hellblaue Chatblase der App, wie die Antworten auf die Fragen; Icon dunkel wie der Text, nur bei Warnungen (Daria, 2026-11-09)
const SKY_TEXT = '#1F2123';
/** Fläche der Systemmeldungen im Kiez-Look: probeweise das Gelbgrün aus dem Kreis hinter dem Kater (Cat.svg, Startbild) statt Himmelblau #A9DBFF (Daria, 2026-11-09) */
const SKY_BG = '#F0FFA6';

/**
 * Rolle „System“ (Daria, 2026-11-09): Absender der gelbgrünen Systemnachrichten, Avatar 👾 im schwarzen Kreis
 * links neben jeder Blase, wie ein Absender im Chat. Das Emoji kommt vom Gerät.
 */
export const SYSTEM_AVATAR = '👾';
export function SystemAvatar() {
  return (
    <View style={styles.systemAvatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text noTranslate style={styles.systemAvatarText}>
        {SYSTEM_AVATAR}
      </Text>
    </View>
  );
}

/** Kiez-Look: Systemnachricht mit Avatar links, unten bündig wie im Chat */
function FromSystem({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  if (isFashionable) return <>{children}</>;
  return (
    <View style={[styles.systemRow, style]}>
      <SystemAvatar />
      {children}
    </View>
  );
}

/**
 * Figma „Notice“: `info` für Erklärungen, `warning` für Dinge mit Folgen. Mit `onClose` ein Kreuz rechts.
 * `tail={false}` für Nachrichten über der letzten einer Folge: Wie im Chat hat nur die letzte die spitze Ecke.
 */
export function Notice({
  message,
  variant = 'info',
  onClose,
  tail = true,
}: {
  message: string;
  variant?: 'info' | 'warning';
  onClose?: () => void;
  tail?: boolean;
}) {
  const t = useTexts();
  return (
    <FromSystem>
    <View style={[styles.notice, !isFashionable && styles.noticeSky, !isFashionable && !tail && styles.noticeNoTail]} accessibilityRole={variant === 'warning' ? 'alert' : undefined}>
      {/* Kiez-Look: Icon nur bei Warnungen, sonst sähen Warnung und Info gleich aus (Daria, 2026-11-09).
          Feste Größe, sonst schrumpft das Icon neben langem Text. */}
      {isFashionable || variant === 'warning' ? (
        <View style={styles.noticeIcon}>
          <Icon
            name="info-filled"
            size={isFashionable ? undefined : 17}
            color={isFashionable ? (variant === 'warning' ? color.accent.signal : color.text.primary) : SKY_TEXT}
          />
        </View>
      ) : null}
      <Text style={[styles.noticeText, !isFashionable && styles.noticeTextSky]}>{message}</Text>
      {onClose ? (
        <IconButton
          icon="close"
          iconSize={14}
          iconColor={isFashionable ? color.text.secondary : SKY_TEXT}
          accessibilityLabel={t('Hinweis schließen')}
          onPress={onClose}
          style={styles.noticeClose}
        />
      ) : null}
    </View>
    </FromSystem>
  );
}

/**
 * Abstände im Chat (Daria, 2026-11-09): zwischen Nachrichten derselben Seite klein, beim Wechsel zwischen Frage
 * und App größer.
 */
export const CHAT_GAP_SAME = space[4];
/** Rundung der Chatblasen (Frage, Antwort, Systemmeldung): im Kiez-Look runder als radius.xl (Daria, 2026-11-09) */
const CHAT_RADIUS = isFashionable ? radius.xl : 26;
export const CHAT_GAP_CHANGE = space[12];

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
    Animated.timing(shown, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [open, shown]);
  return (
    <View style={open ? styles.qaOpen : undefined}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [styles.question, open && !isFashionable && styles.questionOpen, pressed && styles.questionPressed]}
      >
        <Text style={[styles.questionText, open && !isFashionable && styles.questionTextOpen]}>{question}</Text>
      </Pressable>
      {open ? (
        <FromSystem style={styles.afterChange}>
        <Animated.View
          style={[
            styles.answer,
            isFashionable && styles.afterChange,
            !isFashionable && styles.answerSky,
            // Folgt noch eine Nachricht der App, hat nur die letzte die spitze Ecke
            then ? styles.answerNoTail : null,
            { opacity: shown, transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] },
          ]}
        >
          <Text style={[styles.answerText, !isFashionable && styles.answerTextSky]}>{answer}</Text>
        </Animated.View>
        </FromSystem>
      ) : null}
      {then ? <View style={open ? styles.afterSame : styles.afterChange}>{then}</View> : null}
    </View>
  );
}

/** Figma „InfoRow“: Wert links, Icon rechts in einer 24er-Box. */
export function InfoRow({ icon, value }: { icon: IconName; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoText}>{value}</Text>
      <View style={styles.iconBox}>
        <Icon name={icon} size={icon === 'map-pin' ? 22 : 24} />
      </View>
    </View>
  );
}

/** Figma „SpeechBubble“: Sprechblase, Ecke oben links spitz. */
export function SpeechBubble({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.bubble, style]}>
      <Text style={styles.bubbleText}>{children}</Text>
    </View>
  );
}

/** Figma „KaterBubble“ (Emotion=Happy): Kater mit Sprechblase. */
export function KaterBubble({ children }: { children: ReactNode }) {
  // Seit dem Upgrade „Nachtschicht“ überall die Sprechblase nach Duolingo-Vorbild
  return <KaterCard>{children}</KaterCard>;
}

/**
 * Sprechblase: Text links, rechts auf der Blase der Kater im Kreis. Optional mit fetter Überschrift.
 */
/** Kiez-Look: Icon „cat“ im Kreis ohne Stimmungen; Fashionable: Kater nach `mood` in der Kachel daneben. */
export function KaterCard({ children, title, mood = 'default' }: { children: ReactNode; title?: string; mood?: CatMood }) {
  // Texte aus dem CMS (Tabelle app_texts). Nur reiner Text lässt sich ersetzen; Texte mit Namen
  // setzen die Screens selbst über t() mit Platzhaltern zusammen.
  const tx = useTexts();
  if (typeof children === 'string') children = tx(children);
  if (title) title = tx(title);
  if (isFashionable) {
    // Fashionable Look bleibt wie bisher: Blase mit Spitze, Kater in der Kachel daneben (Daria, 30.10.2026)
    return (
      <View style={styles.speech}>
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
      </View>
    );
  }
  return (
    // Kiez-Look: Kater im Kreis sitzt auf der Blase, rechts neben dem Text (Daria, 30.10.2026)
    <View style={styles.speechBubble}>
      <View style={styles.speechTexts}>
        {title ? <Text style={styles.speechTitle}>{title}</Text> : null}
        <Text style={styles.speechText}>{children}</Text>
      </View>
      <KaterRund />
    </View>
  );
}

/**
 * Kater im Kreis (Daria, 30.10.2026): das Icon „cat“, unten vom Kreis angeschnitten, ohne Kachel.
 * Gläser, Nase und Mund sind ausgespart, dort scheint der Kreis durch. Der Kreis sitzt auf der Sprechblase.
 * Seit 2026-11-02: lila Kater auf schwarzem Kreis; er fährt beim Erscheinen sanft von unten herein,
 * und in seiner Brille blitzen in unregelmäßigen Abständen Herzen auf. Mit „Bewegung reduzieren“ sitzt er still.
 */
const RUND = 64;
const RUND_KATER = 44;
const RUND_SCHWARZ = '#000000';
/** Mitte der Gläser im Icon „cat“ (Fläche 30 × 35) */
const RUND_GLAESER = [
  { x: 9.2, y: 17.9 },
  { x: 20.1, y: 16.2 },
];
const RUND_HERZ = 8.5;
export function KaterRund({ size = RUND, herzen = true }: { size?: number; herzen?: boolean } = {}) {
  // Der kleine interaktive Kater bleibt das Icon „cat“, nicht der mit den orangen Gläsern (Daria, 2026-11-05)
  const cat = iconSvgs.cat;
  // Größere Kreise (leerer Feed, Abschluss-Screens) wachsen im selben Verhältnis (Daria, 2026-11-09)
  const m = size / RUND;
  const katerHoehe = RUND_KATER * m;
  const k = katerHoehe / cat.height;
  const breite = cat.width * k;
  const [still, setStill] = useState<boolean | null>(null);
  const rein = useRef(new Animated.Value(0)).current;
  const herz = useRef(new Animated.Value(0)).current;
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
  // Herzen blitzen unregelmäßig: Pause 2,5 bis 9 s, manchmal zweimal kurz hintereinander
  useEffect(() => {
    if (still !== false || !herzen) return;
    let timer: ReturnType<typeof setTimeout>;
    let laeuft: Animated.CompositeAnimation | undefined;
    const blitz = () =>
      Animated.sequence([
        Animated.timing(herz, { toValue: 1, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.delay(220 + Math.random() * 260),
        Animated.timing(herz, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]);
    const naechstes = () => {
      timer = setTimeout(() => {
        laeuft = Math.random() < 0.3 ? Animated.sequence([blitz(), Animated.delay(140), blitz()]) : blitz();
        laeuft.start(naechstes);
      }, 2500 + Math.random() * 6500);
    };
    naechstes();
    return () => {
      clearTimeout(timer);
      laeuft?.stop();
    };
  }, [still, herz, herzen]);
  const groesse = RUND_HERZ * k;
  return (
    <View
      style={[styles.rund, m !== 1 && { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        style={[
          styles.rundKater,
          m !== 1 && { bottom: -7 * m },
          { opacity: still === null ? 0 : 1, transform: [{ translateY: rein.interpolate({ inputRange: [0, 1], outputRange: [size, 0] }) }] },
        ]}
      >
        <View style={{ width: breite, height: katerHoehe }}>
          <SvgXml xml={cat.svg(color.brand.signature)} width={breite} height={katerHoehe} />
          {(herzen ? RUND_GLAESER : []).map((g) => (
            <Animated.View
              key={g.x}
              style={{
                position: 'absolute',
                left: g.x * k - groesse / 2,
                top: g.y * k - groesse / 2,
                opacity: herz,
                transform: [{ scale: herz.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
              }}
            >
              <Herz size={groesse} />
            </Animated.View>
          ))}
        </View>
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

/** Abschnitt mit kleiner Überschrift (z. B. „Coins (optional)“, „Notiz“) */
export function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  qaOpen: { paddingBottom: CHAT_GAP_CHANGE - CHAT_GAP_SAME },
  afterSame: { marginTop: CHAT_GAP_SAME },
  answerNoTail: { borderBottomLeftRadius: CHAT_RADIUS },
  afterChange: { marginTop: CHAT_GAP_CHANGE },
  question: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    paddingVertical: space[8],
    paddingHorizontal: 14,
    borderRadius: CHAT_RADIUS,
    borderBottomRightRadius: space[4],
    borderWidth: stroke.ultraThin,
    borderColor: color.line.hairline,
  },
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
  answerSky: { backgroundColor: SKY_BG, flexShrink: 1 },
  noticeSky: {
    alignSelf: 'flex-start',
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
  systemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  systemAvatarText: { fontSize: 18, lineHeight: 22, textAlign: 'center' },
  // Kreuz ragt in den Innenabstand, damit die Blase nicht höher wird als der Text
  noticeIcon: { flexShrink: 0 },
  noticeNoTail: { borderBottomLeftRadius: CHAT_RADIUS },
  noticeClose: { marginVertical: -10, marginRight: -10, marginLeft: -4 },
  noticeTextSky: { ...text.body, color: SKY_TEXT, flexGrow: 0, flexShrink: 1, flexBasis: 'auto' },
  answerTextSky: { color: '#1F2123' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: space[8], minHeight: 24 },
  iconBox: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  infoText: { ...text.body, color: color.text.primary, flex: 1 },
  kater: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  flex: { flex: 1 },
  bubble: {
    padding: space[12],
    backgroundColor: color.accent.primary,
    borderTopLeftRadius: 2,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  bubbleText: { ...text.body, color: color.bg.screen },
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
  // Kreis im Grund der Seite, damit er sich von der Blase abhebt
  rund: { width: RUND, height: RUND, borderRadius: RUND / 2, overflow: 'hidden', backgroundColor: RUND_SCHWARZ },
  // Unten 8 pt angeschnitten, über den Ohren gut ein Drittel Luft
  rundKater: { position: 'absolute', left: 0, right: 0, bottom: -7, alignItems: 'center' },
  group: { gap: space[8] },
  groupLabel: { ...text.caption, color: color.text.secondary },
});
