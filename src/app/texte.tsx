import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/T';
import { useRouter } from 'expo-router';

import { Button } from '../components/Button';
import { Chip, ChipGroup, TextField } from '../components/Form';
import { GearsLoader } from '../components/GearsLoader';
import { SubScreen } from '../components/Screen';
import { errorText, loadAppTexts, saveAppText, type AppTextRow } from '../data/remote';
import { loadTexts, normalizeText, t } from '../data/texts';
import { color, radius, space, stroke, text } from '../theme/tokens';

type Area = 'alle' | 'buttons' | 'kater' | 'recht';
const areas: { key: Area; label: string }[] = [
  { key: 'alle', label: 'Alle' },
  { key: 'buttons', label: 'Buttons' },
  { key: 'kater', label: 'Kater und Hinweise' },
  { key: 'recht', label: 'Rechtstexte' },
];
type Sort = 'kurz' | 'lang' | 'neu';
const sorts: { key: Sort; label: string }[] = [
  { key: 'kurz', label: 'Kurz zuerst' },
  { key: 'lang', label: 'Lang zuerst' },
  { key: 'neu', label: 'Zuletzt geändert' },
];

const areaOf = (ort: string | null): Exclude<Area, 'alle'> =>
  ort?.includes('Rechtstexte') ? 'recht' : ort?.includes('(Button)') ? 'buttons' : 'kater';
const shown = (row: AppTextRow) => (row.text.trim() ? row.text : row.original);
const changed = (row: AppTextRow) => !!row.text.trim() && normalizeText(row.text) !== normalizeText(row.original);
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(' ');
/** Ort ohne Dateipfad: „Rechtstexte, Datenschutz“, „account/index (Button)“ */
const shortOrt = (ort: string | null) =>
  (ort ?? '')
    .split(', src/')
    .map((o) => o.replace(/^src\/(app\/|data\/|components\/)?/, '').replace(/\.tsx? \(/, ' ('))
    .join(' · ');

/**
 * Route `texte` (Push aus „Dein Konto“, nur für Moderatorinnen). Editor für das Texte-CMS (Tabelle `app_texts`):
 * alle Buttons, Kater-Texte und Rechtstexte, sortiert nach Länge, mit Suche. Tippen öffnet den Text zum Bearbeiten.
 */
export default function Texte() {
  const router = useRouter();
  const [rows, setRows] = useState<AppTextRow[]>();
  const [area, setArea] = useState<Area>('alle');
  const [sort, setSort] = useState<Sort>('kurz');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string>();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRows(await loadAppTexts());
    } catch (error) {
      Alert.alert('Texte nicht geladen', errorText(error));
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? [])
      .filter((r) => area === 'alle' || areaOf(r.ort) === area)
      .filter((r) => !q || shown(r).toLowerCase().includes(q) || r.original.toLowerCase().includes(q))
      .sort((a, b) =>
        sort === 'neu'
          ? b.updated_at.localeCompare(a.updated_at)
          : (sort === 'kurz' ? 1 : -1) * (shown(a).length - shown(b).length) || shown(a).localeCompare(shown(b), 'de'),
      );
  }, [rows, area, sort, query]);

  const edit = (row: AppTextRow) => {
    if (open === row.original) return setOpen(undefined);
    setOpen(row.original);
    setDraft(shown(row));
  };

  const save = async (row: AppTextRow, value: string) => {
    // Gleich wie das Original: leer speichern, dann folgt die App künftigen Änderungen im Code
    const next = normalizeText(value) === normalizeText(row.original) ? '' : value.trim();
    setBusy(true);
    try {
      await saveAppText(row.original, next);
      setRows((all) => all?.map((r) => (r.original === row.original ? { ...r, text: next, updated_at: new Date().toISOString() } : r)));
      setOpen(undefined);
      loadTexts();
    } catch (error) {
      Alert.alert('Nicht gespeichert', errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const trySave = (row: AppTextRow) => {
    if (placeholders(draft) !== placeholders(row.original)) {
      Alert.alert(
        'Platzhalter fehlen',
        t('Der Text braucht dieselben Platzhalter wie das Original: {original}. Die App setzt dort den passenden Wert ein.', { original: placeholders(row.original) || 'keine' }),
      );
      return;
    }
    save(row, draft);
  };

  return (
    <SubScreen title="Texte" subtitle={rows ? t('{list} von {rows}', { list: list.length, rows: rows.length }) : undefined} navigation="back" onLeadingPress={() => router.back()}>
      <TextField label="Suchen" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
      <ChipGroup>
        {areas.map((a) => (
          <Chip key={a.key} label={a.label} selected={area === a.key} onPress={() => setArea(a.key)} />
        ))}
      </ChipGroup>
      <ChipGroup>
        {sorts.map((s) => (
          <Chip key={s.key} label={s.label} selected={sort === s.key} onPress={() => setSort(s.key)} />
        ))}
      </ChipGroup>

      {!rows ? (
        <View style={styles.loading}>
          <GearsLoader />
        </View>
      ) : null}

      {list.map((row) => {
        const isOpen = open === row.original;
        return (
          <View key={row.original} style={[styles.card, isOpen && styles.cardOpen]}>
            <Pressable onPress={() => edit(row)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
              <Text style={styles.value} numberOfLines={isOpen ? undefined : 3}>
                {shown(row)}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>{[t('{anzahl} Zeichen', { anzahl: shown(row).length }), shortOrt(row.ort), changed(row) ? t('geändert') : null].filter(Boolean).join(' · ')}</Text>
            </Pressable>
            {isOpen ? (
              <View style={styles.editor}>
                <TextField label="Text" value={draft} onChangeText={setDraft} multiline autoFocus />
                {changed(row) ? <Text style={styles.meta}>{t('Original: {original}', { original: row.original })}</Text> : null}
                <Button label="Speichern" busy={busy} disabled={draft.trim() === shown(row).trim()} onPress={() => trySave(row)} />
                {changed(row) ? (
                  <Button label="Original wiederherstellen" variant="ghost" disabled={busy} onPress={() => save(row, '')} />
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: space[48] },
  card: {
    gap: space[8],
    padding: space[16],
    borderRadius: radius.lg,
    backgroundColor: color.bg.surface,
    borderWidth: stroke.thin,
    borderColor: 'transparent',
  },
  cardOpen: { borderColor: color.accent.primary },
  value: { ...text.body, color: color.text.primary },
  meta: { ...text.caption, color: color.text.secondary, marginTop: space[4] },
  editor: { gap: space[12], paddingTop: space[8] },
});
