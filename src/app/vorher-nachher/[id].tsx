import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { elapsedMs, TimerRing, useNow } from '../../components/BeforeAfterTimer';
import { Button } from '../../components/Button';
import { BeforeAfterSteps, TagTextField } from '../../components/compose/BeforeAfterForm';
import { KaterBubble } from '../../components/Content';
import { PhotoPicker } from '../../components/Form';
import { Icon } from '../../components/icons/Icon';
import { SubScreen } from '../../components/Screen';
import { Text } from '../../components/T';
import { WithMentions } from '../../components/WithMentions';
import { formatClock, formatHoursMinutes } from '../../data/format';
import { BEFORE_AFTER_MAX_MS } from '../../data/remote';
import { beforeAfterBody, useChallenge, useStore } from '../../data/store';
import { localeTag, t } from '../../data/texts';
import type { ImageSource } from '../../data/types';
import { useGoBack } from '../../lib/goBack';
import { color, font, isFashionable, radius, space, stroke, text } from '../../theme/tokens';
import { celebratePost } from '../../components/HeartBurst';

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit' });
const dayClock = (ms: number) =>
  `${new Date(ms).toLocaleDateString(localeTag(), { weekday: 'long' })}, ${clock(new Date(ms).toISOString())}`;

/**
 * Route `vorher-nachher/[id]`: Schritt 2 (Timer) und 3 (Nachher) eines Vorher-Nachher-Entwurfs (Daria, 23.10.2026).
 * Der Timer läuft auf dem Server. Spätestens 48 h nach dem Start postet der Server den Beitrag, auch ohne Nachher-Foto.
 */
export default function BeforeAfterScreen() {
  const { id, schritt } = useLocalSearchParams<{ id: string; schritt?: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { challenge } = useChallenge(id);
  const { beforeAfter, dispatch } = useStore();
  const running = !!challenge?.timerStartedAt;
  const [stage, setStage] = useState<'timer' | 'after'>(schritt === 'nachher' ? 'after' : 'timer');
  const [busy, setBusy] = useState<'start' | 'post' | 'save' | null>(null);
  const now = useNow(1000, stage === 'timer' || running);

  // Nachher: Foto, Überschrift und Text. Startwerte aus dem Entwurf.
  const [afterPhoto, setAfterPhoto] = useState<ImageSource>();
  const [title, setTitle] = useState(challenge?.title ?? '');
  const [afterText, setAfterText] = useState(challenge?.afterText ?? '');
  const [showErrors, setShowErrors] = useState(false);
  // Direkt geöffnet, bevor der Entwurf geladen war: Überschrift nachtragen
  const loadedTitle = challenge?.title;
  useEffect(() => {
    if (loadedTitle) setTitle((v) => v || loadedTitle);
  }, [loadedTitle]);

  // Inzwischen gepostet (Knopf oder Server nach 48 h): zum Beitrag
  const posted = !!challenge && challenge.status !== 'draft';
  useEffect(() => {
    if (posted && !busy) router.replace(`/challenge/${challenge.id}`);
  }, [posted, busy, challenge?.id, router]);

  if (!challenge || challenge.type !== 'before_after' || posted) {
    return (
      <SubScreen title="Me-Challenge" navigation="close" onLeadingPress={goBack}>
        <Text style={styles.note}>{posted ? 'Der Beitrag ist schon gepostet.' : 'Diesen Entwurf gibt es nicht mehr.'}</Text>
      </SubScreen>
    );
  }

  const elapsed = elapsedMs(challenge, now);
  const end = challenge.timerStartedAt ? Date.parse(challenge.timerStartedAt) + BEFORE_AFTER_MAX_MS : 0;
  const over = running && elapsed >= BEFORE_AFTER_MAX_MS;
  const before = challenge.imageBefore ?? challenge.image;
  const after = afterPhoto ?? challenge.imageAfter;

  const fail = (title: string) => (error: unknown) => Alert.alert(title, (error as Error).message);

  const start = async () => {
    setBusy('start');
    await beforeAfter.startTimer(challenge.id).catch(fail('Timer nicht gestartet'));
    setBusy(null);
  };

  const remove = () =>
    Alert.alert('Entwurf löschen?', 'Vorher-Foto, Texte und Timer sind dann weg.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'deleteDraft', id: challenge.id });
          router.dismissTo('/feed');
        },
      },
    ]);

  const edit = () => ({
    ...(afterPhoto ? { afterPhoto } : null),
    ...(title.trim() && title.trim() !== challenge.title ? { title } : null),
    ...(afterText.trim() !== (challenge.afterText ?? '') ? { afterText } : null),
  });

  const post = async () => {
    if (!after || !title.trim()) {
      setShowErrors(true);
      return;
    }
    setBusy('post');
    try {
      await beforeAfter.finish(challenge.id, edit());
      celebratePost();
      router.replace(`/challenge/${challenge.id}`);
    } catch (error) {
      fail('Nicht gepostet')(error);
      setBusy(null);
    }
  };

  const later = async () => {
    const changes = edit();
    if (Object.keys(changes).length) {
      setBusy('save');
      try {
        await beforeAfter.update(challenge.id, changes);
      } catch (error) {
        fail('Nicht gespeichert')(error);
        setBusy(null);
        return;
      }
      setBusy(null);
    }
    router.dismissTo('/feed');
  };

  if (stage === 'after' && running) {
    const preview = beforeAfterBody({ beforeText: challenge.beforeText, afterText: afterText.trim() || undefined, imageAfter: after });
    return (
      <SubScreen
        title="Me-Challenge"
        subtitle="Schritt 3 von 3 · Nachher"
        navigation="back"
        onLeadingPress={() => setStage('timer')}
        actions={
          <>
            <Button busy={busy === 'post'} label={busy === 'post' ? 'Wird gepostet …' : 'Me-Challenge posten'} onPress={post} disabled={!!busy} />
            <Button
              busy={busy === 'save'}
              label={busy === 'save' ? 'Wird gespeichert …' : 'Später weitermachen'}
              variant="ghost"
              onPress={later}
              disabled={!!busy}
            />
          </>
        }
      >
        <BeforeAfterSteps at={2} />
        <View style={styles.durationRow} accessible>
          <Icon name="clock" size={15} color={color.text.secondary} />
          <Text style={styles.durationText}>
            {t('Dauer {duration}, stoppt beim Posten', { duration: formatHoursMinutes(elapsed) })}
          </Text>
        </View>
        <PhotoPicker
          photo={after}
          error={showErrors && !after}
          hint={showErrors && !after ? 'Bitte ein Nachher-Foto hinzufügen.' : 'So sieht es jetzt aus.'}
          onChange={setAfterPhoto}
          title={{
            value: title,
            onChange: setTitle,
            error: showErrors && !title.trim() ? 'Bitte gib eine Überschrift ein.' : undefined,
          }}
        />
        <Text style={styles.small}>Die Überschrift gilt für Vorher und Nachher.</Text>
        <TagTextField
          label="Erklärung zum Nachher"
          tag="#nachher"
          value={afterText}
          onChangeText={setAfterText}
          placeholder="Was hast Du gemacht?"
        />
        <View style={styles.previewWrap}>
          <Text style={styles.small}>So steht der Text im Beitrag</Text>
          <View style={styles.preview}>
            <Text style={styles.previewText}>
              <WithMentions value={preview} />
            </Text>
          </View>
        </View>
      </SubScreen>
    );
  }

  return (
    <SubScreen
      title="Me-Challenge"
      subtitle="Schritt 2 von 3 · Timer"
      navigation="close"
      onLeadingPress={() => router.dismissTo('/feed')}
      actions={
        running ? (
          <>
            <Button icon="camera" label="Nachher aufnehmen" onPress={() => setStage('after')} />
            <Button label="Entwurf löschen" variant="ghost" onPress={remove} />
          </>
        ) : (
          <>
            <Button busy={busy === 'start'} label={busy === 'start' ? 'Wird gestartet …' : 'Timer starten'} onPress={start} disabled={!!busy} />
            <Button label="Später starten" variant="ghost" onPress={() => router.dismissTo('/feed')} />
          </>
        )
      }
    >
      <BeforeAfterSteps at={1} />
      <KaterBubble>
        {running
          ? 'Ich halte die Zeit fest, auch wenn Du die App schließt. Viel Erfolg!'
          : 'Bereit? Starte den Timer, sobald Du loslegst.'}
      </KaterBubble>
      <View style={styles.ringWrap}>
        <TimerRing diameter={236} width={10} progress={elapsed / BEFORE_AFTER_MAX_MS}>
          <Text style={styles.big}>{formatClock(elapsed)}</Text>
          <Text style={styles.of}>{t('von {h} h', { h: 48 })}</Text>
        </TimerRing>
      </View>
      <View style={styles.mini}>
        {before ? <Image source={before} style={styles.miniPhoto} contentFit="cover" /> : null}
        <View style={styles.miniTexts}>
          <Text style={styles.miniTitle} numberOfLines={2}>
            {challenge.title}
          </Text>
          <Text style={styles.small}>{t('Vorher gespeichert um {time} Uhr', { time: clock(challenge.createdAt) })}</Text>
        </View>
      </View>
      <Text style={styles.note}>
        {over
          ? 'Die 48 Stunden sind um. Gleich postet die App den Beitrag, auch ohne Nachher-Foto.'
          : running
            ? t('Spätestens {when} Uhr postet die App den Beitrag, auch ohne Nachher-Foto.', { when: dayClock(end) })
            : 'Der Timer läuft auch im Hintergrund. Nach 48 h postet die App den Beitrag, auch ohne Nachher-Foto.'}
      </Text>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  ringWrap: { alignItems: 'center', paddingVertical: space[8] },
  big: { fontFamily: font.display, fontSize: 44, lineHeight: 48, letterSpacing: -1, color: color.text.primary, fontVariant: ['tabular-nums'] },
  of: { ...text.caption, fontSize: 12, color: color.text.secondary },
  mini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    padding: space[8],
    borderRadius: radius.lg,
    ...(isFashionable
      ? { borderWidth: stroke.thin, borderColor: color.line.hairline }
      : { backgroundColor: color.bg.surface }),
  },
  miniPhoto: { width: 56, height: 56, borderRadius: radius.md },
  miniTexts: { flex: 1, gap: space[2] },
  miniTitle: { fontFamily: font.medium, fontSize: 15, lineHeight: 19, color: color.text.primary },
  small: { ...text.caption, fontSize: 12, color: color.text.secondary },
  note: { ...text.body, fontSize: 13, color: color.text.secondary },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  durationText: { ...text.body, fontSize: 13, color: color.text.secondary },
  previewWrap: { gap: space[6] },
  preview: { borderLeftWidth: 2, borderLeftColor: color.line.hairline, paddingLeft: space[12], paddingVertical: space[2] },
  previewText: { ...text.body, color: color.text.primary },
});
