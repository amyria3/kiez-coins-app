import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from '../components/T';
import { useRouter } from 'expo-router';

import { Button } from '../components/Button';
import { Notice } from '../components/Content';
import { NavRow } from '../components/Rows';
import { SubScreen } from '../components/Screen';
import { formatRelative } from '../data/format';
import { errorText, loadModerationReports, setReportStatus } from '../data/remote';
import type { ModerationReport, User } from '../data/types';
import { color, radius, space, text } from '../theme/tokens';
import { t } from '../data/texts';

const reasonLabels: Record<string, string> = {
  discrimination: 'Diskriminierung',
  harassment: 'Belästigung oder Bedrohung',
  violence: 'Gewalt',
  dangerous: 'Gefährliche Aufgabe',
  illegal: 'Rechtswidrig',
  not_paid: 'Coins nicht gezahlt',
  abusive: 'Unfreundlich oder bedrohlich',
  spam: 'Spam',
  other: 'Etwas anderes',
};

const statusLabels: Record<ModerationReport['status'], string> = {
  new: 'Neu',
  confirmed: 'Bestätigt',
  dismissed: 'Verworfen',
};

/**
 * Route `moderation` (Push aus „Dein Konto“, nur für Personen in der Tabelle `moderators`).
 * Zeigt alle Meldungen zu Personen und Challenges. Sperren und Löschen laufen im Supabase-Dashboard.
 */
export default function Moderation() {
  const router = useRouter();
  const [data, setData] = useState<{ reports: ModerationReport[]; users: User[]; titles: Record<string, string> }>();
  const [showDone, setShowDone] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setData(await loadModerationReports());
    } catch (error) {
      Alert.alert('Meldungen nicht geladen', errorText(error));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const userName = (id?: string) => data?.users.find((u) => u.id === id)?.name ?? 'Gelöschtes Konto';

  const decide = async (report: ModerationReport, status: ModerationReport['status']) => {
    try {
      await setReportStatus(report, status);
      await refresh();
    } catch (error) {
      Alert.alert('Status nicht gespeichert', errorText(error));
    }
  };

  const reports = data?.reports.filter((r) => showDone || r.status === 'new') ?? [];
  const open = data?.reports.filter((r) => r.status === 'new').length ?? 0;

  return (
    <SubScreen title="Moderation" subtitle={t('{open} offen', { open })} navigation="back" onLeadingPress={() => router.back()}>
      <Notice message="Bestätigst Du eine Meldung, entfernst Du den Inhalt oder sperrst das Konto im Supabase-Dashboard und schreibst der Person per E-Mail, warum." />
      <NavRow
        label={showDone ? 'Nur offene zeigen' : 'Auch erledigte zeigen'}
        onPress={() => setShowDone((v) => !v)}
      />
      {data && reports.length === 0 ? <Text style={styles.secondary}>Keine offenen Meldungen.</Text> : null}
      {reports.map((r) => (
        <View key={`${r.kind}-${r.id}`} style={styles.card}>
          <Text style={styles.caption}>
            {r.kind === 'user' ? 'Person' : 'Challenge'} · {statusLabels[r.status]} · {formatRelative(r.createdAt)}
          </Text>
          <Text style={styles.title}>{reasonLabels[r.reason] ?? r.reason}</Text>
          <Text style={styles.body}>{[
              t('Gemeldet: {name}', { name: userName(r.reportedId) }),
              r.challengeId ? t('Challenge: {title}', { title: data?.titles[r.challengeId] ?? t('gelöscht') }) : null,
              t('Von: {name}', { name: userName(r.reporterId) }),
            ]
              .filter(Boolean)
              .join('\n')}</Text>
          {r.description ? <Text style={styles.description}>„{r.description}“</Text> : null}
          <View style={styles.actions}>
            {r.challengeId && data?.titles[r.challengeId] ? (
              <Button label="Challenge öffnen" variant="ghost" onPress={() => router.push(`/challenge/${r.challengeId}`)} />
            ) : null}
            {r.status === 'new' ? (
              <>
                <Button label="Bestätigen" variant="danger" onPress={() => decide(r, 'confirmed')} />
                <Button label="Verwerfen" variant="secondary" onPress={() => decide(r, 'dismissed')} />
              </>
            ) : (
              <Button label="Wieder öffnen" variant="secondary" onPress={() => decide(r, 'new')} />
            )}
          </View>
        </View>
      ))}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[8], padding: space[16], borderRadius: radius.lg, backgroundColor: color.bg.surface },
  caption: { ...text.caption, color: color.text.secondary },
  title: { ...text.title, color: color.text.primary },
  body: { ...text.body, color: color.text.primary },
  description: { ...text.body, color: color.text.secondary },
  secondary: { ...text.body, color: color.text.secondary },
  actions: { gap: space[8] },
});
