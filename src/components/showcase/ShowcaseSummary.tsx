import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { loadShowcaseSummary, type ShowcaseSummary as Summary } from '../../data/showcaseCard';
import { localeTag, t } from '../../data/texts';
import { color, radius, space, text } from '../../theme/tokens';
import { FieldGroup } from '../Content';
import { Text } from '../T';

/**
 * Zusammenfassung oben in der Schaufenster-Verwaltung (2026-11-23): Posts, neue Abonnent:innen, Aufrufe und wie oft
 * die Visitenkarte angefragt wurde (geöffnet, in Kontakte gespeichert, Kontakt erhalten; getrennt gezählt, in einer
 * Zeile zusammengefasst). Alle Zahlen für die letzten 30 Tage, gleich auf jedem Gerät und für das ganze Team.
 * Ohne die Migration 20261123000100 steht nur die Zeile zu den Posts da.
 */
export function ShowcaseSummary({ showcaseId }: { showcaseId: string }) {
  const [summary, setSummary] = useState<Summary | null | undefined>(undefined);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadShowcaseSummary(showcaseId).then(
        (s) => active && setSummary(s),
        () => active && setSummary(null),
      );
      return () => {
        active = false;
      };
    }, [showcaseId]),
  );
  if (!summary) return null;
  const lines = summaryLines(summary);
  return (
    <FieldGroup heading label="Zusammenfassung">
      <View style={styles.box}>
        {lines.map((line) => (
          <Text key={line} style={styles.line}>
            {line}
          </Text>
        ))}
        {summary.stats ? <Text style={styles.meta}>{t('Zahlen der letzten 30 Tage')}</Text> : null}
      </View>
    </FieldGroup>
  );
}

const day = (iso: string) => new Date(iso).toLocaleDateString(localeTag(), { day: 'numeric', month: 'numeric', year: 'numeric' });

/** Zeilen auf Deutsch, durch t() übersetzt; die Zahl steht im Text, damit Einzahl und Mehrzahl stimmen */
function summaryLines(s: Summary): string[] {
  const lines: string[] = [];
  if (!s.posts) lines.push(t('Du hast noch keine Posts.'));
  else if (s.posts === 1) lines.push(s.lastPostAt ? t('Du hast 1 Post, vom {date}.', { date: day(s.lastPostAt) }) : t('Du hast 1 Post.'));
  else
    lines.push(
      s.lastPostAt
        ? t('Du hast {count} Posts, der letzte ist vom {date}.', { count: String(s.posts), date: day(s.lastPostAt) })
        : t('Du hast {count} Posts.', { count: String(s.posts) }),
    );
  const x = s.stats;
  if (!x) return lines;
  lines.push(
    x.newFollowers === 0
      ? t('Du hast keine neuen Abonnent:innen.')
      : x.newFollowers === 1
        ? t('Du hast 1 neue:n Abonnent:in.')
        : t('Du hast {count} neue Abonnent:innen.', { count: String(x.newFollowers) }),
  );
  lines.push(
    x.pageViews === 1 ? t('Dein Schaufenster wurde 1-mal aufgerufen.') : t('Dein Schaufenster wurde {count}-mal aufgerufen.', { count: String(x.pageViews) }),
  );
  const requests = x.cardViews + x.contactSaves + x.contactsReceived;
  lines.push(
    requests === 0
      ? t('Deine Visitenkarte wurde noch nicht angefragt.')
      : t('Deine Visitenkarte wurde {count}-mal angefragt: {opened}-mal geöffnet, {saved}-mal gespeichert, {received} Kontakte erhalten.', {
          count: String(requests),
          opened: String(x.cardViews),
          saved: String(x.contactSaves),
          received: String(x.contactsReceived),
        }),
  );
  return lines;
}

const styles = StyleSheet.create({
  box: { gap: space[8], padding: space[16], borderRadius: radius.md, backgroundColor: color.bg.surface },
  line: { ...text.body, color: color.text.primary },
  meta: { ...text.caption, color: color.text.secondary, marginTop: space[4] },
});
