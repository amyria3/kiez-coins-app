import { useState } from 'react';
import {
  Alert,
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
import { Icon } from './icons/Icon';
import { IconButton } from './IconButton';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  helperText?: string;
  /** Zustand „Error“: Rahmen und Hilfetext in color/accent/error. Der Fehlertext ersetzt den Hilfetext. */
  error?: string;
};

/** Figma „TextField“ (Default, Focused, Error) */
export function TextField({ label, helperText, error, multiline, onFocus, onBlur, ...inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? color.accent.error : focused ? color.accent.primary : color.text.secondary;
  const helper = error ?? helperText;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        accessibilityHint={helper}
        multiline={multiline}
        placeholderTextColor={color.text.secondary}
        selectionColor={color.accent.primary}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, multiline && styles.inputMultiline, { borderColor }]}
      />
      {helper ? <Text style={[styles.helper, error ? styles.helperError : null]}>{helper}</Text> : null}
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

/** Figma „SwitchRow“ mit dem System-Switch (Figma „Switch“ entspricht dem Plattformmuster). */
export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.texts}>
        <Text style={[text.body, { color: color.text.primary }]}>{label}</Text>
        {description ? <Text style={[text.caption, { color: color.text.secondary }]}>{description}</Text> : null}
      </View>
      <NativeSwitch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: color.text.secondary, true: color.accent.primary }}
        thumbColor={color.text.primary}
        ios_backgroundColor={color.text.secondary}
      />
    </View>
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
export function PhotoPicker({ photo, hint, onChange }: PhotoPickerProps) {
  async function pick(source: 'camera' | 'library') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) onChange({ uri: asset.uri });
  }

  function choose() {
    if (Platform.OS === 'web') {
      pick('library');
      return;
    }
    Alert.alert('Foto hinzufügen', undefined, [
      { text: 'Foto aufnehmen', onPress: () => pick('camera') },
      { text: 'Foto auswählen', onPress: () => pick('library') },
      { text: 'Abbrechen', style: 'cancel' },
    ]);
  }

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
  field: { gap: space[6] },
  fieldLabel: { ...text.caption, color: color.text.secondary },
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
