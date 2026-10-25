import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { Cat } from '../components/icons/Brand';
import { Text } from '../components/T';
import { t } from '../data/texts';
import { TOUR_SEEN_KEY, tourSteps, type TourStep } from '../data/tour';
import { useAppDimensions } from '../theme/layout';
import { color, radius, space, text } from '../theme/tokens';

/**
 * Route `tour`: Begrüßung mit kurzen Videos zu den Hauptfunktionen (Daria, 22.10.2026).
 * Kommt einmal nach dem Anheuern, danach über Dein Konto › So geht Kiez Coins. `next`: Ziel danach.
 * Wischen oder „Weiter“ blättert. Videos stehen in data/tour.ts.
 */
export default function Tour() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { width } = useAppDimensions();
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
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
      >
        {tourSteps.map((step, i) => (
          <View key={step.key} style={[styles.page, { width }]}>
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
        <Button label={last ? 'Los geht’s' : 'Weiter'} icon="this-way" onPress={() => (last ? finish() : goTo(page + 1))} />
      </ActionBar>
    </View>
  );
}

/** Video der Seite, läuft nur, solange die Seite zu sehen ist. Ohne Video der Kater. */
function TourMedia({ step, active }: { step: TourStep; active: boolean }) {
  if (!step.video) {
    return (
      <View style={styles.media}>
        <Cat mood="high" height={120} />
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
  page: { paddingHorizontal: space[16], gap: space[16], paddingTop: space[8] },
  media: {
    flex: 1,
    maxHeight: 460,
    minHeight: 260,
    borderRadius: radius.card,
    backgroundColor: color.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  video: { width: '100%', height: '100%' },
  title: { ...text.headline, color: color.text.primary },
  body: { ...text.body, fontSize: 16, lineHeight: 23, color: color.text.secondary },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space[8], paddingVertical: space[12] },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.line.hairline },
  dotActive: { width: 18, backgroundColor: color.accent.primary },
});
