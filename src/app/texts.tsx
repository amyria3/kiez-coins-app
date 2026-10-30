import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text as RawText, StyleSheet, View } from 'react-native';
import { Text } from '../components/T';

import { Button } from '../components/Button';
import { Chip, ChipGroup, TextField } from '../components/Form';
import { GearsLoader } from '../components/GearsLoader';
import { SubScreen } from '../components/Screen';
import { errorText, loadAppTexts, saveAppText, type AppTextLang, type AppTextRow } from '../data/remote';
import { bundledTranslation, languages, loadTexts, normalizeText, t, type Lang } from '../data/texts';
import { color, radius, space, stroke, text } from '../theme/tokens';

// Seiten der App (Daria, 22.10.2026). Zuordnung: src/data/textSeiten.json, erzeugt von scripts/text-pages.mjs.
// Texte, die auf mehreren Seiten stehen, haben eine eigene Gruppe: Eine Änderung gilt dann überall.
import seitenJson from '../data/textSeiten.json';
import { useGoBack } from '../lib/goBack';

type Page =
  | 'mehrere'
  | 'start'
  | 'feed'
  | 'erstellen'
  | 'detail'
  | 'verwalten'
  | 'gruppen'
  | 'freunde'
  | 'reise'
  | 'konto'
  | 'kater'
  | 'moderation'
  | 'recht'
  | 'allgemein';
type Area = 'alle' | Page;
const pages: { key: Page; label: string }[] = [
  { key: 'mehrere', label: 'Auf mehreren Seiten' },
  { key: 'start', label: 'Start und Anmeldung' },
  { key: 'feed', label: 'Feed' },
  { key: 'erstellen', label: 'Challenge erstellen' },
  { key: 'detail', label: 'Challenge-Detail' },
  { key: 'verwalten', label: 'Deine Challenges' },
  { key: 'gruppen', label: 'Gruppen' },
  { key: 'freunde', label: 'Freund:innen und Chats' },
  { key: 'reise', label: 'Was Du so machst' },
  { key: 'konto', label: 'Konto und Einstellungen' },
  { key: 'kater', label: 'Tour und Kater' },
  { key: 'moderation', label: 'Moderation' },
  { key: 'recht', label: 'Rechtstexte' },
  { key: 'allgemein', label: 'Allgemein' },
];
const seiten = seitenJson as Record<string, Page>;
type Sort = 'kurz' | 'lang' | 'neu';
const sorts: { key: Sort; label: string }[] = [
  { key: 'kurz', label: 'Kurz zuerst' },
  { key: 'lang', label: 'Lang zuerst' },
  { key: 'neu', label: 'Zuletzt geändert' },
];

const pageOf = (row: AppTextRow): Page =>
  seiten[normalizeText(row.original)] ?? (row.ort?.includes('Rechtstexte') ? 'recht' : 'allgemein');
/** Fassung, die die App in Sprache `l` zeigt: eigene Fassung aus dem CMS, sonst mitgelieferte Übersetzung, sonst Deutsch */
const shownIn = (row: AppTextRow, l: Lang) =>
  l === 'de'
    ? row.text.trim() || row.original
    : row[l]?.trim() || bundledTranslation(row.original, l) || row.text.trim() || row.original;
/** In Sprache `l` von Hand angepasst */
const changedIn = (row: AppTextRow, l: Lang) =>
  l === 'de' ? !!row.text.trim() && normalizeText(row.text) !== normalizeText(row.original) : !!row[l]?.trim();
/** Mitgelieferte Fassung, auf die „Original wiederherstellen“ zurückgeht */
const baseIn = (row: AppTextRow, l: Lang) => (l === 'de' ? row.original : bundledTranslation(row.original, l) || row.original);
const placeholders = (s: string) => [...new Set([...s.matchAll(/\{(\w+)(?:\}|, plural)/g)].map((m) => `{${m[1]}}`))].sort().join(' ');
/** Ort ohne Dateipfad: „Rechtstexte, Datenschutz“, „account/index (Button)“ */
const shortOrt = (ort: string | null) =>
  (ort ?? '')
    .split(', src/')
    .map((o) => o.replace(/^src\/(app\/|data\/|components\/)?/, '').replace(/\.tsx? \(/, ' ('))
    .join(' · ');

/**
 * Route `texts` (Push aus „Dein Konto“, nur für Moderatorinnen). Editor für das Texte-CMS (Tabelle `app_texts`):
 * alle Texte nach Seiten gruppiert (Texte auf mehreren Seiten eigens), innerhalb nach Länge, mit Suche.
 * Tippen öffnet den Text zum Bearbeiten.
 */
export default function Texte() {
  const goBack = useGoBack();
  const [rows, setRows] = useState<AppTextRow[]>();
  const [area, setArea] = useState<Area>('alle');
  const [sort, setSort] = useState<Sort>('kurz');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string>();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  // Sprache, die der Editor zeigt und ändert
  const [lang, setLang] = useState<Lang>('de');
  const shown = (row: AppTextRow) => shownIn(row, lang);
  const changed = (row: AppTextRow) => changedIn(row, lang);

  const refresh = useCallback(async () => {
    try {
      // Texte aus dem Code, die noch nicht in app_texts stehen, gehören auch dazu (Daria, 29.10.2026: die Suche
      // fand neue Texte nicht). Beim ersten Speichern legt saveAppText die Zeile an.
      const db = await loadAppTexts();
      const known = new Set(db.map((r) => normalizeText(r.original)));
      const missing = Object.keys(seiten)
        .filter((original) => !known.has(original))
        .map((original): AppTextRow => ({ original, text: '', ort: null, updated_at: '' }));
      setRows([...db, ...missing]);
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
      .filter((r) => area === 'alle' || pageOf(r) === area)
      .filter((r) => !q || shown(r).toLowerCase().includes(q) || r.original.toLowerCase().includes(q))
      .sort((a, b) =>
        sort === 'neu'
          ? b.updated_at.localeCompare(a.updated_at)
          : (sort === 'kurz' ? 1 : -1) * (shown(a).length - shown(b).length) || shown(a).localeCompare(shown(b), 'de'),
      );
  }, [rows, area, sort, query, lang]);

  // Anzahl je Seite für die Chips
  const counts = useMemo(() => {
    const c: Partial<Record<Page, number>> = {};
    for (const r of rows ?? []) c[pageOf(r)] = (c[pageOf(r)] ?? 0) + 1;
    return c;
  }, [rows]);
  // „Alle“: nach Seiten gruppiert, in der Reihenfolge der Chips
  const sections = useMemo(
    () =>
      (area === 'alle' ? pages : pages.filter((p) => p.key === area))
        .map((p) => ({ ...p, rows: list.filter((r) => pageOf(r) === p.key) }))
        .filter((p) => p.rows.length),
    [list, area],
  );

  const edit = (row: AppTextRow) => {
    if (open === row.original) return setOpen(undefined);
    setOpen(row.original);
    setDraft(shown(row));
  };

  const save = async (row: AppTextRow, value: string) => {
    // Gleich wie die mitgelieferte Fassung: leer speichern, dann folgt die App künftigen Änderungen im Code
    const next = normalizeText(value) === normalizeText(baseIn(row, lang)) ? '' : value.trim();
    const column = lang === 'de' ? 'text' : lang;
    setBusy(true);
    try {
      await saveAppText(row.original, next, lang as 'de' | AppTextLang);
      setRows((all) =>
        all?.map((r) => (r.original === row.original ? { ...r, [column]: next, updated_at: new Date().toISOString() } : r)),
      );
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
    <SubScreen title="Texte" subtitle={rows ? t('{list} von {rows}', { list: list.length, rows: rows.length }) : undefined} navigation="back" onLeadingPress={goBack}>
      <ChipGroup>
        {languages.map((l) => (
          <Chip
            key={l.code}
            label={l.name}
            selected={lang === l.code}
            onPress={() => {
              setLang(l.code);
              setOpen(undefined);
            }}
          />
        ))}
      </ChipGroup>
      <TextField label="Suchen" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
      <ChipGroup>
        <Chip label={t('Alle')} selected={area === 'alle'} onPress={() => setArea('alle')} />
        {pages
          .filter((p) => counts[p.key])
          .map((p) => (
            <Chip key={p.key} label={`${t(p.label)} ${counts[p.key]}`} selected={area === p.key} onPress={() => setArea(p.key)} />
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

      {sections.map((section) => (
        <View key={section.key} style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t(section.label)} · {section.rows.length}
          </Text>
          {section.key === 'mehrere' ? (
            <Text style={styles.meta}>Diese Texte stehen auf mehreren Seiten. Eine Änderung gilt überall.</Text>
          ) : null}
          {section.rows.map((row) => {
            const isOpen = open === row.original;
            return (
              <View key={row.original} style={[styles.card, isOpen && styles.cardOpen]}>
                <Pressable onPress={() => edit(row)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
                  {/* RawText: Inhalte nicht in die Sprache der App übersetzen */}
                  <RawText style={styles.value} numberOfLines={isOpen ? undefined : 3}>
                    {shown(row)}
                  </RawText>
                  {lang !== 'de' ? (
                    <RawText style={styles.meta} numberOfLines={isOpen ? undefined : 1}>
                      {row.text.trim() || row.original}
                    </RawText>
                  ) : null}
                  <Text style={styles.meta} numberOfLines={1}>{[t('{anzahl} Zeichen', { anzahl: shown(row).length }), shortOrt(row.ort), changed(row) ? t('geändert') : null].filter(Boolean).join(' · ')}</Text>
                </Pressable>
                {isOpen ? (
                  <View style={styles.editor}>
                    <TextField label="Text" value={draft} onChangeText={setDraft} multiline autoFocus />
                    {changed(row) ? <RawText style={styles.meta}>{t('Original: {original}', { original: baseIn(row, lang) })}</RawText> : null}
                    <Button label="Speichern" busy={busy} disabled={draft.trim() === shown(row).trim()} onPress={() => trySave(row)} />
                    {changed(row) ? (
                      <Button label="Original wiederherstellen" variant="ghost" disabled={busy} onPress={() => save(row, '')} />
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
              })}
        </View>
      ))}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: space[48] },
  section: { gap: space[8], marginTop: space[8] },
  sectionTitle: { ...text.title, color: color.text.primary },
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
