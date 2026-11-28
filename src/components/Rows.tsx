import { Children, createContext, Fragment, useContext, useRef, useState, type ReactNode } from 'react';
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
  /** `external`: die Zeile öffnet eine Seite außerhalb der App */
  iconEnd?: 'chevron-right' | 'external';
  /** Ausgegraut, bleibt tippbar: `onPress` erklärt dann, warum es gerade nicht geht */
  muted?: boolean;
  onPress: () => void;
};

/** In einer `NavList` mit Trennlinien liegen die Zeilen flach auf dem Grund */
const FlatRows = createContext(false);
/** In einer `NavList` im Kiez-Look bilden die Zeilen einen Block, die Liste trägt die Rundung */
const BlockRows = createContext(false);

/**
 * Liste von `NavRow`s. Kiez: ein Block je Abschnitt, feine Fugen im Grund trennen die Zeilen (Daria, 2026-11-28). Mono (`color.accountCards.divider`): flach, Zeilen durch
 * feine Linien getrennt wie die übrigen Bereiche der Kontoseite (Daria, 2026-11-27).
 */
export function NavList({ children }: { children: ReactNode }) {
  const divider = color.accountCards.divider;
  if (!divider)
    return (
      <BlockRows.Provider value>
        <View style={styles.navList}>{children}</View>
      </BlockRows.Provider>
    );
  const rows = Children.toArray(children);
  return (
    <FlatRows.Provider value>
      <View>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={[styles.listDivider, { backgroundColor: divider }]} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </FlatRows.Provider>
  );
}

/** Figma „NavRow“ (Default, Danger): Zeile, die zu einem anderen Screen führt. */
export function NavRow({ label, value, tone = 'default', iconEnd = 'chevron-right', muted, onPress }: NavRowProps) {
  const flat = useContext(FlatRows);
  const block = useContext(BlockRows);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, styles.navRow, flat && styles.flatRow, block && styles.blockRow, muted && styles.muted, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
    >
      <Text style={[styles.value, styles.flex, tone === 'danger' && { color: color.accent.signal }]}>{label}</Text>
      {value ? <Text style={styles.label}>{value}</Text> : null}
      <Icon name={iconEnd} size={size.icon} color={color.text.secondary} />
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
 * Karte für eine Gruppe von Zeilen auf der Kontoseite (Daria, 2026-11-17): eine Rundung außen, jede `NavGroupRow`
 * bringt ihre eigene Farbstufe mit.
 */
export function NavGroup({ children }: { children: ReactNode }) {
  const divider = color.accountCards.divider;
  if (!divider) return <View style={[styles.navGroup, styles.navGroupGap]}>{children}</View>;
  // Mono: Linie nur zwischen den Zeilen, bündig mit dem Titel (Daria, 2026-11-25)
  const rows = Children.toArray(children);
  return (
    <View style={styles.navGroup}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 ? <View style={[styles.groupDivider, { backgroundColor: divider }]} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

/**
 * Zeile der Kontoseite auf der Farbe ihres Bereichs (`color.accountCards.*`, Daria, 2026-11-17): Icon ohne Kreis,
 * Titel und eine Zeile Beschreibung, Pfeil. `ink` und `inkSoft` nur für dunkle Flächen wie die Kater-Zeile.
 */
export function NavGroupRow({
  title,
  description,
  leading,
  background,
  ink = color.accountCards.ink,
  inkSoft = color.accountCards.inkSoft,
  onPress,
}: {
  title: string;
  description?: string;
  leading: ReactNode;
  background: string;
  ink?: string;
  inkSoft?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.groupRow, { backgroundColor: background }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={description ? `${title}, ${description}` : title}
      onPress={onPress}
    >
      <View style={styles.groupLeading}>{leading}</View>
      <View style={styles.texts}>
        <Text style={[styles.navTitle, { color: ink }]} numberOfLines={1}>
          {title}
        </Text>
        {description ? (
          <Text style={[styles.navDescription, { color: inkSoft }]} numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" size={size.icon} color={inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  saveText: { ...text.bodyStrong, color: color.accent.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    padding: space[12],
    minHeight: 60,
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
  },
  navRow: { minHeight: 52 },
  // Im Block trägt die Liste die Rundung
  blockRow: { borderRadius: 0 },
  navList: { gap: space[2], borderRadius: radius.md, overflow: 'hidden' },
  flatRow: { backgroundColor: 'transparent', borderRadius: 0 },
  listDivider: { height: 1, marginLeft: space[12] },
  navGroup: { borderRadius: radius.md, overflow: 'hidden' },
  // Kiez: Fuge im Grund zwischen den Zeilen einer Gruppe, alle im selben Ton (Daria, 2026-11-28)
  navGroupGap: { gap: space[2] },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[12], paddingVertical: space[12], minHeight: 60 },
  // Beginnt unter dem Titel: Innenabstand 12, Icon-Feld 40, Abstand 12
  groupDivider: { height: 1, marginLeft: space[12] + 40 + space[12] },
  groupLeading: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  navTitle: { ...text.listItemTitle },
  // 14 pt statt 12, einzeilig (Daria, 2026-11-17)
  navDescription: { ...text.bodySm },
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
  muted: { opacity: 0.45 },
  texts: { flex: 1, gap: space[2] },
  flex: { flex: 1 },
  label: { ...text.caption, color: color.text.secondary },
  value: { ...text.body, color: color.text.primary },
  input: { padding: 0 },
});
