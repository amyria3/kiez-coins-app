import { useRef, useState, type ReactNode } from 'react';
import { Alert, Platform, StyleSheet, TextInput, View } from 'react-native';

import { BEFORE_AFTER_TEXT_MAX } from '../../data/remote';
import { useStore } from '../../data/store';
import { t } from '../../data/texts';
import { color, font, isFashionable, radius, space, stroke, text } from '../../theme/tokens';
import { Button } from '../Button';
import { PhotoPicker } from '../Form';
import { useNudge } from '../Nudge';
import { useComposeContent, type ComposeContent } from './compose';
import { Text } from '../T';

/** Fortschritt „1 Vorher, 2 Timer, 3 Nachher“ */
export function BeforeAfterSteps({ at }: { at: 0 | 1 | 2 }) {
  const names = ['Vorher', 'Timer', 'Nachher'];
  return (
    <View
      style={styles.steps}
      accessible
      accessibilityLabel={t('Schritt {n} von 3: {name}', { n: at + 1, name: t(names[at]) })}
    >
      {names.map((name, i) => (
        <View key={name} style={[styles.stepWrap, i < names.length - 1 && styles.flex]}>
          <View style={styles.step}>
            <View style={[styles.stepDot, i === at && styles.stepDotOn, i < at && styles.stepDotDone]}>
              <Text style={[styles.stepNumber, i === at && styles.stepNumberOn]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepName, i <= at && styles.stepNameOn]}>{t(name)}</Text>
          </View>
          {i < names.length - 1 ? <View style={styles.stepBar} /> : null}
        </View>
      ))}
    </View>
  );
}

/**
 * Erklärung mit fester Marke vorn (#vorher, #nachher oder #InDiesemMoment). Die Marke gehört nicht zum gespeicherten Text.
 * Me-Challenge: #vorher und #nachher setzt die Datenbank beim Posten davor.
 * We-Challenge (#vorher, #nachher, `data/weChallenge.ts`) und Bild (#InDiesemMoment): Die App setzt sie beim Anzeigen davor.
 * Höchstens 240 Zeichen, sofern `maxLength` nichts anderes sagt.
 */
export function TagTextField({
  label,
  tag,
  value,
  onChangeText,
  placeholder,
  tooLong,
  maxLength = BEFORE_AFTER_TEXT_MAX,
}: {
  label: string;
  tag: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  /** Zu langer Text (aus einem anderen Formular übernommen): Rand und Zähler in der Fehlerfarbe */
  tooLong?: boolean;
  maxLength?: number;
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{t(label)}</Text>
      <View
        style={[styles.box, focused && styles.boxFocused, { borderColor: tooLong ? color.accent.error : focused ? color.accent.primary : isFashionable ? color.line.hairline : color.text.secondary }]}
        onTouchEnd={() => inputRef.current?.focus()}
      >
        <Text style={styles.tag} noTranslate>
          {tag}
        </Text>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          maxLength={maxLength}
          multiline
          scrollEnabled={false}
          placeholder={placeholder ? t(placeholder) : undefined}
          placeholderTextColor={color.text.secondary}
          selectionColor={color.accent.primary}
          accessibilityLabel={t('{label}, beginnt mit {tag}', { label: t(label), tag })}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, Platform.OS === 'web' ? styles.inputWeb : null]}
        />
      </View>
      <View style={styles.help}>
        <Text style={[styles.helpText, tooLong ? { color: color.accent.error } : null]}>{`${value.length} / ${maxLength}`}</Text>
      </View>
    </View>
  );
}

/**
 * Schritt 1 von Vorher-Nachher im Erstellen-Blatt: Vorher-Foto, Überschrift, Erklärung.
 * „Vorher speichern“ legt den Entwurf an; danach geht es im Timer weiter (Route `vorher-nachher/[id]`).
 */
export function useBeforeAfterStartForm(
  groupId: string | undefined,
  onStarted: (id: string) => void,
  shared?: ComposeContent,
  /** Modus „Privat“, nur ohne Gruppe (Daria, 27.10.2026) */
  isPrivate = false,
): { fields: ReactNode; button: ReactNode } {
  const { beforeAfter } = useStore();
  const own = useComposeContent();
  const { photo, setPhoto, title, setTitle, text: beforeText, setText: setBeforeText } = shared ?? own;
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const titleField = useNudge();
  const missingPhoto = !photo;
  const missingTitle = !title.trim();
  // Text aus einem anderen Formular kann länger sein als die Me-Challenge erlaubt
  const textTooLong = beforeText.length > BEFORE_AFTER_TEXT_MAX;

  const save = async () => {
    if (!photo || missingTitle || textTooLong) {
      setShowErrors(true);
      return;
    }
    setBusy(true);
    try {
      const id = await beforeAfter.start({ groupId, title, beforeText, photo, private: isPrivate });
      onStarted(id);
    } catch (error) {
      Alert.alert('Vorher nicht gespeichert', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fields = (
    <>
      <Text style={styles.hint}>
        Halte fest, wie Du etwas reparierst, umbaust, verschönerst oder eine neue, nützliche Gewohnheit übst. Dokumentiere zuerst mit einem Foto den Stand „vorher“.
      </Text>
      <BeforeAfterSteps at={0} />
      <PhotoPicker
        photo={photo}
        error={showErrors && missingPhoto}
        hint={showErrors && missingPhoto ? 'Bitte ein Vorher-Foto hinzufügen.' : 'So sieht es jetzt aus.'}
        onChange={setPhoto}
        title={{
          value: title,
          onChange: setTitle,
          nudge: titleField,
          error: showErrors && missingTitle ? 'Bitte gib eine Überschrift ein.' : undefined,
        }}
      />
      <TagTextField
        label="Beschreibung"
        tag="#vorher"
        value={beforeText}
        onChangeText={setBeforeText}
        placeholder="Was ist die Aufgabe oder die Ausgangslage? Erkläre kurz, worin die Me-Challenge besteht."
        tooLong={showErrors && textTooLong}
      />
    </>
  );

  const button = (
    <Button
      busy={busy}
      label={busy ? 'Wird gespeichert …' : 'Vorher speichern'}
      onPress={save}
      disabled={busy}
    />
  );

  return { fields, button };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hint: { ...text.body, fontSize: 14, lineHeight: 19, color: color.text.secondary },
  steps: { flexDirection: 'row', alignItems: 'center' },
  stepWrap: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  step: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: stroke.thin,
    borderColor: color.line.hairline,
  },
  stepDotOn: { backgroundColor: color.accent.primary, borderColor: color.accent.primary },
  stepDotDone: { backgroundColor: color.bg.surface, borderColor: color.bg.surface },
  stepNumber: { fontFamily: font.medium, fontSize: 10, lineHeight: 12, color: color.text.secondary },
  stepNumberOn: { color: color.text.onAccent },
  stepName: { ...text.caption, fontSize: 12, color: color.text.secondary },
  stepNameOn: { color: color.text.primary },
  stepBar: { flex: 1, height: stroke.thin, backgroundColor: color.line.hairline, marginRight: space[8] },
  field: { gap: space[6] },
  label: { ...text.caption, color: color.text.secondary },
  box: {
    minHeight: 88,
    borderWidth: stroke.thin,
    borderRadius: radius.sm,
    paddingHorizontal: space[12],
    paddingTop: space[12],
    paddingBottom: space[8],
    gap: space[2],
  },
  // Aktives Feld mit kräftigerem Rand, Inhalt bleibt an seinem Platz
  boxFocused: {
    borderWidth: stroke.focus,
    paddingHorizontal: space[12] - (stroke.focus - stroke.thin),
    paddingTop: space[12] - (stroke.focus - stroke.thin),
    paddingBottom: space[8] - (stroke.focus - stroke.thin),
  },
  tag: { fontFamily: isFashionable ? font.semiBold : font.medium, fontSize: 14, lineHeight: 18, color: color.accent.signal },
  input: { ...text.body, color: color.text.primary, padding: 0, minHeight: 40, textAlignVertical: 'top' },
  inputWeb: { outlineStyle: 'none' } as object,
  help: { flexDirection: 'row', justifyContent: 'flex-end', gap: space[8] },
  helpText: { ...text.caption, color: color.text.secondary, fontVariant: ['tabular-nums'] },
});
