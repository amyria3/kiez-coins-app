import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { Cat } from '../components/icons/Brand';
import { ChallengePost } from '../components/ChallengePost';
import { CameraButton } from '../components/TabBar';
import { sampleChallenges, sampleUsers } from '../data/sample';
import { Text } from '../components/T';
import { t } from '../data/texts';
import { TOUR_SEEN_KEY, tourSteps, type TourStep } from '../data/tour';
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
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  // Höhe des Blätterbereichs: Jede Seite füllt sie, damit die Fläche oben den Rest neben Titel und Text nimmt
  const [pagerH, setPagerH] = useState(0);
  const last = page === tourSteps.length - 1;

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

  const goTo = (i: number) => {
    pager.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };

  // Im Browser blättern die Pfeiltasten vor und zurück; der Fokus bleibt auf „Weiter“ (Daria, 28.10.2026)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
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

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space[16] }]}>
      <View style={styles.top}>
        <Text style={styles.step}>{t('{n} von {total}', { n: page + 1, total: tourSteps.length })}</Text>
        <Button label="Überspringen" variant="ghost" onPress={finish} />
      </View>
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        onLayout={(e) => setPagerH(e.nativeEvent.layout.height)}
      >
        {tourSteps.map((step, i) => (
          <View key={step.key} style={[styles.page, { width }, pagerH ? { height: pagerH } : null]}>
            <TourMedia step={step} active={i === page} />
            <Text style={styles.title} accessibilityRole="header">
              {step.title}
            </Text>
            <Text style={styles.body}>{step.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots} accessibilityElementsHidden>
        {tourSteps.map((s, i) => (
          <View key={s.key} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>
      <ActionBar>
        <Button autoFocus label={last ? 'Los geht’s' : 'Weiter'} icon="this-way" onPress={() => (last ? finish() : goTo(page + 1))} />
      </ActionBar>
    </View>
  );
}

/**
 * Ohne Video zeigt jede Seite echte Elemente der App mit Beispieldaten, statt nur zu beschreiben (Daria, 28.10.2026):
 * posten = Beitrag mit Kamera-Knopf, annehmen = Beitrag mit „Challenge annehmen“, coins = Beitrag mit Coins,
 * gruppen = Gruppenaufgabe mit Edensteinen. Nur zum Ansehen, Tippen bewirkt nichts.
 */
const PREVIEW: Record<string, { challenge: string; accept?: boolean; camera?: boolean }> = {
  posten: { challenge: 'igelnest', camera: true },
  annehmen: { challenge: 'gruenstreifen-malibu', accept: true },
  coins: { challenge: 'sommerfest' },
  gruppen: { challenge: 'gruppe-muell' },
};

function TourPreview({ stepKey }: { stepKey: string }) {
  const p = PREVIEW[stepKey];
  const found = p && sampleChallenges.find((c) => c.id === p.challenge);
  // Immer als offene Challenge zeigen, damit Frist, Coins und Edensteine wie im Feed aussehen
  const challenge = found && { ...found, status: 'open' as const, deadline: new Date(Date.now() + 3 * 86400000).toISOString() };
  const author = challenge && sampleUsers.find((u) => u.id === challenge.authorId);
  // Die Fläche passt sich dem Bildschirm an, der Text darunter bleibt ganz sichtbar (Daria, 29.10.2026).
  // Deshalb misst die Vorschau Fläche und Inhalt und verkleinert den Inhalt, bis er hineinpasst.
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [contentH, setContentH] = useState(0);
  if (!challenge || !author) return <Cat mood="high" height={120} />;
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
      <ChallengePost challenge={challenge} author={author} distance="300 m" onPress={noop} onLike={noop} />
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
  previewAction: { paddingHorizontal: space[16], paddingTop: space[8] },
  previewCamera: { position: 'absolute', right: space[24], bottom: space[24] },
  title: { ...text.headline, color: color.text.primary },
  body: { ...text.body, fontSize: 16, lineHeight: 23, color: color.text.secondary },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space[8], paddingVertical: space[12] },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.line.hairline },
  dotActive: { width: 18, backgroundColor: color.accent.primary },
});
