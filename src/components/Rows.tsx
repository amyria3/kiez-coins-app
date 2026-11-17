import { useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from './T';

import type { User } from '../data/types';
import { useFocusColor } from '../theme/signal';
import { color, radius, size, space, stroke, text } from '../theme/tokens';
import { Avatar } from './AuthorRow';
import { Icon } from './icons/Icon';
import { IconButton } from './IconButton';
import { t } from '../data/texts';

type EditableRowProps = {
  label: string;
  value: string;
  onSave: (value: string) => void;
  /** Statt eines Textfelds eigenen Inhalt zum Bearbeiten zeigen (z. B. Auswahl der Ansprache) */
  renderEditor?: (draft: string, setDraft: (value: string) => void) => React.ReactNode;
  maxLength?: number;
  /** Leeren erlaubt (z. B. Bio). Ohne Wert steht `placeholder` grau da. */
  allowEmpty?: boolean;
  placeholder?: string;
  /** Mehrzeilig eingeben (Bio) */
  multiline?: boolean;
  keyboardType?: 'default' | 'url';
};

/**
 * Figma „EditableRow“ (Display, Editing): Kachel, die beim Antippen zum Eingabefeld wird.
 * Häkchen speichert, Verlassen ohne Speichern verwirft.
 */
export function EditableRow({ label, value, onSave, renderEditor, maxLength, allowEmpty, placeholder, multiline, keyboardType }: EditableRowProps) {
  const [editing, setEditing] = useState(false);
  const focusColor = useFocusColor();
  const [draft, setDraft] = useState(value);
  // Speichern genau einmal: beim Häkchen oder beim Verlassen des Felds. Das Feld verliert den Fokus,
  // bevor das Häkchen den Tipp bekommt, deshalb speichert schon onBlur.
  const committed = useRef(false);
  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    const next = draft.trim();
    if ((next || allowEmpty) && next !== value) onSave(next);
    setEditing(false);
  };

  if (!editing) {
    return (
      <Pressable
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={t('{label}: {value}. Ändern', { label, value })}
        onPress={() => {
          setDraft(value);
          committed.current = false;
          setEditing(true);
        }}
      >
        <View style={styles.texts}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.value, !value && placeholder ? { color: color.text.secondary } : null]}>{value || placeholder}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, styles.editing, { borderColor: focusColor }]}> 
      <View style={styles.texts}>
        <Text style={styles.label}>{label}</Text>
        {renderEditor ? (
          renderEditor(draft, setDraft)
        ) : (
          <TextInput
            style={[styles.value, styles.input]}
            value={draft}
            onChangeText={setDraft}
            onBlur={commit}
            onSubmitEditing={commit}
            returnKeyType="done"
            autoFocus
            maxLength={maxLength}
            multiline={multiline}
            submitBehavior={multiline ? 'blurAndSubmit' : undefined}
            keyboardType={keyboardType === 'url' ? 'url' : 'default'}
            autoCapitalize={keyboardType === 'url' ? 'none' : undefined}
            autoCorrect={keyboardType === 'url' ? false : undefined}
            placeholder={placeholder}
            placeholderTextColor={color.text.placeholder}
            accessibilityLabel={label}
            selectionColor={focusColor}
          />
        )}
      </View>
      {(
        <IconButton
          icon="check"
          accessibilityLabel={t('{label} speichern', { label })}
          onPress={commit}
        />
      )}
    </View>
  );
}

type NavRowProps = {
  label: string;
  value?: string;
  tone?: 'default' | 'danger';
  onPress: () => void;
};

/** Figma „NavRow“ (Default, Danger): Zeile, die zu einem anderen Screen führt. */
export function NavRow({ label, value, tone = 'default', onPress }: NavRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, styles.navRow, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
    >
      <Text style={[styles.value, styles.flex, tone === 'danger' && { color: color.accent.signal }]}>{label}</Text>
      {value ? <Text style={styles.label}>{value}</Text> : null}
      <Icon name="chevron-right" size={size.icon} color={color.text.secondary} />
    </Pressable>
  );
}

type ProfileHeaderProps = {
  user: User;
  name: string;
  details: string[];
  onPress: () => void;
};

/**
 * Kopfbereich der Kontoseite ohne Karte (Daria, 2026-11-17, Entwurf A, „etwas größer“): großes Profilbild, Deckname,
 * persönliche Angaben in einer Zeile und „Profil bearbeiten“. Führt zum Bearbeiten.
 */
export function ProfileHeader({ user, name, details, onPress }: ProfileHeaderProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.profileHeader, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t('Persönliche Angaben: {name}, {details}. Ändern', { name, details: details.join(', ') })}
      onPress={onPress}
    >
      <Avatar user={{ ...user, name }} diameter={80} ringColor={color.bg.screen} />
      <View style={styles.headerTexts}>
        <Text style={styles.headerName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.headerDetails} numberOfLines={1}>
          {details.join(' · ')}
        </Text>
        <Text style={styles.headerEdit}>{t('Profil bearbeiten')}</Text>
      </View>
      <Icon name="chevron-right" size={size.icon} color={color.text.secondary} />
    </Pressable>
  );
}

/**
 * Große Karte, z. B. für Was Du so machst, Deine Challenges und Deine Gruppen.
 * Links ein runder Kreis mit Icon oder Zeichnung, daneben Titel und eine Zeile Beschreibung.
 */
export function NavCard({
  title,
  description,
  leading,
  leadingFill,
  accent,
  onPress,
}: {
  title: string;
  description?: string;
  /** Ohne Icon steht der Text bündig links */
  leading?: ReactNode;
  /** Farbe des Kreises hinter dem Icon (`color.accountCards.*`), das Icon selbst steht in Tinte */
  accent?: string;
  /** Zeichnung sitzt unten im Kreis, der Kreis schneidet ihre Unterkante rund ab (Kater, Daria 25.10.2026) */
  leadingFill?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, styles.navCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={description ? `${title}, ${description}` : title}
      onPress={onPress}
    >
      {leading ? (
        <View style={[styles.cardLeading, accent ? { backgroundColor: accent } : null, leadingFill && styles.cardLeadingFill]}>{leading}</View>
      ) : null}
      <View style={styles.texts}>
        {/* Zwei Zeilen statt abgeschnitten, z. B. „Deine Freundschaften“ auf 360 pt breiten Android-Handys (29.10.2026) */}
        <Text style={styles.navTitle} numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text style={styles.navDescription} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" size={size.icon} color={color.accountCards.inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  saveText: { ...text.bodyStrong, color: color.accent.primary },
  cardLeading: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: color.bg.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLeadingFill: { overflow: 'hidden', justifyContent: 'flex-end' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    padding: space[12],
    minHeight: 60,
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
  },
  navRow: { minHeight: 48 },
  // Papierkarte mit kleiner Rundung wie die Posts im Feed (Daria, 2026-11-17)
  navCard: { padding: space[16], gap: space[16], borderRadius: radius.post, backgroundColor: color.accountCards.card },
  navTitle: { ...text.photoTitle, color: color.accountCards.ink },
  navDescription: { ...text.caption, color: color.accountCards.inkSoft },
  // Aktives Feld mit kräftigerem lila Rand wie alle Eingabefelder (stroke.focus, Daria, 2026-11-09); Abstände um die Differenz kleiner
  editing: {
    borderWidth: stroke.focus,
    paddingVertical: space[4] - (stroke.focus - stroke.thin),
    paddingRight: space[4] - (stroke.focus - stroke.thin),
    paddingLeft: space[12] - (stroke.focus - stroke.thin),
  },
  // Kopfbereich direkt auf dem Grund, ohne Karte (Daria, 2026-11-17)
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: space[16], paddingHorizontal: space[4], paddingVertical: space[8] },
  headerTexts: { flex: 1, gap: space[4] },
  headerName: { ...text.profileName, color: color.icon.large },
  headerDetails: { ...text.bodySm, color: color.text.secondary },
  headerEdit: { ...text.labelSm, color: color.accent.functional, marginTop: space[2] },
  pressed: { opacity: 0.8 },
  texts: { flex: 1, gap: space[2] },
  flex: { flex: 1 },
  label: { ...text.caption, color: color.text.secondary },
  value: { ...text.body, color: color.text.primary },
  input: { padding: 0 },
});
