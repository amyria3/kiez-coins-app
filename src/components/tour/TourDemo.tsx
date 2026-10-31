import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AudienceHint } from '../AudienceHint';
import { BeforeAfterPost } from '../BeforeAfterPost';
import { Button } from '../Button';
import { ChallengePost } from '../ChallengePost';
import { KaterCard } from '../Content';
import { Segments } from '../FeedHeader';
import { PhotoPicker, SwitchRow } from '../Form';
import { RunningBeforeAfter } from '../BeforeAfterTimer';
import { TagTextField } from '../compose/BeforeAfterForm';
import { Cat } from '../icons/Brand';
import { CameraButton } from '../TabBar';
import { RewardField, type RewardValue } from '../compose/RewardField';
import { Text } from '../T';
import { sampleChallenges, sampleUsers } from '../../data/sample';
import { t } from '../../data/texts';
import type { Challenge } from '../../data/types';
import { color, radius, space, text } from '../../theme/tokens';

/**
 * Beispiele der Tour zum Ausprobieren (Daria, 31.10.2026): Jede Seite zeigt echte Elemente der App mit Beispieldaten.
 * Man kann sie antippen, und ein lila Ring zeigt, was als Nächstes zu tun ist (`NextStep`). Nichts wird gespeichert.
 * Verlässt man die Seite, fängt das Beispiel wieder von vorn an (tour.tsx gibt dafür einen neuen `key`).
 *
 * Einheitlich auf allen Seiten (Daria, 31.10.2026): volle Breite ohne Verkleinern, oben ein Hinweis (`Demo`),
 * Beiträge wie im Feed, Formulare mit denselben Bausteinen wie beim Erstellen (PhotoPicker, TagTextField, Button)
 * und 16 Punkte Rand. Ist ein Beispiel höher als die Fläche, scrollt sie von selbst zum lila Ring (`DemoFocus`).
 */
export function TourDemo({ stepKey }: { stepKey: string }) {
  switch (stepKey) {
    case 'posten':
      return <PostDemo />;
    case 'me-challenge':
      return <MeDemo />;
    case 'we-challenge':
      return <AcceptDemo sampleId="igelnest" />;
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
// Lila Ring für den nächsten Schritt, automatisches Scrollen
// ---------------------------------------------------------------------------

/**
 * Verbindung zu tour.tsx: `focus` scrollt die Fläche so, dass das Element mittig steht. `cue` zeigt den Hinweis
 * fest über der Fläche, damit er beim Scrollen auf jeder Seite an derselben Stelle bleibt.
 */
export const DemoFocus = createContext<{
  focus: (view: View | null) => void;
  blur: (view: View | null) => void;
  cue: (text: string) => void;
} | null>(null);

/** Scrollt zum Element, solange `on` gilt (auch nach einem neuen Hinweis, der die Fläche nach oben setzt) */
function useDemoFocus(on: boolean) {
  const ref = useRef<View>(null);
  const frame = useContext(DemoFocus);
  useEffect(() => {
    if (!on || !frame) return;
    const view = ref.current;
    const timer = setTimeout(() => frame.focus(view), 120);
    return () => {
      clearTimeout(timer);
      frame.blur(view);
    };
  }, [on, frame]);
  return ref;
}

/**
 * Lila Ring um das Element, das als Nächstes dran ist. Pulsiert leise; mit „Bewegung reduzieren“ steht er still.
 * Erscheint der Ring, scrollt die Fläche zu ihm.
 */
function NextStep({ on, children, round = false, post = false }: { on: boolean; children: ReactNode; round?: boolean; post?: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const ref = useDemoFocus(on);
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
    <View ref={ref}>
      {children}
      {on ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            round && styles.ringRound,
            post && styles.ringPost,
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
// Bausteine
// ---------------------------------------------------------------------------

const sample = (id: string, patch: Partial<Challenge> = {}): Challenge | undefined => {
  const c = sampleChallenges.find((x) => x.id === id);
  // Immer als offene Challenge, damit Frist, Coins und Edensteine wie im Feed aussehen
  return c && { ...c, status: 'open', deadline: new Date(Date.now() + 3 * 86400000).toISOString(), ...patch };
};
const authorOf = (c: Challenge) => sampleUsers.find((u) => u.id === c.authorId);
const noop = () => undefined;

/** Rahmen jeder Seite: Hinweis oben (in der Tour fest über der Fläche), darunter der Inhalt in voller Breite */
function Demo({ cue, children }: { cue: string; children: ReactNode }) {
  const frame = useContext(DemoFocus);
  useEffect(() => {
    frame?.cue(cue);
  }, [frame, cue]);
  return (
    <View style={styles.demo}>
      {frame ? null : <DemoCue>{cue}</DemoCue>}
      {children}
    </View>
  );
}

/** Hinweis über dem Beispiel */
export function DemoCue({ children }: { children: string }) {
  return <Text style={styles.cue}>{children}</Text>;
}

/** 16 Punkte Rand links und rechts, wie Formulare in der App */
function Pad({ children }: { children: ReactNode }) {
  return <View style={styles.pad}>{children}</View>;
}

/** Beitrag wie im Feed (Beiträge bringen ihren Rand selbst mit) */
function Post({ challenge, onLike, wrapLike }: { challenge: Challenge; onLike?: () => void; wrapLike?: (heart: ReactNode) => ReactNode }) {
  const author = authorOf(challenge);
  if (!author) return null;
  if (challenge.type === 'before_after') {
    return <BeforeAfterPost challenge={challenge} author={author} distance="300 m" onPress={noop} onLike={onLike ?? noop} />;
  }
  return <ChallengePost challenge={challenge} author={author} distance={challenge.private ? undefined : '300 m'} onPress={noop} onLike={onLike ?? noop} wrapLike={wrapLike} />;
}

/**
 * Fotofeld wie beim Erstellen. Tippen öffnet hier keine Mediathek, sondern macht den nächsten Schritt
 * (`onTap`); ohne `onTap` bleibt es zum Ansehen.
 */
function DemoPhoto({ photo, title, hint, onTap }: { photo?: Challenge['image']; title: string; hint?: string; onTap?: () => void }) {
  return (
    <View>
      <PhotoPicker photo={photo} hint={hint ?? ''} onChange={noop} title={{ value: title, onChange: noop }} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onTap} accessibilityRole={onTap ? 'button' : undefined} accessibilityLabel={onTap ? hint ?? title : undefined} />
    </View>
  );
}

/** Geschafft: Kater und „Noch mal“ */
function Done({ children, onAgain, focus = true }: { children: string; onAgain: () => void; focus?: boolean }) {
  const body = (
    <Pad>
      <KaterCard mood="high">{children}</KaterCard>
      <Button label="Noch mal" variant="ghost" onPress={onAgain} />
    </Pad>
  );
  // Meist ist der Kater das Neue: Die Fläche scrollt zu ihm
  return focus ? <Focus>{body}</Focus> : body;
}

/** Die Fläche scrollt zu diesem Inhalt, ohne Ring */
function Focus({ children }: { children: ReactNode }) {
  const ref = useDemoFocus(true);
  return <View ref={ref}>{children}</View>;
}

// ---------------------------------------------------------------------------
// Beispiele
// ---------------------------------------------------------------------------

/** Posten (We-Challenge): Kamera, Fotofeld mit Titel und #vorher wie beim Erstellen, „Veröffentlichen“, Beitrag. */
function PostDemo() {
  const [step, setStep] = useState(0);
  const c = sample('igelnest');
  if (!c) return null;
  if (step === 0) {
    return (
      <Demo cue="Tippe auf die Kamera">
        <View style={styles.center}>
          <NextStep on round>
            <CameraButton onPress={() => setStep(1)} inline />
          </NextStep>
        </View>
      </Demo>
    );
  }
  if (step === 1) {
    return (
      <Demo cue="Foto und Titel sind schon da. Veröffentliche die We-Challenge">
        <Pad>
          <DemoPhoto photo={c.image} title={c.title} />
          <TagTextField label="Beschreibung" tag="#vorher" value={c.text} onChangeText={noop} maxLength={500} />
          <NextStep on>
            <Button label="Veröffentlichen" onPress={() => setStep(2)} />
          </NextStep>
        </Pad>
      </Demo>
    );
  }
  return (
    <Demo cue="So sieht Dein Kiez die We-Challenge">
      <Post challenge={c} />
      <Done onAgain={() => setStep(0)}>Gepostet! Jetzt sieht Dein Kiez, was zu tun ist.</Done>
    </Demo>
  );
}

/** Me-Challenge wie in der App: Vorher-Foto, „Vorher speichern“, „Timer starten“, „Nachher aufnehmen“, „Me-Challenge posten“. */
function MeDemo() {
  const [step, setStep] = useState(0);
  const c = sampleChallenges.find((x) => x.id === 'vorher-nachher-hof');
  if (!c) return null;
  if (step === 0) {
    return (
      <Demo cue="Zeige die Ausgangslage: Tippe auf das Fotofeld">
        <Pad>
          <NextStep on>
            <DemoPhoto title={c.title} hint="Vorher-Foto" onTap={() => setStep(1)} />
          </NextStep>
        </Pad>
      </Demo>
    );
  }
  if (step === 1) {
    return (
      <Demo cue="Das Vorher ist im Kasten">
        <Pad>
          <DemoPhoto photo={c.imageBefore} title={c.title} />
          <NextStep on>
            <Button label="Vorher speichern" onPress={() => setStep(2)} />
          </NextStep>
        </Pad>
      </Demo>
    );
  }
  if (step === 2 || step === 3) {
    const running = { ...c, status: 'draft' as const, timerStartedAt: new Date(Date.now() - 25 * 60_000).toISOString(), finishedAt: undefined };
    return (
      <Demo cue={step === 2 ? 'Starte den Timer, sobald Du loslegst' : 'Der Timer läuft, auch wenn Du die App schließt'}>
        {step === 3 ? (
          <Pad>
            <RunningBeforeAfter challenge={running} onPress={noop} />
          </Pad>
        ) : null}
        <Pad>
          <NextStep on>
            {step === 2 ? (
              <Button label="Timer starten" onPress={() => setStep(3)} />
            ) : (
              <Button icon="camera" label="Nachher aufnehmen" onPress={() => setStep(4)} />
            )}
          </NextStep>
        </Pad>
      </Demo>
    );
  }
  if (step === 4) {
    return (
      <Demo cue="Fertig? Dann das Nachher-Foto und posten">
        <Pad>
          <DemoPhoto photo={c.imageAfter} title={c.title} />
          <NextStep on>
            <Button label="Me-Challenge posten" onPress={() => setStep(5)} />
          </NextStep>
        </Pad>
      </Demo>
    );
  }
  return (
    <Demo cue="So sieht Dein Post aus">
      <Post challenge={c} />
      <Done onAgain={() => setStep(0)}>Geschafft! Dein Post zeigt Vorher und Nachher.</Done>
    </Demo>
  );
}

/** Annehmen (auch Gruppe): „Challenge annehmen“, dann „Erledigt melden“, dann Kater. */
function AcceptDemo({ sampleId, group = false }: { sampleId: string; group?: boolean }) {
  const [step, setStep] = useState(0);
  const c = sample(sampleId);
  if (!c) return null;
  const eden = c.edensteine ?? 0;
  const cue = step === 0 ? 'Nimm die We-Challenge an' : step === 1 ? 'Angenommen. Jetzt anpacken und ein Foto vom Ergebnis machen.' : 'Geschafft';
  return (
    <Demo cue={cue}>
      <Post challenge={c} />
      {step === 0 ? (
        <Pad>
          <NextStep on>
            <Button icon="wir-schaffen-das" label="Challenge annehmen" onPress={() => setStep(1)} />
          </NextStep>
        </Pad>
      ) : step === 1 ? (
        <Pad>
          <NextStep on>
            <Button icon="camera" label="Erledigt melden" onPress={() => setStep(2)} />
          </NextStep>
        </Pad>
      ) : (
        <Done onAgain={() => setStep(0)}>
          {group ? t('Geschafft! Wenn die Gruppe bestätigt, bekommst Du {eden} Edensteine.', { eden }) : 'Geschafft! Jetzt bestätigt die Person, dann ist die Challenge erledigt.'}
        </Done>
      )}
    </Demo>
  );
}

/**
 * Coins wie beim Erstellen (Daria, 31.10.2026): Fotofeld mit Titel, darunter die echte Belohnung (RewardField).
 * „Mit Belohnung“, dann „Das ist mir bares Geld wert“, dann Betrag und „Veröffentlichen“. Danach der Beitrag mit Coins.
 */
function CoinsDemo() {
  const [value, setValue] = useState<RewardValue>({ reward: 'none' });
  const [posted, setPosted] = useState(false);
  const base = sample('sommerfest', { bountyAmount: undefined });
  if (!base) return null;
  if (posted) {
    return (
      <Demo cue="So sieht der Kiez die Coins">
        {/* Hier sind die Coins am Beitrag das Neue */}
        <Focus>
          <Post challenge={{ ...base, bountyAmount: value.bountyAmount }} />
        </Focus>
        <Done
          focus={false}
          onAgain={() => {
            setValue({ reward: 'none' });
            setPosted(false);
          }}
        >
          Die Coins stehen jetzt am Beitrag. Das Geld fließt direkt zwischen Euch.
        </Done>
      </Demo>
    );
  }
  const cue =
    value.reward === 'none'
      ? 'Tippe auf „Mit Belohnung“'
      : value.reward === 'eden'
        ? 'Lege den Schalter um: Aus Edensteinen werden Coins'
        : 'Wähle einen Betrag und veröffentliche';
  return (
    <Demo cue={cue}>
      <Pad>
        <DemoPhoto photo={base.image} title={base.title} />
        <NextStep on={value.reward !== 'euro'}>
          <View style={styles.reward}>
            <RewardField value={value} onChange={setValue} places={1} seed="tour-coins" />
          </View>
        </NextStep>
        {value.reward === 'euro' ? (
          <NextStep on>
            <Button label="Veröffentlichen" onPress={() => setPosted(true)} disabled={!value.bountyAmount} />
          </NextStep>
        ) : null}
      </Pad>
    </Demo>
  );
}

/** Bild: Herz antippen, die Zahl zählt hoch. Der Ring liegt nur um das Herz. */
function LikeDemo() {
  const [liked, setLiked] = useState(false);
  const base = sample('privat-garten', { private: undefined, text: '' });
  if (!base) return null;
  const count = (base.likeCount ?? 0) + (liked ? 1 : 0);
  return (
    <Demo cue={liked ? 'Gefällt Dir!' : 'Tippe auf das Herz unter dem Bild'}>
      <Post
        challenge={{ ...base, likedByMe: liked, likeCount: count }}
        onLike={() => setLiked((v) => !v)}
        wrapLike={(heart) => (
          <NextStep on={!liked} round>
            {heart}
          </NextStep>
        )}
      />
    </Demo>
  );
}

/** Sichtbarkeit: Schalter „5 km“ wie beim Erstellen umlegen, der Hinweis sagt, wer den Beitrag sieht. */
function RadiusDemo() {
  const [on, setOn] = useState(false);
  const c = sample('igelnest', { localOnly: on });
  return (
    <Demo cue={on ? 'Nur Menschen in Deinem Kiez sehen den Beitrag. In „Überall“ erscheint er nicht.' : 'Alle sehen den Beitrag, auch in „Überall“.'}>
      <Pad>
        <NextStep on={!on}>
          <SwitchRow label="Auf einen Umkreis von 5 km begrenzen" value={on} onValueChange={setOn} />
        </NextStep>
      </Pad>
      {c ? <Post challenge={c} /> : null}
    </Demo>
  );
}

const MODE_TABS = [
  { key: 'private', label: 'Privat' },
  { key: 'kiez', label: 'Kiez' },
  { key: 'everywhere', label: 'Überall' },
] as const;
type Mode = (typeof MODE_TABS)[number]['key'];

/** Privat: Umschalter wie im Feed, der Hinweis darunter wechselt mit. Der Ring zeigt auf den Umschalter, bis „Privat“ gewählt ist. */
function PrivateDemo() {
  const [mode, setMode] = useState<Mode>('kiez');
  const [seen, setSeen] = useState(false);
  const c = sample('privat-garten', mode === 'private' ? {} : { private: undefined, text: '' });
  return (
    <Demo cue={seen ? 'Diesen Beitrag siehst nur Du' : 'Tippe auf „Privat“'}>
      <Pad>
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
      </Pad>
      <AudienceHint audience={mode} onClose={noop} />
      {c && mode === 'private' ? <Post challenge={c} /> : null}
    </Demo>
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
  // Beiträge haben 16 Punkte eigenen Rand; der Ring liegt darin, sonst schneidet die Fläche ihn ab
  ringPost: { left: space[16] - 5, right: space[16] - 5 },
  demo: { gap: space[16], width: '100%' },
  center: { alignItems: 'center', paddingVertical: space[24] },
  pad: { paddingHorizontal: space[16], gap: space[12] },
  cue: { ...text.body, color: color.text.secondary, textAlign: 'center', paddingHorizontal: space[16] },
  reward: { gap: space[12] },
});
