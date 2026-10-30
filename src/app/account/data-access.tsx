import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../components/T';

import { FieldGroup, Notice } from '../../components/Content';
import { SubScreen } from '../../components/Screen';
import { loadMyDataAccess, type DataAccess } from '../../data/dataAccess';
import { formatDateLong } from '../../data/format';
import { errorText } from '../../data/remote';
import { useStore } from '../../data/store';
import { localeTag, t } from '../../data/texts';
import { color, radius, space, text } from '../../theme/tokens';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `account/data-access` (Push aus „Dein Konto“): ob jemand aus dem Team Deine Daten abgerufen hat
 * (Daria, 27.10.2026). Gezielte Abrufe stehen einzeln da, automatische Vorgänge getrennt darunter.
 */
export default function DataAccessScreen() {
  const goBack = useGoBack();
  const { mode } = useStore();
  const [entries, setEntries] = useState<DataAccess[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'live') {
      setEntries([]);
      return;
    }
    loadMyDataAccess().then(setEntries, (error) => {
      setFailed(errorText(error));
      setEntries([]);
    });
  }, [mode]);

  const byTeam = entries?.filter((e) => e.kind === 'person') ?? [];
  const automatic = entries?.find((e) => e.kind === 'automatisch');

  return (
    <SubScreen title="Abrufe Deiner Daten" navigation="back" onLeadingPress={goBack}>
      <Text style={styles.body}>
        Hier siehst Du, ob jemand aus dem Team Deine persönlichen Daten abgerufen hat. Protokolliert wird bisher jeder Abruf Deiner privaten Chats.
      </Text>
      {/* 2 bis 3 Sätze zur Verschlüsselung (Daria, 27.10.2026) */}
      <Notice message="Geplant ist Ende-zu-Ende-Verschlüsselung für Deine Nachrichten. Dann können nur autorisierte Nutzer:innen, also Du und die Person, mit der Du schreibst, sie lesen, auch das Team nicht. Im jetzigen Stadium der App ist das noch nicht umsetzbar, deshalb steht hier jeder Abruf." />
      {failed ? <Notice variant="warning" message={t('Protokoll nicht geladen: {error}', { error: failed })} /> : null}
      <FieldGroup label="Vom Team abgerufen">
        {entries && byTeam.length === 0 ? <Text style={styles.secondary}>Niemand aus dem Team hat Deine Chats abgerufen.</Text> : null}
        {byTeam.map((e) => (
          <Entry key={e.createdAt + e.actor} entry={e} />
        ))}
      </FieldGroup>
      {automatic ? (
        <FieldGroup label="Automatisch">
          <Entry entry={automatic} />
        </FieldGroup>
      ) : null}
    </SubScreen>
  );
}

function when(iso: string): string {
  const time = new Date(iso).toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit' });
  return t('{date}, {time} Uhr', { date: formatDateLong(iso), time });
}

function Entry({ entry }: { entry: DataAccess }) {
  return (
    <View style={styles.entry}>
      <Text style={styles.label}>{when(entry.createdAt)}</Text>
      {entry.kind === 'person' ? (
        <>
          <Text style={styles.body}>{t('Chat geöffnet von {actor}', { actor: entry.actor })}</Text>
          <Text style={styles.secondary}>{t('Grund: {reason}', { reason: entry.reason })}</Text>
        </>
      ) : (
        <Text style={styles.secondary}>{entry.reason}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  entry: {
    gap: space[4],
    padding: space[12],
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
  },
  label: { ...text.caption, color: color.text.secondary },
  body: { ...text.body, color: color.text.primary },
  secondary: { ...text.body, color: color.text.secondary },
});
