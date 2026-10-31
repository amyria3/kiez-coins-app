import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { SubScreen } from '../../../components/Screen';
import { Text } from '../../../components/T';
import { errorText, loadButtonCounts, loadSurveyResults, loadTourFeedbackResults, type TourFeedbackResults } from '../../../data/remote';
import { tourFeedbackOptions, tourSteps } from '../../../data/tour';
import { surveyQuestions, type SurveyResults } from '../../../data/survey';
import { formatRelative } from '../../../data/format';
import { t } from '../../../data/texts';
import { color, radius, space, text } from '../../../theme/tokens';
import { useGoBack } from '../../../lib/goBack';

/**
 * Route `account/survey/results` (Push aus „Dein Konto“, nur für die Moderation).
 * Zeigt je Antwort die Zahl der Stimmen und den Anteil, darunter die Kommentare, neueste zuerst.
 * Einzelne Antworten und Namen bleiben verborgen.
 */
export default function SurveyResultsScreen() {
  const goBack = useGoBack();
  const [data, setData] = useState<SurveyResults>();
  // Rückmeldung zur Tour (Migration 20261029000300). Ohne Migration bleibt die Karte weg.
  const [tour, setTour] = useState<TourFeedbackResults | null>(null);
  // Welcher Kamera-Knopf häufiger gedrückt wird (Migration 20261031000100). Ohne Migration bleibt die Karte weg.
  const [buttons, setButtons] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    loadSurveyResults()
      .then(setData)
      .catch((error) => Alert.alert('Auswertung nicht geladen', errorText(error)));
    loadTourFeedbackResults()
      .then(setTour)
      .catch(() => setTour(null));
    loadButtonCounts(CAMERA_BUTTONS.map((b) => b.key)).then(setButtons);
  }, []);

  const total = data?.total ?? 0;

  return (
    <SubScreen
      title="Umfrage-Ergebnis"
      subtitle={data ? t('{total} Antworten', { total }) : undefined}
      navigation="back"
      onLeadingPress={goBack}
    >
      {surveyQuestions.map((q, i) => (
        <View key={q.key} style={styles.card}>
          <Text style={styles.title}>{`${i + 1}. `}{q.title}</Text>
          {q.multiple ? <Text style={styles.caption}>Mehrfachauswahl, Anteil bezogen auf alle Antworten</Text> : null}
          {q.options.map((o) => {
            const counts = data?.[q.key] ?? {};
            const n = counts[o.key] ?? 0;
            // Einfachauswahl: Anteil an allen, die diese Frage beantwortet haben (die Frage zur Nutzung fehlt in alten Antworten)
            const base = q.multiple ? total : Object.values(counts).reduce((sum, v) => sum + v, 0);
            const share = base ? Math.round((n / base) * 100) : 0;
            return (
              <View key={o.key} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.body}>{o.label}</Text>
                  <Text style={styles.caption}>{`${n} · ${share} %`}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.bar, { width: `${share}%` }]} />
                </View>
              </View>
            );
          })}
        </View>
      ))}
      <View style={styles.card}>
        <Text style={styles.title}>{t('Eigene Antworten: {title}', { title: surveyQuestions.find((q) => q.key === 'reason')?.title ?? '' })}</Text>
        {data && !data.reason_other?.length ? <Text style={styles.caption}>Noch keine eigenen Antworten.</Text> : null}
        {data?.reason_other?.map((c, i) => (
          <View key={i} style={styles.comment}>
            <Text style={styles.body}>{c.text}</Text>
            <Text style={styles.caption}>{formatRelative(c.at)}</Text>
          </View>
        ))}
      </View>
      {tour ? (
        <View style={styles.card}>
          <Text style={styles.title}>{t('Tour: {title}', { title: tourSteps.find((s) => s.kind === 'feedback')?.title ?? '' })}</Text>
          <Text style={styles.caption}>{t('{total} Antworten, Mehrfachauswahl, Anteil bezogen auf alle Antworten', { total: tour.total })}</Text>
          {tourFeedbackOptions.map((o) => {
            const n = tour.choices[o.key] ?? 0;
            const share = tour.total ? Math.round((n / tour.total) * 100) : 0;
            return (
              <View key={o.key} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.body}>{o.label}</Text>
                  <Text style={styles.caption}>{`${n} · ${share} %`}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.bar, { width: `${share}%` }]} />
                </View>
              </View>
            );
          })}
          {tour.other.map((c, i) => (
            <View key={i} style={styles.comment}>
              <Text style={styles.body}>{c.text}</Text>
              <Text style={styles.caption}>{formatRelative(c.at)}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {buttons ? (
        <View style={styles.card}>
          <Text style={styles.title}>Kamera-Knopf: oben oder in der Leiste?</Text>
          {CAMERA_BUTTONS.map((b) => {
            const n = buttons[b.key] ?? 0;
            const all = Object.values(buttons).reduce((sum, v) => sum + v, 0);
            const share = all ? Math.round((n / all) * 100) : 0;
            return (
              <View key={b.key} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.body}>{b.label}</Text>
                  <Text style={styles.caption}>{`${n} · ${share} %`}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.bar, { width: `${share}%` }]} />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.title}>Kommentare</Text>
        {data && !data.comments?.length ? <Text style={styles.caption}>Noch keine Kommentare.</Text> : null}
        {data?.comments?.map((c, i) => (
          <View key={i} style={styles.comment}>
            <Text style={styles.body}>{c.text}</Text>
            <Text style={styles.caption}>{formatRelative(c.at)}</Text>
          </View>
        ))}
      </View>
    </SubScreen>
  );
}

/** Gezählte Kamera-Knöpfe (TabBar.tsx) */
const CAMERA_BUTTONS = [
  { key: 'kamera-oben', label: 'Oben rechts neben den Reitern' },
  { key: 'kamera-leiste', label: 'Unten in der Leiste' },
];

const styles = StyleSheet.create({
  card: { gap: space[12], padding: space[16], borderRadius: radius.lg, backgroundColor: color.bg.surface },
  title: { ...text.title, color: color.text.primary },
  body: { ...text.body, color: color.text.primary, flex: 1 },
  caption: { ...text.caption, color: color.text.secondary },
  row: { gap: space[4] },
  comment: { gap: space[4], paddingTop: space[12], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line.hairline },
  rowText: { flexDirection: 'row', gap: space[8], alignItems: 'baseline' },
  track: { height: 6, borderRadius: radius.full, backgroundColor: color.bg.screen, overflow: 'hidden' },
  bar: { height: 6, borderRadius: radius.full, backgroundColor: color.accent.primary },
});
