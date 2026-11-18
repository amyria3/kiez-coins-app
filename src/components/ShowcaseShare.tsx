import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { sendCardMail, showcasePublicLink, type CardMailResult, type Showcase } from '../data/showcase';
import { t } from '../data/texts';
import { color, space, text } from '../theme/tokens';
import { Button } from './Button';
import { Notice } from './Content';
import { TextField } from './Form';
import { InviteQr } from './InviteQr';
import { Text } from './T';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const MESSAGES: Record<Exclude<CardMailResult, 'ok'>, string> = {
  email: 'Bitte prüfe die Mail-Adresse.',
  name: 'Beim Vornamen gehen nur Buchstaben, höchstens 30.',
  limit: 'Für heute sind genug Mails verschickt. Probier es morgen wieder.',
  not_found: 'Die Mail geht nur, wenn Dein Schaufenster öffentlich und online ist.',
  error: 'Das hat nicht geklappt. Probier es gleich nochmal.',
};

/**
 * Teilen auf der Verwaltungsseite (Daria, 2026-11-17: „auch hier schon den Code zum Teilen und Freundschaftseinladung
 * per Mail zeigen“). Dieselben Bausteine wie auf der öffentlichen Seite (#408): Instant-Code zur Seite und Visitenkarte
 * per Mail über die Edge Function `visitenkarte-mail`. Auf der Seite kann man sich mit einem Tipp anfreunden, wenn
 * der Schalter in „Bearbeiten“ an ist. Nur bei „Alle“ und online, sonst gibt es die Seite im Web nicht.
 */
export function ShowcaseShare({ showcase }: { showcase: Showcase }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [from, setFrom] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const send = async () => {
    setBusy(true);
    setResult(null);
    const r = await sendCardMail(showcase.slug, to, from);
    setBusy(false);
    if (r === 'ok') {
      setResult({ ok: true, message: t('Die Visitenkarte ist unterwegs an {to}.', { to: to.trim() }) });
      setTo('');
    } else {
      setResult({ ok: false, message: t(MESSAGES[r]) });
    }
  };

  return (
    <View style={styles.wrap}>
      <InviteQr value={showcasePublicLink(showcase.slug)} label={t('Instant-Code zu Deiner Seite')} />
      <Text style={styles.meta}>Wer den Instant-Code scannt, landet auf Deiner Seite und kann Dir folgen oder sich mit Dir anfreunden.</Text>
      {open ? (
        <View style={styles.form}>
          <TextField
            label="An welche Adresse?"
            value={to}
            onChangeText={setTo}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={254}
            placeholder="name@beispiel.de"
          />
          <TextField label="Dein Vorname" value={from} onChangeText={setFrom} maxLength={30} helperText="Optional, steht in der Mail." />
          <Button label="Visitenkarte schicken" busy={busy} disabled={!isEmail(to)} onPress={send} />
          <Text style={styles.meta}>KiezKoins nutzt die Adresse nur für diese eine Mail und speichert sie nicht.</Text>
        </View>
      ) : (
        // Die Mail lädt zum Schaufenster in der App ein. Ohne Icon (Daria, 2026-11-18)
        <Button label="Einladung zum App-Schaufenster" variant="secondary" onPress={() => setOpen(true)} />
      )}
      {result ? <Notice variant={result.ok ? undefined : 'warning'} message={result.message} onClose={() => setResult(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[16] },
  form: { gap: space[16] },
  meta: { ...text.caption, color: color.text.secondary },
});
