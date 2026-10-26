import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../data/auth';
import { errorText, loadMySurveyAnswer, saveSurveyAnswer } from '../data/remote';
import { useStore } from '../data/store';
import {
  countUsageDay,
  isSurveySnoozed,
  SURVEY_AFTER_DAYS,
  snoozeSurvey,
  SURVEY_COMMENT_MAX,
  surveyQuestions,
  type SurveyAnswer,
  type SurveyQuestion,
  type SurveySnooze,
} from '../data/survey';
import { t } from '../data/texts';
import { color, radius, space, stroke, text, scheme } from '../theme/tokens';
import { Button } from './Button';
import { CheckOption, RadioOption, TextField } from './Form';
import { Text } from './T';

type Draft = Partial<Record<SurveyQuestion['key'], string[]>>;

const snoozeOptions: { key: SurveySnooze; label: string }[] = [
  { key: 'tomorrow', label: 'Morgen wieder fragen' },
  { key: 'week', label: 'In einer Woche wieder fragen' },
  { key: 'never', label: 'Nicht wieder fragen' },
];

/**
 * UX/UI-Umfrage als Overlay über dem Feed (Vorgabe Daria, 21.10.2026): Hintergrund geblurrt,
 * eine Frage pro Schritt („Frage 1 von 6“), wegklicken mit „Morgen“, „In einer Woche“ oder „Nicht wieder fragen“.
 * Zum Schluss ein freiwilliges Kommentarfeld (Wunsch Daria, 26.10.2026).
 * Antworten landen in `survey_answers` (Migrationen 20261021001500, 20261026000100), eine pro Person.
 */
export function SurveyOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { mode, currentUserId } = useStore();
  const { session } = useAuth();
  const live = mode === 'live' && !!session;
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({});
  const [comment, setComment] = useState('');
  // Eigene Antwort bei Fragen mit `freeText`
  const [other, setOther] = useState('');
  const [sending, setSending] = useState(false);
  // Schritte: die Fragen, danach der Kommentar, danach der Dank
  const commentStep = step === surveyQuestions.length;
  const done = step === surveyQuestions.length + 1;
  const stepCount = surveyQuestions.length + 1;

  // Schon abgegebene Antwort vorbelegen, zum Beispiel beim Öffnen aus „Dein Konto“
  useEffect(() => {
    if (!visible) return;
    setStep(0);
    if (!live) return;
    loadMySurveyAnswer()
      .then((a) => {
        if (!a) return;
        setDraft({ opinion: [a.opinion], frequency: a.frequency ? [a.frequency] : [], usability: [a.usability], design: [a.design], support: a.support, recommend: [a.recommend], reason: a.reason ? [a.reason] : [] });
        setComment(a.comment ?? '');
        setOther(a.reason_other ?? '');
      })
      .catch(() => undefined);
  }, [visible, live]);

  const question = surveyQuestions[step];
  const selected = question ? draft[question.key] ?? [] : [];
  const answered = selected.length > 0 || (!!question?.freeText && !!other.trim());

  const toggle = (key: string) =>
    setDraft((d) => {
      if (!question.multiple) return { ...d, [question.key]: [key] };
      return { ...d, [question.key]: selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key] };
    });

  const send = async () => {
    if (live) {
      const answer: SurveyAnswer = {
        opinion: draft.opinion![0],
        frequency: draft.frequency![0],
        usability: draft.usability![0],
        design: draft.design![0],
        support: draft.support!,
        recommend: draft.recommend![0],
        reason: draft.reason?.[0] ?? null,
        reason_other: other.trim() || null,
        comment: comment.trim() || null,
      };
      setSending(true);
      try {
        await saveSurveyAnswer(answer);
      } catch (error) {
        Alert.alert('Nicht gesendet', errorText(error));
        return;
      } finally {
        setSending(false);
      }
    }
    if (currentUserId) await snoozeSurvey(currentUserId, 'never');
    setStep(surveyQuestions.length + 1);
  };

  const next = () => (commentStep ? send() : setStep(step + 1));

  const snooze = async (key: SurveySnooze) => {
    if (currentUserId) await snoozeSurvey(currentUserId, key);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => snooze('tomorrow')}>
      <BlurView intensity={40} tint={scheme} style={StyleSheet.absoluteFill} />
      <View style={[styles.backdrop, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[16] }]}>
        <View style={styles.card} accessibilityViewIsModal>
          {done ? (
            <View style={styles.head}>
              <Text style={styles.headline} accessibilityRole="header">Danke!</Text>
              <Text style={styles.body}>Deine Antwort hilft uns, KiezCoins besser zu machen.</Text>
            </View>
          ) : commentStep ? (
            <>
              <View style={styles.head}>
                <Text style={styles.caption}>Zum Schluss</Text>
                <Progress step={step} count={stepCount} />
                <Text style={styles.title} accessibilityRole="header">Möchtest Du uns noch etwas sagen?</Text>
              </View>
              <ScrollView style={styles.options} keyboardShouldPersistTaps="handled">
                <TextField
                  label="Kommentar"
                  helperText={t('Freiwillig, höchstens {max} Zeichen.', { max: SURVEY_COMMENT_MAX })}
                  value={comment}
                  onChangeText={setComment}
                  maxLength={SURVEY_COMMENT_MAX}
                  multiline
                />
              </ScrollView>
            </>
          ) : (
            <>
              <View style={styles.head}>
                <Text style={styles.caption}>{t('Frage {n} von {total}', { n: step + 1, total: surveyQuestions.length })}</Text>
                <Progress step={step} count={stepCount} />
                <Text style={styles.title} accessibilityRole="header">{question.title}</Text>
                {question.multiple ? <Text style={styles.caption}>Mehrere Antworten möglich</Text> : null}
              </View>
              <ScrollView style={styles.options} contentContainerStyle={styles.optionsContent} keyboardShouldPersistTaps="handled">
                {question.options.map((o) => {
                  const Option = question.multiple ? CheckOption : RadioOption;
                  return <Option key={o.key} label={o.label} selected={selected.includes(o.key)} onPress={() => toggle(o.key)} />;
                })}
                {question.freeText ? (
                  <TextField
                    label="Eigene Antwort"
                    helperText={t('Freiwillig, höchstens {max} Zeichen.', { max: SURVEY_COMMENT_MAX })}
                    value={other}
                    onChangeText={setOther}
                    maxLength={SURVEY_COMMENT_MAX}
                    multiline
                  />
                ) : null}
              </ScrollView>
            </>
          )}
          <View style={styles.actions}>
            {done ? (
              <Button label="Schließen" onPress={onClose} />
            ) : (
              <>
                <Button
                  busy={sending}
                  label={commentStep ? (sending ? 'Wird gesendet …' : 'Antwort senden') : 'Weiter'}
                  disabled={(!commentStep && !answered) || sending}
                  onPress={next}
                />
                {step > 0 ? <Button label="Zurück" variant="ghost" onPress={() => setStep(step - 1)} /> : null}
              </>
            )}
          </View>
        </View>
        {done ? null : (
          <View style={styles.snooze}>
            {snoozeOptions.map((o) => (
              <Pressable key={o.key} accessibilityRole="button" onPress={() => snooze(o.key)} hitSlop={6}>
                <Text style={styles.snoozeLabel}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

/** Fortschritt als Balken, ein Segment pro Schritt */
function Progress({ step, count }: { step: number; count: number }) {
  return (
    <View style={styles.progress}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.progressStep, i <= step && styles.progressStepActive]} />
      ))}
    </View>
  );
}

/**
 * Zeigt die Umfrage einmal von selbst, wenn die Person angemeldet ist, die App an mindestens drei Tagen
 * genutzt hat, noch nicht geantwortet hat und sie auf diesem Gerät nicht vertagt hat.
 */
export function useSurveyPrompt(): [boolean, () => void] {
  const { mode, currentUserId } = useStore();
  const { session } = useAuth();
  const [visible, setVisible] = useState(false);
  const live = mode === 'live' && !!session && !!currentUserId;

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      // Erst nach mehrfacher Nutzung fragen: ab dem dritten Tag, an dem die App offen war
      if ((await countUsageDay()) < SURVEY_AFTER_DAYS) return;
      if (await isSurveySnoozed(currentUserId)) return;
      const answer = await loadMySurveyAnswer().catch(() => undefined);
      // Ohne Verbindung oder ohne Tabelle (Migration fehlt) lieber nicht fragen.
      // Antworten von vor dem 26.10.2026 fehlt die Frage zur Nutzung: dann noch einmal fragen.
      if (answer === undefined || (answer && answer.frequency)) return;
      if (!cancelled) setVisible(true);
    }, 2500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [live, currentUserId]);

  return [visible, () => setVisible(false)];
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space[16],
    paddingHorizontal: space[16],
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    gap: space[16],
    padding: space[20],
    borderRadius: radius.lg,
    borderWidth: stroke.thin,
    borderColor: color.line.hairline,
    backgroundColor: color.bg.screen,
  },
  head: { gap: space[8] },
  progress: { flexDirection: 'row', gap: space[4] },
  progressStep: { flex: 1, height: 4, borderRadius: radius.full, backgroundColor: color.bg.surface },
  progressStepActive: { backgroundColor: color.accent.primary },
  headline: { ...text.headline, color: color.text.primary },
  title: { ...text.title, color: color.text.primary },
  body: { ...text.body, color: color.text.primary },
  caption: { ...text.caption, color: color.text.secondary },
  options: { flexGrow: 0 },
  optionsContent: { gap: space[8] },
  actions: { gap: space[8] },
  snooze: { alignItems: 'center', gap: space[12] },
  snoozeLabel: { ...text.body, color: color.text.primary, textDecorationLine: 'underline' },
});
