import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Switch as NativeSwitch,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import type { ImageSource } from '../data/types';
import { color, radius, space, stroke, text } from '../theme/tokens';
import { Glass, glassControls } from './Glass';
import { nudgeStyles, useNextField, type Nudge } from './Nudge';
import { Icon } from './icons/Icon';
import { IconButton } from './IconButton';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  helperText?: string;
  /** Zustand „Error“: Rahmen und Hilfetext in color/accent/error. Der Fehlertext ersetzt den Hilfetext. */
  error?: string;
  /** Ziel für einen deaktivierten Button: hervorgehoben mit Hinweis, sobald etwas fehlt (Nudge.tsx) */
  nudge?: Nudge;
  /** Pflichtfeld: Stern in der Signalfarbe hinter der Bezeichnung */
  required?: boolean;
};

/** Figma „TextField“ (Default, Focused, Error) */
export function TextField({
  label,
  helperText,
  error,
  multiline,
  onFocus,
  onBlur,
  nudge,
  onChangeText,
  onSubmitEditing,
  required,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const ownViewRef = useRef<View>(null);
  const viewRef = nudge?.ref ?? ownViewRef;
  // Enter springt ins nächste Feld, sofern das Feld selbst nichts abschickt
  const goNext = useNextField(inputRef, viewRef);
  const advances = !multiline && !onSubmitEditing && !!goNext;
  const hinted = !error && !!nudge?.hint;
  const borderColor = error ? color.accent.error : focused || hinted ? color.accent.primary : color.text.secondary;
  const helper = error ?? nudge?.hint ?? helperText;
  return (
    <View style={styles.field} ref={viewRef}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <RequiredMark /> : null}
      </Text>
      <TextInput
        ref={inputRef}
        returnKeyType={advances ? 'next' : undefined}
        submitBehavior={advances ? 'submit' : undefined}
        {...inputProps}
        onSubmitEditing={(e) => {
          if (onSubmitEditing) onSubmitEditing(e);
          else if (advances) goNext?.();
        }}
        accessibilityLabel={required ? `${label}, Pflichtfeld` : label}
        accessibilityHint={helper}
        multiline={multiline}
        placeholderTextColor={color.text.secondary}
        selectionColor={color.accent.primary}
        onChangeText={(v) => {
          nudge?.clear();
          onChangeText?.(v);
        }}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, multiline && styles.inputMultiline, error ? styles.inputError : null, { borderColor }]}
      />
      {helper ? (
        <Text style={[styles.helper, error ? styles.helperError : hinted ? nudgeStyles.hint : null]}>{helper}</Text>
      ) : null}
    </View>
  );
}

/** Figma „Chip“ (Selected?) */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[text.body, { color: selected ? color.bg.screen : color.text.primary }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipGroup({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.chipGroup} accessibilityRole="radiogroup">
      {children}
    </View>
  );
}

/** Kennzeichnung für Pflichtangaben: Stern in color/accent/primary */
export function RequiredMark() {
  return (
    <Text style={styles.required} accessibilityLabel="Pflichtfeld">
      {' *'}
    </Text>
  );
}

/** Figma „SwitchRow“ mit dem System-Switch (Figma „Switch“ entspricht dem Plattformmuster). */
export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  onDescriptionPress,
  required,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Macht die Beschreibung zum Link, zum Beispiel „Datenschutz lesen“. */
  onDescriptionPress?: () => void;
  /** Pflichtangabe: Stern hinter der Bezeichnung */
  required?: boolean;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.texts}>
        <Text style={[text.body, { color: color.text.primary }]}>
          {label}
          {required ? <RequiredMark /> : null}
        </Text>
        {description ? (
          <Text
            style={[text.caption, { color: color.text.secondary }, onDescriptionPress && styles.link]}
            onPress={onDescriptionPress}
            accessibilityRole={onDescriptionPress ? 'link' : undefined}
            suppressHighlighting
          >
            {description}
          </Text>
        ) : null}
      </View>
      {glassControls ? (
        <GlassSwitch label={label} value={value} onValueChange={onValueChange} />
      ) : (
      <NativeSwitch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: color.text.secondary, true: color.accent.primary }}
        thumbColor={color.text.primary}
        ios_backgroundColor={color.text.secondary}
        // Im Browser färbt react-native-web den Knopf im eingeschalteten Zustand sonst türkis.
        {...(Platform.OS === 'web' ? ({ activeThumbColor: color.text.primary } as object) : null)}
      />
      )}
    </View>
  );
}

const SWITCH_W = 56;
const SWITCH_H = 32;
const KNOB = 26;

/**
 * Versuch (Daria, 21.10.2026): Schalter aus Liquid Glass. Die Spur ist Glas, eingeschaltet hellblau getönt,
 * der Knopf ist ein heller Glastropfen und gleitet federnd hinüber.
 */
function GlassSwitch({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: value ? 1 : 0, useNativeDriver: true, friction: 6, tension: 80 }).start();
  }, [value, x]);
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [0, SWITCH_W - KNOB - 6] });
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
    >
      <Glass
        variant="regular"
        tint={value ? color.accent.primary : undefined}
        interactive
        style={styles.glassTrack}
      >
        <Animated.View style={[styles.glassKnobWrap, { transform: [{ translateX }] }]}>
          <Glass variant="clear" tint="rgba(240,240,240,0.85)" style={styles.glassKnob} />
        </Animated.View>
      </Glass>
    </Pressable>
  );
}

/** Figma „RadioOption“ (Selected?) */
export function RadioOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.radioOption, selected && styles.radioOptionSelected]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.dot} /> : null}</View>
      <Text style={[text.body, styles.flex, { color: color.text.primary }]}>{label}</Text>
    </Pressable>
  );
}

/** Figma „CopyField“: Wert mit Kopieren-Button. */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <View style={styles.copyField}>
      <View style={styles.texts}>
        <Text style={[text.caption, { color: color.text.secondary }]}>{label}</Text>
        <Text style={[text.body, { color: color.text.primary }]} selectable>
          {value}
        </Text>
      </View>
      <IconButton
        icon={copied ? 'check' : 'copy'}
        accessibilityLabel={`${label} kopieren`}
        onPress={async () => {
          await Clipboard.setStringAsync(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      />
    </View>
  );
}

type PhotoPickerProps = {
  photo?: ImageSource;
  /** Im Fehlerzustand steht hier die Fehlermeldung (Figma: „Bitte füge ein Foto hinzu.“) */
  hint: string;
  onChange: (photo: ImageSource) => void;
};

/** Figma „PhotoPicker“ (Empty, Filled). Öffnet Kamera oder Mediathek (expo-image-picker). */
/**
 * Kamera oder Mediathek öffnen und das gewählte Foto zurückgeben.
 * `square`: Zuschnitt auf ein Quadrat (Profilbild). `onRemove`: zusätzlich „Foto entfernen“ anbieten.
 */
export function choosePhoto(
  onPicked: (photo: ImageSource) => void,
  { square, onRemove, title = 'Foto hinzufügen' }: { square?: boolean; onRemove?: () => void; title?: string } = {},
) {
  async function pick(source: 'camera' | 'library') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
      ...(square ? { allowsEditing: true, aspect: [1, 1] as [number, number] } : null),
    };
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) onPicked({ uri: asset.uri });
  }
  if (Platform.OS === 'web' && !onRemove) {
    pick('library');
    return;
  }
  Alert.alert(title, undefined, [
    ...(Platform.OS === 'web' ? [] : [{ text: 'Foto aufnehmen', onPress: () => pick('camera') }]),
    { text: 'Foto auswählen', onPress: () => pick('library') },
    ...(onRemove ? [{ text: 'Foto entfernen', style: 'destructive' as const, onPress: onRemove }] : []),
    { text: 'Abbrechen', style: 'cancel' as const },
  ]);
}

/** Weitere Fotos als kleine Kacheln: antippen entfernt, „+“ fügt hinzu (bis `max`). */
export function ExtraPhotos({
  photos,
  max = 2,
  onAdd,
  onRemove,
}: {
  photos: ImageSource[];
  max?: number;
  onAdd: (photo: ImageSource) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Weitere Fotos (optional, bis zu {max})</Text>
      <View style={styles.extraRow}>
        {photos.map((photo, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Foto ${i + 2} entfernen`}
            onPress={() => onRemove(i)}
            style={styles.extraTile}
          >
            <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={styles.extraRemove}>
              <Icon name="close" size={12} color={color.text.primary} />
            </View>
          </Pressable>
        ))}
        {photos.length < max ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Weiteres Foto hinzufügen"
            onPress={() => choosePhoto(onAdd)}
            style={[styles.extraTile, styles.extraAdd]}
          >
            <Icon name="plus" size={18} color={color.text.secondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function PhotoPicker({ photo, hint, onChange }: PhotoPickerProps) {
  const choose = () => choosePhoto(onChange);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={photo ? 'Foto ändern' : 'Foto aufnehmen oder auswählen'}
      accessibilityHint={hint}
      onPress={choose}
      style={[styles.photoPicker, !photo && styles.photoPickerEmpty]}
    >
      {photo ? (
        <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <>
          <Icon name="camera" />
          <Text style={[text.body, { color: color.text.primary }]}>Foto aufnehmen oder auswählen</Text>
          <Text style={[text.caption, { color: color.text.secondary }]}>{hint}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  link: { textDecorationLine: 'underline', color: color.text.primary },
  field: { gap: space[6] },
  fieldLabel: { ...text.caption, color: color.text.secondary },
  required: { color: color.accent.primary },
  input: {
    ...text.body,
    color: color.text.primary,
    minHeight: 44,
    paddingHorizontal: space[12],
    paddingVertical: space[12],
    borderWidth: stroke.thin,
    borderRadius: radius.sm,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  // Fehler: Feld hebt sich mit heller Fläche ab, der Text bleibt gut lesbar
  inputError: { backgroundColor: color.bg.surface },
  extraRow: { flexDirection: 'row', gap: space[8] },
  extraTile: { width: 88, height: 88, borderRadius: radius.md, overflow: 'hidden' },
  extraAdd: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: stroke.thin,
    borderStyle: 'dashed',
    borderColor: color.text.secondary,
  },
  extraRemove: {
    position: 'absolute',
    top: space[4],
    right: space[4],
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31,33,35,0.75)',
  },
  helper: { ...text.caption, color: color.text.secondary },
  helperError: { color: color.accent.error },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  chip: {
    minHeight: 44,
    paddingHorizontal: space[16],
    paddingVertical: space[12],
    borderRadius: radius.full,
    borderWidth: stroke.thin,
    borderColor: color.text.secondary,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: color.accent.primary, borderColor: color.accent.primary },
  glassTrack: { width: SWITCH_W, height: SWITCH_H, borderRadius: SWITCH_H / 2, justifyContent: 'center' },
  glassKnobWrap: { position: 'absolute', left: 3, top: (SWITCH_H - KNOB) / 2 },
  glassKnob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[12] },
  texts: { flex: 1, gap: space[2] },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    minHeight: 48,
    padding: space[12],
    borderRadius: radius.md,
    borderWidth: stroke.thin,
    borderColor: 'transparent',
    backgroundColor: color.bg.surface,
  },
  radioOptionSelected: { borderColor: color.accent.primary },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: color.text.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: color.accent.primary },
  dot: { width: 10, height: 10, borderRadius: radius.full, backgroundColor: color.accent.primary },
  copyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    paddingVertical: space[8],
    paddingLeft: space[12],
    paddingRight: space[4],
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
  },
  photoPicker: {
    height: 240,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[8],
    overflow: 'hidden',
  },
  photoPickerEmpty: { borderWidth: stroke.thin, borderStyle: 'dashed', borderColor: color.text.secondary },
});
