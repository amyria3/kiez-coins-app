import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { elapsedMs, TimerRing, useNow } from '../../components/BeforeAfterTimer';
import { Button } from '../../components/Button';
import { BeforeAfterSteps, TagTextField } from '../../components/compose/BeforeAfterForm';
import { KaterBubble } from '../../components/Content';
import { PhotoPicker, TextField } from '../../components/Form';
import { Icon } from '../../components/icons/Icon';
import { SubScreen } from '../../components/Screen';
import { Text } from '../../components/T';
import { WithMentions } from '../../components/WithMentions';
import { formatClock, formatHoursMinutes, meInProgress } from '../../data/format';
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
 * Route `before-after/[id]`: Schritt 2 (Timer) und 3 (Nachher) eines Vorher-Nachher-Entwurfs (Daria, 23.10.2026).
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
  const [busy, setBusy] = useState<'start' | 'stop' | 'post' | 'save' | null>(null);
  // „Timer starten“ liegt an der Stelle von „Vorher speichern“. Ein zweiter Tipp darauf startete den Timer
  // aus Versehen (Daria, 26.10.2026). Daher nimmt der Knopf erst nach einer Sekunde Tipps an.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setArmed(true), 1000);
    return () => clearTimeout(timer);
  }, []);
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

  // Inzwischen abgeschlossen (Knopf oder Server): zum Beitrag. Offen ohne Nachher läuft sie noch (Daria, 2026-11-09).
  const posted = !!challenge && !meInProgress(challenge);
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

  // Schließen blockiert nichts: Der Entwurf bleibt, ein laufender Timer steht oben im Feed (Daria, 26.10.2026).
  const close = () => router.dismissTo('/feed');

  const start = async () => {
    if (!armed) return;
    setBusy('start');
    await beforeAfter.startTimer(challenge.id).catch(fail('Timer nicht gestartet'));
    setBusy(null);
  };

  // Auch mit laufendem Timer ohne Timer weiter: Der Timer stoppt, danach geht es zum Nachher und zum Posten (Daria, 2026-11-09)
  const withoutTimer = () =>
    Alert.alert('Timer stoppen?', 'Die gemessene Zeit verfällt. Dein Beitrag zeigt dann keine Dauer.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Stoppen',
        onPress: async () => {
          setBusy('stop');
          try {
            await beforeAfter.stopTimer(challenge.id);
            setStage('after');
          } catch (error) {
            fail('Timer nicht gestoppt')(error);
          }
          setBusy(null);
        },
      },
    ]);

  // Offen: wie jeder Beitrag löschen (wiederherstellbar), ein alter Entwurf endgültig
  const isOpen = challenge.status === 'open';
  const remove = () =>
    Alert.alert(
      isOpen ? 'Me-Challenge löschen?' : 'Entwurf löschen?',
      isOpen ? 'Sie verschwindet aus dem Feed.' : 'Vorher-Foto, Texte und Timer sind dann weg.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            dispatch(isOpen ? { type: 'delete', id: challenge.id } : { type: 'deleteDraft', id: challenge.id });
            router.dismissTo('/feed');
          },
        },
      ],
    );

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

  // Nachher auch ohne laufenden Timer (Timer optional, Daria, 2026-10-31)
  if (stage === 'after') {
    const preview = beforeAfterBody({ beforeText: challenge.beforeText, afterText: afterText.trim() || undefined, imageAfter: after });
    return (
      <SubScreen
        title="Me-Challenge"
        subtitle="Schritt 3 von 3 · Nachher"
        navigation="back"
        onLeadingPress={() => setStage('timer')}
        actions={
          <>
            {/* Klar benannt: Posten schließt die Me-Challenge ab, Speichern geht jederzeit vorher (Daria, 2026-11-09) */}
            <Button busy={busy === 'post'} label={busy === 'post' ? 'Wird gepostet …' : 'Abschließen und posten'} onPress={post} disabled={!!busy} />
            <Button
              busy={busy === 'save'}
              label={busy === 'save' ? 'Wird gespeichert …' : isOpen ? 'Speichern' : 'Als Entwurf speichern'}
              variant="ghost"
              onPress={later}
              disabled={!!busy}
            />
          </>
        }
      >
        <BeforeAfterSteps at={2} />
        {/* Dauer nur mit laufendem Timer; ohne Timer zeigt der Beitrag keine Dauer (Daria, 2026-11-02) */}
        {running ? (
          <View style={styles.durationRow} accessible>
            <Icon name="clock-filled" size={15} color={color.text.secondary} />
            <Text style={styles.durationText}>
              {t('Dauer {duration}, stoppt beim Posten', { duration: formatHoursMinutes(elapsed) })}
            </Text>
          </View>
        ) : null}
        {/* Die Überschrift aus dem Vorher steht oben und bleibt änderbar (Daria, 2026-11-02) */}
        <TextField
          label="Überschrift"
          value={title}
          onChangeText={setTitle}
          maxLength={60}
          error={showErrors && !title.trim() ? 'Bitte gib eine Überschrift ein.' : undefined}
        />
        <PhotoPicker
          photo={after}
          error={showErrors && !after}
          hint={showErrors && !after ? 'Bitte ein Nachher-Foto hinzufügen.' : 'So sieht es jetzt aus.'}
          onChange={setAfterPhoto}
        />
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
      subtitle="Schritt 2 von 3 · Einstellungen"
      navigation="close"
      onLeadingPress={close}
      actions={
        running ? (
          <>
            <Button icon="camera" label="Nachher aufnehmen" onPress={() => setStage('after')} disabled={!!busy} />
            <Button
              busy={busy === 'stop'}
              label={busy === 'stop' ? 'Wird gestoppt …' : 'Ohne Timer weiter'}
              variant="ghost"
              onPress={withoutTimer}
              disabled={!!busy}
            />
            <Button label={isOpen ? 'Me-Challenge löschen' : 'Entwurf löschen'} variant="ghost" onPress={remove} disabled={!!busy} />
          </>
        ) : (
          <>
            <Button busy={busy === 'start'} label={busy === 'start' ? 'Wird gestartet …' : 'Timer starten'} onPress={start} disabled={!!busy} />
            {/* Timer optional (Daria, 2026-10-31): direkt zum Nachher, der Beitrag zeigt dann keine Dauer. Layout folgt. */}
            <Button icon="camera" label="Ohne Timer weiter" variant="secondary" onPress={() => setStage('after')} disabled={!!busy} />
            <Button label="Später starten" variant="ghost" onPress={close} />
          </>
        )
      }
    >
      <BeforeAfterSteps at={1} />
      {/* Vorher-Foto gleich unter dem Fortschritt (Daria, 2026-11-02) */}
      <View style={styles.mini}>
        {before ? <Image source={before} style={styles.miniPhoto} contentFit="cover" /> : null}
        <View style={styles.miniTexts}>
          <Text style={styles.miniTitle} numberOfLines={2}>
            {challenge.title}
          </Text>
          <Text style={styles.small}>{isOpen ? t('Vorher gepostet um {time} Uhr', { time: clock(challenge.createdAt) }) : t('Vorher gespeichert um {time} Uhr', { time: clock(challenge.createdAt) })}</Text>
        </View>
      </View>
      {/* Vor dem Start fragt der Kater, ob die Person ihre Zeit nehmen will; der Timer ist freiwillig (Daria, 2026-11-02) */}
      <KaterBubble>
        {running ? 'Ich halte die Zeit fest, auch wenn Du die App schließt. Viel Erfolg!' : 'Willst Du Deine eigene Zeit nehmen?'}
      </KaterBubble>
      <View style={styles.ringWrap}>
        <TimerRing diameter={236} width={10} progress={elapsed / BEFORE_AFTER_MAX_MS}>
          <Text style={styles.big}>{formatClock(elapsed)}</Text>
          <Text style={styles.of}>{t('von {h} h', { h: 48 })}</Text>
        </TimerRing>
      </View>
      {/* Vor dem Start folgen auf den Timer gleich die Knöpfe (Daria, 2026-11-02) */}
      {over || running ? (
        <Text style={styles.note}>
          {over
            ? 'Die 48 Stunden sind um. Gleich postet die App den Beitrag, auch ohne Nachher-Foto.'
            : (isOpen
                ? t('Spätestens {when} Uhr schließt die App die Me-Challenge ab, auch ohne Nachher-Foto.', { when: dayClock(end) })
                : t('Spätestens {when} Uhr postet die App den Beitrag, auch ohne Nachher-Foto.', { when: dayClock(end) })) +
              ' ' +
              t('Mit dem X oben nutzt Du die App normal weiter. Zurück zum Timer kommst Du oben im Feed.')}
        </Text>
      ) : isOpen && challenge.deadline ? (
        // Ohne Timer: Frist von 7 Tagen (Daria, 2026-11-09)
        <Text style={styles.note}>
          {t('Ohne Nachher schließt die App die Me-Challenge {when} Uhr ab.', { when: dayClock(Date.parse(challenge.deadline)) })}
        </Text>
      ) : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  ringWrap: { alignItems: 'center', paddingVertical: space[8] },
  big: { fontFamily: font.display, fontSize: 44, lineHeight: 48, letterSpacing: -1, color: color.text.primary, fontVariant: ['tabular-nums'] },
  of: { ...text.small, color: color.text.secondary },
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
  small: { ...text.small, color: color.text.secondary },
  note: { ...text.hint, color: color.text.secondary },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  durationText: { ...text.body, fontSize: 13, color: color.text.secondary },
  previewWrap: { gap: space[6] },
  preview: { borderLeftWidth: 2, borderLeftColor: color.line.hairline, paddingLeft: space[12], paddingVertical: space[2] },
  previewText: { ...text.body, color: color.text.primary },
});
