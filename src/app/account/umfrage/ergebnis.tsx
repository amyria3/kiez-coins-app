import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SubScreen } from '../../../components/Screen';
import { Text } from '../../../components/T';
import { errorText, loadSurveyResults } from '../../../data/remote';
import { surveyQuestions, type SurveyResults } from '../../../data/survey';
import { t } from '../../../data/texts';
import { color, radius, space, text } from '../../../theme/tokens';

/**
 * Route `account/umfrage/ergebnis` (Push aus „Dein Konto“, nur für die Moderation).
 * Zeigt je Antwort die Zahl der Stimmen und den Anteil. Einzelne Antworten und Namen bleiben verborgen.
 */
export default function SurveyResultsScreen() {
  const router = useRouter();
  const [data, setData] = useState<SurveyResults>();

  useEffect(() => {
    loadSurveyResults()
      .then(setData)
      .catch((error) => Alert.alert('Auswertung nicht geladen', errorText(error)));
  }, []);

  const total = data?.total ?? 0;

  return (
    <SubScreen
      title="Umfrage-Ergebnis"
      subtitle={data ? t('{total} Antworten', { total }) : undefined}
      navigation="back"
      onLeadingPress={() => router.back()}
    >
      {surveyQuestions.map((q, i) => (
        <View key={q.key} style={styles.card}>
          <Text style={styles.title}>{`${i + 1}. `}{q.title}</Text>
          {q.multiple ? <Text style={styles.caption}>Mehrfachauswahl, Anteil bezogen auf alle Antworten</Text> : null}
          {q.options.map((o) => {
            const n = data?.[q.key]?.[o.key] ?? 0;
            const share = total ? Math.round((n / total) * 100) : 0;
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
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[12], padding: space[16], borderRadius: radius.lg, backgroundColor: color.bg.surface },
  title: { ...text.title, color: color.text.primary },
  body: { ...text.body, color: color.text.primary, flex: 1 },
  caption: { ...text.caption, color: color.text.secondary },
  row: { gap: space[4] },
  rowText: { flexDirection: 'row', gap: space[8], alignItems: 'baseline' },
  track: { height: 6, borderRadius: radius.full, backgroundColor: color.bg.screen, overflow: 'hidden' },
  bar: { height: 6, borderRadius: radius.full, backgroundColor: color.accent.primary },
});
