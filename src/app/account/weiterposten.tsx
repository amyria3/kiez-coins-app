import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '../../components/Button';
import { FieldGroup, Notice } from '../../components/Content';
import { TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { Text } from '../../components/T';
import {
  connectCrosspost,
  CROSSPOST_PLATFORMS,
  disconnectCrosspost,
  isLivePlatform,
  loadCrosspostAccounts,
  useCrosspostInterest,
  type CrosspostAccount,
  type LivePlatform,
} from '../../data/crosspost';
import { errorText } from '../../data/remote';
import { t } from '../../data/texts';
import { useGoBack } from '../../lib/goBack';
import { color, radius, space, stroke, text } from '../../theme/tokens';

const HOW_TO: Record<LivePlatform, string> = {
  bluesky:
    '1. In BlueSky: Einstellungen › Datenschutz und Sicherheit › App-Passwörter › App-Passwort hinzufügen. Name zum Beispiel „KiezCoins“.\n' +
    '2. Das angezeigte App-Passwort kopieren (vier Blöcke, z. B. abcd-efgh-ijkl-mnop). Dein normales Passwort brauchst Du hier nicht.\n' +
    '3. Handle und App-Passwort unten eintragen.',
  mastodon:
    '1. In Mastodon: Einstellungen › Entwicklung › Neue Anwendung. Name „KiezCoins“.\n' +
    '2. Bei den Befugnissen nur diese drei anhaken: profile, write:media und write:statuses. Alles andere abwählen, auch read und write.\n' +
    '3. Speichern, die Anwendung öffnen und „Dein Zugangs-Token“ kopieren. Client-Schlüssel und Client-Geheimnis brauchst Du nicht.\n' +
    '4. Hast Du die Befugnisse nachträglich geändert, das Zugangs-Token neu erzeugen.\n' +
    '5. Instanz und Zugangs-Token unten eintragen. Die Instanz ist der Server Deines Kontos: Deine vollständige Adresse steht auf Deinem Profil unter dem Namen, z. B. @kiezkatz@mastodon.social. Die Instanz ist der Teil nach dem zweiten @, also mastodon.social.',
};

/**
 * Route `account/weiterposten`: Verbundene Konten fürs Weiterposten (Daria, 05.11.2026).
 * BlueSky mit Handle und App-Passwort, Mastodon mit Instanz und Zugangs-Token. Meta und X kommen später.
 */
export default function CrosspostAccounts() {
  const goBack = useGoBack();
  const [accounts, setAccounts] = useState<CrosspostAccount[]>([]);
  const [counted, count] = useCrosspostInterest();

  const reload = useCallback(() => {
    loadCrosspostAccounts().then(setAccounts);
  }, []);
  useEffect(reload, [reload]);

  return (
    <SubScreen title="Verbundene Konten" navigation="back" onLeadingPress={goBack}>
      <Notice message="Weiterposten teilt Deine öffentlichen Posts mit Foto und Link zu KiezCoins. Private Posts und Gruppen bleiben immer in der App." />
      <FieldGroup label="Kostenlos">
        {CROSSPOST_PLATFORMS.filter((p) => isLivePlatform(p.key)).map((p) => (
          <PlatformCard
            key={p.key}
            platform={p.key as LivePlatform}
            label={p.label}
            account={accounts.find((a) => a.platform === p.key)}
            onChange={reload}
          />
        ))}
      </FieldGroup>
      <FieldGroup label="Kommt bald">
        <View style={styles.card}>
          <Text style={styles.body}>Instagram, Facebook und X</Text>
          {counted ? (
            <Text style={styles.thanks}>Danke! Wir zählen Dich mit.</Text>
          ) : (
            <Button label="Ich würde diese Funktion für Meta & X nutzen" variant="secondary" onPress={count} />
          )}
        </View>
      </FieldGroup>
    </SubScreen>
  );
}

function PlatformCard({
  platform,
  label,
  account,
  onChange,
}: {
  platform: LivePlatform;
  label: string;
  account?: CrosspostAccount;
  onChange: () => void;
}) {
  const [first, setFirst] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const connect = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await connectCrosspost(platform, platform === 'bluesky' ? { handle: first, password: secret } : { instance: first.trim().replace(/^.*@/, ''), token: secret });
      setFirst('');
      setSecret('');
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () =>
    Alert.alert(t('{label} trennen?', { label }), 'Deine bisherigen Weiterposts bleiben dort stehen.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Trennen',
        style: 'destructive',
        onPress: () =>
          disconnectCrosspost(platform)
            .then(onChange)
            .catch((e) => Alert.alert('Hat nicht geklappt', errorText(e))),
      },
    ]);

  if (account) {
    return (
      <View style={[styles.card, styles.row]}>
        <View style={styles.flex}>
          <Text noTranslate style={styles.title}>{label}</Text>
          <Text noTranslate style={styles.caption}>{account.handle}</Text>
        </View>
        <Button label="Trennen" variant="ghost" onPress={disconnect} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text noTranslate style={styles.title}>{label}</Text>
      <Text style={styles.caption}>{HOW_TO[platform]}</Text>
      <TextField
        label={platform === 'bluesky' ? 'Handle' : 'Instanz'}
        placeholder={platform === 'bluesky' ? 'name.bsky.social' : 'mastodon.social'}
        value={first}
        onChangeText={setFirst}
        helperText={
          platform === 'bluesky'
            ? 'Steht in BlueSky auf Deinem Profil unter dem Namen. Ohne @, z. B. kiezkatz.bsky.social'
            : 'Teil Deiner Adresse nach dem zweiten @, ohne https://, z. B. mastodon.social'
        }
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextField
        label={platform === 'bluesky' ? 'App-Passwort' : 'Zugangs-Token'}
        helperText={platform === 'bluesky' ? 'Nicht Dein normales Passwort' : '„Dein Zugangs-Token“ aus der Anwendung'}
        value={secret}
        onChangeText={setSecret}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        error={error}
      />
      <Button
        busy={busy}
        label={busy ? 'Wird geprüft …' : 'Verbinden'}
        onPress={connect}
        disabled={busy || !first.trim() || !secret.trim()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[12],
    padding: space[16],
    borderRadius: radius.lg,
    borderWidth: stroke.thin,
    borderColor: color.line.raised,
    backgroundColor: color.bg.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1, gap: space[2] },
  title: { ...text.title, color: color.text.primary },
  body: { ...text.body, color: color.text.primary },
  caption: { ...text.caption, color: color.text.secondary },
  thanks: { ...text.body, color: color.accent.confirmation, textAlign: 'center' },
});
