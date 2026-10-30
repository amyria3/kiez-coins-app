import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Animated, Platform, Pressable, StyleSheet, Switch as NativeSwitch, TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './T';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import type { ImageSource } from '../data/types';
import { color, isFashionable, radius, scheme, space, stroke, text } from '../theme/tokens';
import { BlurView } from 'expo-blur';
import { Glass, glassControls } from './Glass';
import { nudgeStyles, useNextField, type Nudge } from './Nudge';
import { Icon } from './icons/Icon';
import { IconButton } from './IconButton';
import { t } from '../data/texts';

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
  const [contentHeight, setContentHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const ownViewRef = useRef<View>(null);
  const viewRef = nudge?.ref ?? ownViewRef;
  // Enter springt ins nächste Feld, nach dem letzten zum Absende-Button, sofern das Feld selbst nichts abschickt.
  // Mehrzeilige Felder (Beschreibung) behalten Enter für den Zeilenumbruch.
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
        accessibilityLabel={required ? t('{label}, Pflichtfeld', { label }) : label}
        accessibilityHint={helper}
        multiline={multiline}
        scrollEnabled={multiline ? false : undefined}
        onContentSizeChange={
          multiline && Platform.OS === 'web'
            ? (e) => {
                // Hysterese: Rundungsabweichungen der Pixeldichte (±1–2 px) lösen kein neues Rendern aus.
                // So wächst das Feld zeilenweise und gerät nicht in eine Endlosschleife (React-Fehler #185).
                const next = Math.round(e.nativeEvent.contentSize.height);
                setContentHeight((prev) => (Math.abs(next - prev) > 2 ? next : prev));
              }
            : undefined
        }
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
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          multiline && Platform.OS === 'web' && contentHeight ? { height: Math.max(88, contentHeight + 2) } : null,
          error ? styles.inputError : null,
          // Aktives Feld mit kräftigerem Rand; das Innere rückt um die Differenz ein, damit nichts springt
          focused || hinted ? styles.inputFocused : null,
          { borderColor },
        ]}
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
    <Text style={styles.required} accessibilityLabel={t('Pflichtfeld')}>
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
      {isFashionable ? (
        <FashionSwitch label={label} value={value} onValueChange={onValueChange} />
      ) : glassControls ? (
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

/**
 * Schalter im Look „Fashionable“ (Daria, 24.10.2026), nach dem iOS-Muster: Spur 51 × 31,
 * weißer Knopf 27 mit leichtem Schatten. Aus hellgrau #E5E5E5, an Blau #0095F6. Der Knopf gleitet in 200 ms.
 */
function FashionSwitch({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [value, x]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      style={styles.fashionTrackHit}
    >
      <Animated.View
        style={[
          styles.fashionTrack,
          { backgroundColor: x.interpolate({ inputRange: [0, 1], outputRange: ['#E5E5E5', color.accent.primary] }) },
        ]}
      >
        <Animated.View style={[styles.fashionKnob, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }]} />
      </Animated.View>
    </Pressable>
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

/** Wie `RadioOption`, für Mehrfachauswahl: eckiges Kästchen mit Haken. */
export function CheckOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.radioOption, selected && styles.radioOptionSelected]}
    >
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected ? <Icon name="check" size={14} color={color.bg.screen} /> : null}
      </View>
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
        accessibilityLabel={t('{label} kopieren', { label })}
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
  /** Pflichtfoto fehlt: Rand und Hinweis in der Fehlerfarbe, damit der Fehler sichtbar ist */
  error?: boolean;
  onChange: (photo: ImageSource) => void;
};

/** Figma „PhotoPicker“ (Empty, Filled). Öffnet Kamera oder Mediathek (expo-image-picker). */
/**
 * Kamera oder Mediathek öffnen und das gewählte Foto zurückgeben.
 * `square`: Zuschnitt auf ein Quadrat (Profilbild). `onRemove`: zusätzlich „Foto entfernen“ anbieten.
 */
export function choosePhoto(
  onPicked: (photo: ImageSource) => void,
  {
    square,
    onRemove,
    title = 'Foto hinzufügen',
    extra,
  }: {
    square?: boolean;
    onRemove?: () => void;
    title?: string;
    /** Weitere Wahl im Menü, z. B. „Ausschnitt ändern“ */
    extra?: { text: string; onPress: () => void };
  } = {},
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
      // Im Browser setzt `back` das Attribut capture="environment": So öffnet Android direkt die Rückkamera.
      ...(source === 'camera' ? { cameraType: ImagePicker.CameraType.back } : null),
      ...(square ? { allowsEditing: true, aspect: [1, 1] as [number, number] } : null),
    };
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) onPicked({ uri: asset.uri });
  }
  // Web: Die Kamera-Option erscheint nur auf Touch-Geräten. Die Android-Fotoauswahl zeigt seit Android 14 keine Kamera mehr.
  const offersCamera =
    Platform.OS !== 'web' || (typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches);
  if (!offersCamera && !onRemove && !extra) {
    pick('library');
    return;
  }
  Alert.alert(title, undefined, [
    ...(offersCamera ? [{ text: 'Foto aufnehmen', onPress: () => pick('camera') }] : []),
    { text: 'Foto auswählen', onPress: () => pick('library') },
    ...(extra ? [extra] : []),
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
      <Text style={styles.fieldLabel}>{t('Weitere Fotos (optional, bis zu {max})', { max })}</Text>
      <View style={styles.extraRow}>
        {photos.map((photo, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={t('Foto {i} entfernen', { i: i + 2 })}
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
            accessibilityLabel={t('Weiteres Foto hinzufügen')}
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

/**
 * Titel direkt auf dem Foto, wie später im Feed (Daria, 22.10.2026): Glasfläche unten im Bild.
 * Tippen ins Feld schreibt den Titel, Tippen aufs Bild daneben wählt das Foto.
 */
export type PhotoTitle = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  nudge?: Nudge;
  maxLength?: number;
};

/** Blur im Browser: unscharf wird nur, was hinter dem Element liegt (Daria, 30.10.2026) */
const webBlur = Platform.OS === 'web' ? ({ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' } as object) : {};

/** Eine Zeile Titel (`text.cardTitle`) */
const TITLE_LINE = text.cardTitle.lineHeight;

export function PhotoPicker({
  photo,
  hint,
  error,
  onChange,
  title,
  overlay,
}: PhotoPickerProps & {
  title?: PhotoTitle;
  /** Ebene über dem Foto, z. B. Text direkt auf dem Foto (`PhotoTextOnPhoto`). Fängt Tippen aufs Foto ab. */
  overlay?: ReactNode;
}) {
  const choose = () => choosePhoto(onChange);
  const [focused, setFocused] = useState(false);
  // Höhe des Titels folgt dem Text (Daria, 30.10.2026); im Browser wäre das Feld sonst zwei Zeilen hoch
  const [titleHeight, setTitleHeight] = useState<number>(TITLE_LINE);
  const ownRef = useRef<View>(null);
  const titleRef = title?.nudge?.ref ?? ownRef;
  // „Fertig“ oder Enter im Titel springt ins nächste Feld (Nudge.tsx)
  const titleInputRef = useRef<TextInput>(null);
  const goNext = useNextField(titleInputRef, titleRef);
  const hinted = !title?.error && !!title?.nudge?.hint;
  const titleHelper = title?.error ?? title?.nudge?.hint;
  // Ohne Rahmen (Daria, 24.10.2026); nur ein Fehler zeigt einen roten Rand
  const titleBorder = title?.error ? color.accent.error : 'transparent';
  const emptyText = (
    <>
      <Icon name="camera" />
      <Text style={[text.body, { color: color.text.primary }]}>Foto aufnehmen oder auswählen</Text>
      <Text style={[text.caption, { color: error ? color.accent.error : color.text.secondary }]}>{hint}</Text>
    </>
  );

  return (
    <View style={styles.field}>
      {/* Das Titelfeld liegt neben der Fläche und nicht in ihr. Auf Android reicht ein Tippen ins Feld
          sonst an die Fläche weiter, und die Bildauswahl geht auf (Daria, 25.10.2026). */}
      <View
        style={[
          styles.photoPicker,
          !photo && styles.photoPickerEmpty,
          !photo && error ? styles.photoPickerError : null,
          title ? styles.photoPickerTitled : null,
          title && !photo ? styles.photoPickerTitledEmpty : null,
        ]}
      >
        {/* Mit Foto und Titel: Tippen aufs Foto schreibt den Titel, das Foto ändert der Knopf oben rechts (Daria, 30.10.2026) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={photo && title ? t('Titel eingeben') : photo ? t('Foto ändern') : t('Foto aufnehmen oder auswählen')}
          accessibilityHint={photo && title ? undefined : hint}
          onPress={photo && title ? () => titleInputRef.current?.focus() : choose}
          style={StyleSheet.absoluteFill}
        >
          {photo ? <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          {!photo && !title ? <View style={styles.photoEmptyText}>{emptyText}</View> : null}
        </Pressable>
        {photo && overlay ? overlay : null}
        {/* Mit Titel liegt der Hinweis im Fluss über dem Titel, damit die Fläche nur so hoch ist wie nötig
            (Daria, 27.10.2026). Tippen geht durch ihn hindurch an die Fläche. */}
        {!photo && title ? <View style={styles.photoEmptyTextTitled}>{emptyText}</View> : null}
        {photo && title ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Foto ändern')}
            onPress={choose}
            style={({ pressed }) => [styles.photoChange, pressed && styles.photoChangePressed]}
          >
            {Platform.OS === 'web' ? null : <BlurView intensity={30} tint={scheme} style={StyleSheet.absoluteFill} />}
            <View style={styles.overBlur}>
              <Icon name="camera" size={18} />
            </View>
          </Pressable>
        ) : null}
        {title ? (
          <Pressable
            ref={titleRef}
            accessible={false}
            onPress={() => titleInputRef.current?.focus()}
            style={(state) => {
              // Ruhig: heller und mit Blur; Tippen, Fahren mit der Maus oder Schreiben: dunkler (Daria, 30.10.2026)
              const active = focused || state.pressed || (state as { hovered?: boolean }).hovered;
              return [styles.photoTitle, photo ? styles.photoTitleOnPhoto : null, photo && active ? styles.photoTitleActive : null, { borderColor: titleBorder }];
            }}
          >
            {/* Blur macht nur das Foto dahinter unscharf: im Browser per backdrop-filter am Feld selbst, sonst BlurView darunter */}
            {photo && Platform.OS !== 'web' ? <BlurView intensity={30} tint={scheme} style={StyleSheet.absoluteFill} /> : null}
            <TextInput
              ref={titleInputRef}
              value={title.value}
              onChangeText={(v) => {
                title.nudge?.clear();
                title.onChange(v);
              }}
              maxLength={title.maxLength ?? 60}
              placeholder={t('Titel eingeben')}
              placeholderTextColor={color.text.secondary}
              selectionColor={color.accent.primary}
              accessibilityLabel={t('{label}, Pflichtfeld', { label: t('Titel') })}
              accessibilityHint={titleHelper}
              multiline
              scrollEnabled={false}
              // Mehrzeilig nur zum Umbrechen: Enter schreibt keinen Zeilenumbruch, sondern geht weiter.
              // Der Browser kennt nur `blurOnSubmit` (react-native-web).
              submitBehavior={goNext ? 'submit' : 'blurAndSubmit'}
              {...(Platform.OS === 'web' ? ({ blurOnSubmit: true } as object) : null)}
              returnKeyType={goNext ? 'next' : 'done'}
              onSubmitEditing={() => goNext?.()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onContentSizeChange={(e) => setTitleHeight(Math.max(TITLE_LINE, Math.ceil(e.nativeEvent.contentSize.height)))}
              {...(Platform.OS === 'web' ? ({ rows: 1 } as object) : null)}
              style={[styles.photoTitleInput, styles.overBlur, { height: titleHeight }]}
            />
          </Pressable>
        ) : null}
      </View>
      {titleHelper ? <Text style={[styles.helper, title?.error ? styles.helperError : nudgeStyles.hint]}>{titleHelper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fashionTrackHit: { justifyContent: 'center' },
  fashionTrack: { width: 51, height: 31, borderRadius: 15.5, padding: 2 },
  fashionKnob: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
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
  inputFocused: {
    borderWidth: stroke.focus,
    paddingHorizontal: space[12] - (stroke.focus - stroke.thin),
    paddingVertical: space[12] - (stroke.focus - stroke.thin),
  },
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
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: color.text.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { borderColor: color.accent.primary, backgroundColor: color.accent.primary },
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
  photoPickerError: { borderColor: color.accent.error },
  photoPickerTitled: { height: 300, justifyContent: 'flex-end', alignItems: 'stretch', padding: space[12] },
  photoEmptyText: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 72, alignItems: 'center', justifyContent: 'center', gap: space[8] },
  // Leere Fläche mit Titel: so hoch wie der Inhalt. Oben wenig Luft, zum Titel etwas weniger als vorher (Daria, 27.10.2026)
  photoPickerTitledEmpty: { height: 'auto', justifyContent: 'flex-start', paddingTop: space[24], gap: space[48] },
  photoEmptyTextTitled: { alignItems: 'center', gap: space[8], pointerEvents: 'none' },
  photoTitle: {
    paddingVertical: space[12],
    paddingHorizontal: space[16],
    borderRadius: radius.xl,
    backgroundColor: color.bg.glass,
    borderWidth: stroke.ultraThin,
    overflow: 'hidden',
  },
  // Auf dem Foto: weniger dunkel, dafür Blur (Daria, 30.10.2026)
  photoTitleOnPhoto: { backgroundColor: color.bg.sheet, ...webBlur },
  photoTitleActive: { backgroundColor: color.bg.glass },
  // Foto ändern: runder Knopf oben rechts, wenn Tippen aufs Foto den Titel öffnet
  photoChange: {
    position: 'absolute',
    top: space[12],
    right: space[12],
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bg.sheet,
    ...webBlur,
  },
  photoChangePressed: { backgroundColor: color.bg.glass },
  // Über dem Blur: absolut liegende Flächen malen sonst über den Inhalt
  overBlur: { position: 'relative', zIndex: 1 },
  photoTitleInput: { ...text.cardTitle, color: color.text.primary, padding: 0, textAlign: 'center', outlineStyle: 'none', overflow: 'hidden' } as never,
});
