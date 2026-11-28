import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

import { loadShowcaseSummary, type ShowcaseSummary as Summary } from '../../data/showcaseCard';
import { localeTag, t } from '../../data/texts';
import { color, radius, space, text } from '../../theme/tokens';
import { FieldGroup } from '../Content';
import { Text } from '../T';

/** Auf diesem Gerät gemerkt: Statistik offen oder zu (anfangs zu) */
const OPEN_KEY = 'schaufenster-statistik-offen';

/**
 * „Statistik“ der Schaufenster-Verwaltung (Daria, 2026-11-23: eingeklappt, schöner als Sätze in einem grauen
 * Kasten; seit 2026-11-28 unter der Digitalen Visitenkarte). Vier Kacheln mit großer Zahl, Bezeichnung und einer Zeile Detail: Posts, neue Abonnent:innen, Aufrufe,
 * Anfragen der Digitalen Visitenkarte (geöffnet, gespeichert, Kontakt erhalten). Posts zählen gesamt, die übrigen die letzten
 * 30 Tage, gleich auf jedem Gerät und für das ganze Team. Eingeklappt steht eine Zeile mit den wichtigsten Zahlen unter
 * der Überschrift. Ohne Migration 20261123000100 gibt es nur die Kachel zu den Posts.
 */
export function ShowcaseSummary({ showcaseId }: { showcaseId: string }) {
  const [summary, setSummary] = useState<Summary | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(OPEN_KEY).then(
      (v) => setOpen(v === '1'),
      () => {},
    );
  }, []);
  const toggle = () =>
    setOpen((o) => {
      AsyncStorage.setItem(OPEN_KEY, o ? '0' : '1').catch(() => {});
      return !o;
    });
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
  const x = summary.stats;
  const requests = x ? x.cardViews + x.contactSaves + x.contactsReceived : 0;

  return (
    <FieldGroup
      heading
      label="Statistik"
      open={open}
      onToggle={toggle}
      closedHint={
        x
          ? t('{views} Aufrufe · {followers} neue Abonnent:innen · {requests} Anfragen der Digitalen Visitenkarte', {
              views: String(x.pageViews),
              followers: String(x.newFollowers),
              requests: String(requests),
            })
          : summary.posts === 1
            ? t('1 Post')
            : t('{count} Posts', { count: String(summary.posts) })
      }
    >
      <View style={styles.grid}>
        <Tile
          value={summary.posts}
          label={summary.posts === 1 ? t('Post') : t('Posts')}
          detail={summary.lastPostAt ? t('Der letzte ist vom {date}.', { date: day(summary.lastPostAt) }) : t('Noch keiner.')}
        />
        {x ? (
          <>
            <Tile
              value={x.newFollowers}
              label={x.newFollowers === 1 ? t('neue:r Abonnent:in') : t('neue Abonnent:innen')}
              detail={t('{count} insgesamt', { count: String(x.followers) })}
            />
            <Tile value={x.pageViews} label={x.pageViews === 1 ? t('Aufruf') : t('Aufrufe')} detail={t('Deine Seite in der App und im Web')} />
            <Tile
              value={requests}
              label={t('Anfragen der Digitalen Visitenkarte')}
              detail={t('{opened} geöffnet · {saved} gespeichert · {received} Kontakte', {
                opened: String(x.cardViews),
                saved: String(x.contactSaves),
                received: String(x.contactsReceived),
              })}
            />
          </>
        ) : null}
      </View>
      {x ? <Text style={styles.meta}>{t('Posts gesamt, alle anderen Zahlen der letzten 30 Tage')}</Text> : null}
    </FieldGroup>
  );
}

const day = (iso: string) => new Date(iso).toLocaleDateString(localeTag(), { day: 'numeric', month: 'numeric', year: 'numeric' });

/** Kachel: große Zahl, darunter die Bezeichnung und eine Zeile Detail (Schrift in Texttönen, keine Signalfarbe) */
function Tile({ value, label, detail }: { value: number; label: string; detail: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${value} ${label}. ${detail}`}>
      <Text noTranslate style={styles.value}>
        {value.toLocaleString(localeTag())}
      </Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Zwei Kacheln nebeneinander, auf schmalen Geräten untereinander
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 140,
    gap: space[2],
    paddingVertical: space[12],
    paddingHorizontal: space[16],
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
  },
  // Zahl in der Überschriften-Schrift der App (sans, halbfett), keine eigene Größe
  value: { ...text.headline, color: color.text.primary },
  label: { ...text.bodyStrong, color: color.text.primary },
  detail: { ...text.caption, color: color.text.secondary },
  meta: { ...text.caption, color: color.text.secondary },
});
