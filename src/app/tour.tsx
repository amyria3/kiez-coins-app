import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { Cat } from '../components/icons/Brand';
import { ChallengePost } from '../components/ChallengePost';
import { AudienceHint } from '../components/AudienceHint';
import { KaterCard } from '../components/Content';
import { Segments } from '../components/FeedHeader';
import { CheckOption, SwitchRow, TextField } from '../components/Form';
import { explain } from '../components/Nudge';
import { iconSvgs } from '../components/icons/svgs';
import { errorText, saveTourFeedback, type TourFeedbackChoice } from '../data/remote';
import { useStore } from '../data/store';
import { CameraButton } from '../components/TabBar';
import { sampleChallenges, sampleUsers } from '../data/sample';
import { Text } from '../components/T';
import { t } from '../data/texts';
import { TOUR_FEEDBACK_OTHER_MAX, TOUR_SEEN_KEY, tourFeedbackOptions, tourSteps, type TourStep } from '../data/tour';
import { useAppDimensions } from '../theme/layout';
import { color, radius, space, text } from '../theme/tokens';

/**
 * Route `tour`: Begrüßung mit kurzen Videos zu den Hauptfunktionen (Daria, 22.10.2026).
 * Etwa 5 Minuten nach dem Anheuern fragt die App, ob sie die Tour zeigen soll (TourOffer), sonst über Dein Konto › So geht Kiez Coins. `next`: Ziel danach.
 * Wischen oder „Weiter“ blättert. Videos stehen in data/tour.ts.
 */
export default function Tour() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { width } = useAppDimensions();
  const { mode } = useStore();
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  // Höhe des Blätterbereichs: Jede Seite füllt sie, damit die Fläche oben den Rest neben Titel und Text nimmt
  const [pagerH, setPagerH] = useState(0);
  const last = page === tourSteps.length - 1;
  const onFeedback = tourSteps[page]?.kind === 'feedback';

  // Letzte Seite: Wie fandest Du diese Erklärung? (Daria, 29.10.2026)
  const [choices, setChoices] = useState<TourFeedbackChoice[]>([]);
  const [other, setOther] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const answered = choices.length > 0 || !!other.trim();

  const finish = async () => {
    try {
      await AsyncStorage.setItem(TOUR_SEEN_KEY, '1');
    } catch {
      // dann kommt die Tour beim nächsten Mal noch einmal
    }
    if (next) router.replace(next as never);
    else if (router.canGoBack()) router.back();
    else router.replace('/feed');
  };

  const send = async () => {
    if (!answered || sending) return;
    // Beispieldaten: nichts senden, nur danken
    if (mode === 'live') {
      setSending(true);
      try {
        await saveTourFeedback(choices, other);
      } catch (error) {
        Alert.alert('Antwort nicht gesendet', errorText(error));
        return;
      } finally {
        setSending(false);
      }
    }
    setSent(true);
  };

  const goTo = (i: number) => {
    pager.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };

  // Im Browser blättern die Pfeiltasten vor und zurück; der Fokus bleibt auf „Weiter“ (Daria, 28.10.2026)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      // Nicht beim Tippen im Feld „Anderes“
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight' && page < tourSteps.length - 1) goTo(page + 1);
      else if (e.key === 'ArrowLeft' && page > 0) goTo(page - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1));
    if (i !== page) setPage(i);
  };

  const toggle = (key: TourFeedbackChoice) =>
    setChoices((all) => (all.includes(key) ? all.filter((k) => k !== key) : [...all, key]));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { paddingTop: insets.top + space[16] }]}
    >
      <View style={styles.top}>
        <Text style={styles.step}>{t('{n} von {total}', { n: page + 1, total: tourSteps.length })}</Text>
        {sent ? <View style={styles.topSpacer} /> : <Button label="Überspringen" variant="ghost" onPress={finish} />}
      </View>
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        keyboardShouldPersistTaps="handled"
        onLayout={(e) => setPagerH(e.nativeEvent.layout.height)}
      >
        {tourSteps.map((step, i) => (
          <View key={step.key} style={[styles.page, { width }, pagerH ? { height: pagerH } : null]}>
            {step.kind === 'feedback' ? (
              sent ? (
                <CaptainLikes choices={choices} other={other} />
              ) : (
                <ScrollView style={styles.flex} contentContainerStyle={styles.feedback} keyboardShouldPersistTaps="handled">
                  <Cat mood="high" height={64} />
                  <Text style={styles.title} accessibilityRole="header">
                    {step.title}
                  </Text>
                  <Text style={styles.step}>{step.text}</Text>
                  {tourFeedbackOptions.map((o) => (
                    <CheckOption key={o.key} label={o.label} selected={choices.includes(o.key)} onPress={() => toggle(o.key)} />
                  ))}
                  <TextField
                    label="Anderes"
                    helperText={t('Freiwillig, höchstens {max} Zeichen.', { max: TOUR_FEEDBACK_OTHER_MAX })}
                    value={other}
                    onChangeText={setOther}
                    maxLength={TOUR_FEEDBACK_OTHER_MAX}
                    multiline
                  />
                </ScrollView>
              )
            ) : (
              <>
                <TourMedia step={step} active={i === page} />
                {/* Langer Text auf kleinen Bildschirmen: Er lässt sich scrollen, statt abgeschnitten zu werden */}
                <ScrollView style={styles.textBlock} contentContainerStyle={styles.textContent} showsVerticalScrollIndicator={false}>
                  <Text style={styles.title} accessibilityRole="header">
                    {step.title}
                  </Text>
                  <Text style={styles.body}>{step.text}</Text>
                </ScrollView>
              </>
            )}
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots} accessibilityElementsHidden>
        {tourSteps.map((s, i) => (
          <View key={s.key} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>
      <ActionBar>
        {onFeedback && !sent ? (
          <Button
            label={sending ? 'Wird gesendet …' : 'Absenden'}
            busy={sending}
            disabled={!answered || sending}
            whyDisabled={() => !sending && explain('Noch keine Antwort', 'Wähle eine Antwort oder schreib etwas unter „Anderes“. Oder tippe oben auf „Überspringen“.')}
            onPress={send}
          />
        ) : (
          <Button autoFocus label={last ? 'Los geht’s' : 'Weiter'} icon="this-way" onPress={() => (last ? finish() : goTo(page + 1))} />
        )}
      </ActionBar>
    </KeyboardAvoidingView>
  );
}

/**
 * Dank nach der Rückmeldung (Daria, 29.10.2026): Die Antwort steht als Sprechblase da, Cat The Käptn gibt ihr
 * ein Herz (springt auf die Blase, kleine Herzen steigen auf), darunter sein Dank.
 * Mit „Bewegung reduzieren“ erscheint das Herz ohne Sprung und ohne aufsteigende Herzen.
 */
function CaptainLikes({ choices, other }: { choices: TourFeedbackChoice[]; other: string }) {
  const pop = useRef(new Animated.Value(0)).current;
  const rise = useRef(LIKE_HEARTS.map(() => new Animated.Value(0))).current;
  const thanks = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let stopped = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (stopped) return;
        const native = Platform.OS !== 'web';
        if (reduce) {
          pop.setValue(1);
          Animated.timing(thanks, { toValue: 1, duration: 200, useNativeDriver: native }).start();
          return;
        }
        Animated.sequence([
          Animated.delay(450),
          Animated.parallel([
            Animated.spring(pop, { toValue: 1, friction: 4, tension: 140, useNativeDriver: native }),
            ...rise.map((v, i) =>
              Animated.timing(v, { toValue: 1, duration: 900, delay: 120 + i * 110, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
            ),
          ]),
          Animated.timing(thanks, { toValue: 1, duration: 260, useNativeDriver: native }),
        ]).start();
      });
    return () => {
      stopped = true;
    };
  }, [pop, rise, thanks]);

  const labels = tourFeedbackOptions.filter((o) => choices.includes(o.key)).map((o) => t(o.label));
  const answer = [...labels, other.trim() ? `„${other.trim()}“` : ''].filter(Boolean).join(' · ');
  const heart = (h: number) => {
    const icon = iconSvgs.feed;
    return <SvgXml xml={icon.svg(color.accent.affection)} width={(icon.width / icon.height) * h} height={h} />;
  };

  return (
    <View style={styles.likes}>
      <View style={styles.answerRow}>
        <View style={styles.answer} accessibilityLabel={t('Deine Antwort: {answer}', { answer })}>
          <Text style={styles.answerLabel}>Deine Antwort</Text>
          <Text style={styles.answerText} numberOfLines={6}>
            {answer}
          </Text>
          <Animated.View
            style={[styles.like, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]}
            accessibilityElementsHidden
          >
            {heart(30)}
            {LIKE_HEARTS.map((h, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.likeSmall,
                  {
                    opacity: rise[i].interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
                    transform: [
                      { translateX: rise[i].interpolate({ inputRange: [0, 1], outputRange: [0, h.x] }) },
                      { translateY: rise[i].interpolate({ inputRange: [0, 1], outputRange: [0, -h.y] }) },
                    ],
                  },
                ]}
              >
                {heart(h.size)}
              </Animated.View>
            ))}
          </Animated.View>
        </View>
        <Animated.Text style={[styles.liked, { opacity: pop }]}>{t('Cat The Käptn gefällt das')}</Animated.Text>
      </View>
      <Animated.View style={{ opacity: thanks, transform: [{ translateY: thanks.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <KaterCard mood="high" title="Danke, dass Du uns unterstützt!">
          Denn ohne Dein Feedback tappen wir im Dunklen.
        </KaterCard>
      </Animated.View>
    </View>
  );
}

const LIKE_HEARTS = [
  { x: -22, y: 46, size: 14 },
  { x: 14, y: 58, size: 11 },
  { x: -4, y: 74, size: 9 },
];

/**
 * Ohne Video zeigt jede Seite echte Elemente der App mit Beispieldaten, statt nur zu beschreiben (Daria, 28.10.2026):
 * posten = Beitrag mit Kamera-Knopf, annehmen = Beitrag mit „Challenge annehmen“, coins = Beitrag mit Coins,
 * gruppen = Gruppenaufgabe mit Edensteinen. Nur zum Ansehen, Tippen bewirkt nichts.
 */
type Preview = {
  challenge?: string;
  accept?: boolean;
  camera?: boolean;
  /** Bild öffentlich zeigen, auch wenn das Beispiel privat ist */
  public?: boolean;
  /** Umschalter mit „Privat“ und Hinweis darüber */
  privateMode?: boolean;
  /** Schalter „Auf einen Umkreis von 5 km begrenzen“, eingeschaltet */
  radiusSwitch?: boolean;
};
const PREVIEW: Record<string, Preview> = {
  posten: { challenge: 'igelnest', camera: true },
  annehmen: { challenge: 'gruenstreifen-malibu', accept: true },
  coins: { challenge: 'sommerfest' },
  gruppen: { challenge: 'gruppe-muell' },
  // Ergänzt am 29.10.2026 (Daria)
  bild: { challenge: 'privat-garten', public: true },
  sichtbarkeit: { radiusSwitch: true, challenge: 'igelnest' },
  privat: { challenge: 'privat-garten', privateMode: true },
};
const PRIVATE_TABS = [
  { key: 'private', label: 'Privat' },
  { key: 'kiez', label: 'Kiez' },
  { key: 'everywhere', label: 'Überall' },
];

function TourPreview({ stepKey }: { stepKey: string }) {
  const p = PREVIEW[stepKey];
  const found = p?.challenge ? sampleChallenges.find((c) => c.id === p.challenge) : undefined;
  // Immer als offene Challenge zeigen, damit Frist, Coins und Edensteine wie im Feed aussehen
  const challenge = found && {
    ...found,
    status: 'open' as const,
    deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
    // Öffentliches Bild: ohne den Text „Nur für mich …“ des privaten Beispiels
    ...(p?.public ? { private: undefined, text: '' } : {}),
  };
  const author = challenge && sampleUsers.find((u) => u.id === challenge.authorId);
  // Die Fläche passt sich dem Bildschirm an, der Text darunter bleibt ganz sichtbar (Daria, 29.10.2026).
  // Deshalb misst die Vorschau Fläche und Inhalt und verkleinert den Inhalt, bis er hineinpasst.
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [contentH, setContentH] = useState(0);
  if (!p || (!p.radiusSwitch && (!challenge || !author))) return <Cat mood="high" height={120} />;
  const noop = () => undefined;
  const scale = box.h && contentH ? Math.min(1, box.h / contentH) : 1;
  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
    <View
      style={[
        styles.preview,
        {
          width: box.w,
          top: (box.h - contentH) / 2,
          opacity: box.w && contentH ? 1 : 0,
          transform: [{ scale }],
        },
      ]}
      onLayout={(e) => setContentH(e.nativeEvent.layout.height)}
    >
      {p.privateMode ? (
        <View style={styles.previewMode}>
          <Segments tabs={PRIVATE_TABS} selectedKey="private" onChange={noop} />
          <AudienceHint audience="private" onClose={noop} />
        </View>
      ) : null}
      {p.radiusSwitch ? (
        <View style={styles.previewSwitch}>
          <SwitchRow
            label="Auf einen Umkreis von 5 km begrenzen"
            description="Dann sehen den Beitrag nur Menschen in Deinem Kiez, nicht in „Überall“. Wer den Link bekommt, kann ihn trotzdem öffnen."
            value
            onValueChange={noop}
          />
        </View>
      ) : null}
      {challenge && author ? (
        <ChallengePost challenge={challenge} author={author} distance={p.privateMode ? undefined : '300 m'} onPress={noop} onLike={noop} />
      ) : null}
      {p.accept ? (
        <View style={styles.previewAction}>
          <Button icon="wir-schaffen-das" label="Challenge annehmen" onPress={noop} />
        </View>
      ) : null}
      {p.camera ? (
        <View style={styles.previewCamera}>
          <CameraButton onPress={noop} inline />
        </View>
      ) : null}
    </View>
    </View>
  );
}

/** Video der Seite, läuft nur, solange die Seite zu sehen ist. Ohne Video echte Elemente der App. */
function TourMedia({ step, active }: { step: TourStep; active: boolean }) {
  if (!step.video) {
    return (
      <View style={styles.media}>
        <TourPreview stepKey={step.key} />
      </View>
    );
  }
  return <TourVideo source={step.video} active={active} />;
}

function TourVideo({ source, active }: { source: number | string; active: boolean }) {
  // Erst laden, wenn es wirklich ein Video gibt: So braucht die App das native Videomodul nur dann.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useVideoPlayer, VideoView } = require('expo-video') as typeof import('expo-video');
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
  });
  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);
  return (
    <View style={styles.media}>
      <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space[16] },
  step: { ...text.caption, color: color.text.secondary },
  page: { paddingHorizontal: space[16], gap: space[16], paddingTop: space[8], paddingBottom: space[8] },
  // Nimmt den Platz, den Titel und Text übrig lassen, höchstens 460
  media: {
    flex: 1,
    maxHeight: 460,
    minHeight: 160,
    borderRadius: radius.card,
    backgroundColor: color.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  video: { width: '100%', height: '100%' },
  // Verkleinert sich, bis Beitrag, Knopf und Kamera ganz in die Fläche passen (TourPreview)
  preview: { position: 'absolute', left: 0, paddingVertical: space[16] },
  previewMode: { gap: space[8], paddingHorizontal: space[16], paddingBottom: space[12] },
  previewSwitch: { paddingHorizontal: space[16], paddingBottom: space[12] },
  flex: { flex: 1 },
  topSpacer: { height: 44 },
  textBlock: { flexGrow: 0, flexShrink: 1 },
  textContent: { gap: space[16] },
  feedback: { gap: space[12], paddingBottom: space[24], alignItems: 'stretch' },
  likes: { flex: 1, justifyContent: 'center', gap: space[32] },
  answerRow: { alignItems: 'flex-end', gap: space[8] },
  answer: {
    maxWidth: '85%',
    gap: space[4],
    paddingVertical: space[12],
    paddingHorizontal: space[16],
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    backgroundColor: color.bg.surface,
  },
  answerLabel: { ...text.caption, color: color.text.secondary },
  answerText: { ...text.body, color: color.text.primary },
  // Herz unten links auf der Blase, wie ein Like auf einer Nachricht
  like: { position: 'absolute', left: -12, bottom: -14, alignItems: 'center' },
  likeSmall: { position: 'absolute', top: 0 },
  liked: { ...text.caption, color: color.accent.affection, paddingRight: space[4] },
  previewAction: { paddingHorizontal: space[16], paddingTop: space[8] },
  previewCamera: { position: 'absolute', right: space[24], bottom: space[24] },
  title: { ...text.headline, color: color.text.primary },
  body: { ...text.body, fontSize: 16, lineHeight: 23, color: color.text.secondary },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space[8], paddingVertical: space[12] },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.line.hairline },
  dotActive: { width: 18, backgroundColor: color.accent.primary },
});
