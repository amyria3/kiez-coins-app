import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { AudienceHint } from '../AudienceHint';
import { Button } from '../Button';
import { ChallengePost } from '../ChallengePost';
import { KaterCard } from '../Content';
import { Segments } from '../FeedHeader';
import { SwitchRow } from '../Form';
import { Cat } from '../icons/Brand';
import { CameraButton } from '../TabBar';
import { Text } from '../T';
import { sampleChallenges, sampleUsers } from '../../data/sample';
import { t } from '../../data/texts';
import type { Challenge } from '../../data/types';
import { color, radius, space, text } from '../../theme/tokens';

/**
 * Beispiele der Tour zum Ausprobieren (Daria, 31.10.2026): Jede Seite zeigt echte Elemente der App mit Beispieldaten.
 * Man kann sie antippen, und ein lila Ring zeigt, was als Nächstes zu tun ist (`NextStep`). Nichts wird gespeichert.
 * Verlässt man die Seite, fängt das Beispiel wieder von vorn an (tour.tsx gibt dafür einen neuen `key`).
 */
export function TourDemo({ stepKey }: { stepKey: string }) {
  switch (stepKey) {
    case 'posten':
      return <PostDemo />;
    case 'annehmen':
      return <AcceptDemo sampleId="gruenstreifen-malibu" />;
    case 'coins':
      return <CoinsDemo />;
    case 'gruppen':
      return <AcceptDemo sampleId="gruppe-muell" group />;
    case 'bild':
      return <LikeDemo />;
    case 'sichtbarkeit':
      return <RadiusDemo />;
    case 'privat':
      return <PrivateDemo />;
    default:
      return <Cat mood="high" height={120} />;
  }
}

// ---------------------------------------------------------------------------
// Lila Ring für den nächsten Schritt
// ---------------------------------------------------------------------------

/** Lila Ring um das Element, das als Nächstes dran ist. Pulsiert leise; mit „Bewegung reduzieren“ steht er still. */
function NextStep({ on, children, round = false }: { on: boolean; children: ReactNode; round?: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return;
    let loop: Animated.CompositeAnimation | undefined;
    let stopped = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (stopped || reduce) return;
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
          ]),
        );
        loop.start();
      });
    return () => {
      stopped = true;
      loop?.stop();
      pulse.setValue(0);
    };
  }, [on, pulse]);
  return (
    <View>
      {children}
      {on ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            round && styles.ringRound,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Beispiele
// ---------------------------------------------------------------------------

const sample = (id: string, patch: Partial<Challenge> = {}): Challenge | undefined => {
  const c = sampleChallenges.find((x) => x.id === id);
  // Immer als offene Challenge, damit Frist, Coins und Edensteine wie im Feed aussehen
  return c && { ...c, status: 'open', deadline: new Date(Date.now() + 3 * 86400000).toISOString(), ...patch };
};
const authorOf = (c: Challenge) => sampleUsers.find((u) => u.id === c.authorId);
const noop = () => undefined;

function Post({ challenge, onLike }: { challenge: Challenge; onLike?: () => void }) {
  const author = authorOf(challenge);
  if (!author) return null;
  return <ChallengePost challenge={challenge} author={author} distance={challenge.private ? undefined : '300 m'} onPress={noop} onLike={onLike ?? noop} />;
}

/** Geschafft-Zeile mit Kater und „Noch mal“ */
function Done({ children, onAgain }: { children: string; onAgain: () => void }) {
  return (
    <View style={styles.done}>
      <KaterCard mood="high">{children}</KaterCard>
      <Button label="Noch mal" variant="ghost" onPress={onAgain} />
    </View>
  );
}

/** Posten: Kamera antippen, Titel steht schon da, „Posten“ antippen, Beitrag erscheint. */
function PostDemo() {
  const [step, setStep] = useState(0);
  const c = sample('igelnest');
  if (!c) return null;
  if (step === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.cue}>Tippe auf die Kamera</Text>
        <NextStep on round>
          <CameraButton onPress={() => setStep(1)} inline />
        </NextStep>
      </View>
    );
  }
  if (step === 1) {
    return (
      <View style={styles.pad}>
        <View style={styles.sheet}>
          {c.image ? <Image source={c.image} style={styles.sheetPhoto} contentFit="cover" /> : null}
          <Text style={styles.sheetTitle}>{c.title}</Text>
          <Text style={styles.sheetText} numberOfLines={2}>
            {c.text}
          </Text>
        </View>
        <NextStep on>
          <Button label="Posten" onPress={() => setStep(2)} />
        </NextStep>
      </View>
    );
  }
  return (
    <View style={styles.stack}>
      <Post challenge={c} />
      <Done onAgain={() => setStep(0)}>Gepostet! Jetzt sieht Dein Kiez, was zu tun ist.</Done>
    </View>
  );
}

/** Annehmen (auch Gruppe): „Annehmen“, dann „Erledigt melden“, dann Kater. */
function AcceptDemo({ sampleId, group = false }: { sampleId: string; group?: boolean }) {
  const [step, setStep] = useState(0);
  const c = sample(sampleId);
  if (!c) return null;
  const eden = c.edensteine ?? 0;
  return (
    <View style={styles.stack}>
      <Post challenge={c} />
      <View style={styles.pad}>
        {step === 0 ? (
          <NextStep on>
            <Button icon="wir-schaffen-das" label="Challenge annehmen" onPress={() => setStep(1)} />
          </NextStep>
        ) : step === 1 ? (
          <>
            <Text style={styles.cue}>Angenommen. Jetzt anpacken und ein Foto vom Ergebnis machen.</Text>
            <NextStep on>
              <Button label="Erledigt melden" onPress={() => setStep(2)} />
            </NextStep>
          </>
        ) : (
          <Done onAgain={() => setStep(0)}>
            {group ? t('Geschafft! Wenn die Gruppe bestätigt, bekommst Du {eden} Edensteine.', { eden }) : 'Geschafft! Jetzt bestätigt die Person, dann ist die Challenge erledigt.'}
          </Done>
        )}
      </View>
    </View>
  );
}

/** Coins: Schalter „Das ist mir bares Geld wert“, dann erscheinen die Coins am Beitrag. */
function CoinsDemo() {
  const [on, setOn] = useState(false);
  const base = sample('sommerfest');
  if (!base) return null;
  const c = { ...base, bountyAmount: on ? (base.bountyAmount ?? 15) : undefined };
  return (
    <View style={styles.stack}>
      <View style={styles.pad}>
        <NextStep on={!on}>
          <SwitchRow label="Das ist mir bares Geld wert" description="Du versprichst Coins. Das Geld fließt direkt zwischen Euch." value={on} onValueChange={setOn} />
        </NextStep>
      </View>
      <Post challenge={c} />
    </View>
  );
}

/** Bild: Herz antippen, die Zahl zählt hoch. */
function LikeDemo() {
  const [liked, setLiked] = useState(false);
  const base = sample('privat-garten', { private: undefined, text: '' });
  if (!base) return null;
  const count = (base.likeCount ?? 0) + (liked ? 1 : 0);
  return (
    <View style={styles.stack}>
      <Text style={[styles.cue, styles.pad]}>{liked ? 'Gefällt Dir!' : 'Tippe auf das Herz unter dem Bild'}</Text>
      <NextStep on={!liked}>
        <Post challenge={{ ...base, likedByMe: liked, likeCount: count }} onLike={() => setLiked((v) => !v)} />
      </NextStep>
    </View>
  );
}

/** Sichtbarkeit: Schalter „5 km“ umlegen, darunter steht, wer den Beitrag sieht. */
function RadiusDemo() {
  const [on, setOn] = useState(false);
  const c = sample('igelnest', { localOnly: on });
  return (
    <View style={styles.stack}>
      <View style={styles.pad}>
        <NextStep on={!on}>
          <SwitchRow label="Auf einen Umkreis von 5 km begrenzen" value={on} onValueChange={setOn} />
        </NextStep>
        <Text style={styles.cue}>{on ? 'Nur Menschen in Deinem Kiez sehen den Beitrag. In „Überall“ erscheint er nicht.' : 'Alle sehen den Beitrag, auch in „Überall“.'}</Text>
      </View>
      {c ? <Post challenge={c} /> : null}
    </View>
  );
}

const MODE_TABS = [
  { key: 'private', label: 'Privat' },
  { key: 'kiez', label: 'Kiez' },
  { key: 'everywhere', label: 'Überall' },
] as const;
type Mode = (typeof MODE_TABS)[number]['key'];

/** Privat: Umschalter antippen, der Hinweis darunter wechselt mit. Der Ring zeigt auf „Privat“, bis es gewählt ist. */
function PrivateDemo() {
  const [mode, setMode] = useState<Mode>('kiez');
  const [seen, setSeen] = useState(false);
  const c = sample('privat-garten', mode === 'private' ? {} : { private: undefined, text: '' });
  return (
    <View style={styles.stack}>
      <View style={styles.pad}>
        <NextStep on={!seen}>
          <Segments
            tabs={[...MODE_TABS]}
            selectedKey={mode}
            onChange={(k) => {
              setMode(k as Mode);
              if (k === 'private') setSeen(true);
            }}
          />
        </NextStep>
      </View>
      <AudienceHint audience={mode} onClose={noop} />
      {c && mode === 'private' ? <Post challenge={c} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderWidth: 2,
    borderColor: color.accent.primary,
    borderRadius: radius.lg,
  },
  ringRound: { borderRadius: radius.full },
  center: { alignItems: 'center', justifyContent: 'center', gap: space[16], paddingVertical: space[32] },
  pad: { paddingHorizontal: space[16], gap: space[12] },
  stack: { gap: space[12] },
  cue: { ...text.body, color: color.text.secondary, textAlign: 'center' },
  done: { gap: space[8] },
  sheet: { gap: space[8], padding: space[12], borderRadius: radius.card, backgroundColor: color.bg.screen },
  sheetPhoto: { width: '100%', height: 140, borderRadius: radius.lg },
  sheetTitle: { ...text.cardTitle, color: color.text.primary },
  sheetText: { ...text.body, color: color.text.secondary },
});
