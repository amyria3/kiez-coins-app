import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { sendCardMail, type CardMailResult, type Showcase } from '../data/showcase';
import { t } from '../data/texts';
import { color, space, text } from '../theme/tokens';
import { Button } from './Button';
import { Notice } from './Content';
import { TextField } from './Form';
import { useKeyboardHeight } from './Keyboard';
import { scrollIntoView } from './Nudge';
import { Text } from './T';
import type { IconName } from './icons/svgs';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const MESSAGES: Record<Exclude<CardMailResult, 'ok'>, string> = {
  email: 'Bitte prüfe die Mail-Adresse.',
  name: 'Beim Vornamen gehen nur Buchstaben, höchstens 30.',
  limit: 'Für heute sind genug Mails verschickt. Probier es morgen wieder.',
  not_found: 'Die Mail geht nur, wenn Dein Schaufenster öffentlich und online ist.',
  error: 'Das hat nicht geklappt. Probier es gleich nochmal.',
};

/**
 * Secondary-Button, der sich zum Formular öffnet: Adresse eintippen, KiezCoins verschickt die Visitenkarte mit dem
 * Link zur Seite über die Edge Function `visitenkarte-mail` (#408) (Daria, 2026-11-18: „Der Knopf sollte aber ne Mail
 * eintragen die wir schicken“).
 *
 * Tastatur (Daria, 2026-11-18, Bildschirmfoto): Keyboard.tsx scrollt nur das aktive Feld ins Bild, Vorname und
 * „Visitenkarte schicken“ lagen dann unter der Tastatur. Ist ein Feld des Formulars aktiv und die Tastatur offen,
 * scrollt die Seite zusätzlich so weit, dass das Formular bis zum Button zu sehen ist. Nur die Scrollfläche des
 * Screens bewegt sich, nie die Browserseite selbst, damit iOS die Tastatur nicht wieder schließt (#413).
 */
export function CardMailButton({
  showcase,
  label,
  icon,
  open: openProp,
  onOpenChange,
}: {
  showcase: Showcase;
  label: string;
  icon?: IconName;
  /** Von außen gesteuert, z. B. in der Visitenkarte: der Knopf klappt das Formular auf und wieder zu */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;
  const setOpen = (v: boolean) => (controlled ? onOpenChange?.(v) : setOpenState(v));
  const [to, setTo] = useState('');
  const [from, setFrom] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [focused, setFocused] = useState(false);
  const keyboard = useKeyboardHeight();
  const end = useRef<View>(null);

  useEffect(() => {
    if (!focused || !keyboard) return;
    // Nach dem Scrollen von Keyboard.tsx zum aktiven Feld, sonst überschreibt es dieses
    const timer = setTimeout(() => scrollIntoView(end.current, 'end'), 250);
    return () => clearTimeout(timer);
  }, [focused, keyboard]);
  const focusProps = { onFocus: () => setFocused(true), onBlur: () => setFocused(false) };

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
      {controlled ? <Button label={label} variant="secondary" icon={icon} onPress={() => setOpen(!open)} /> : null}
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
            {...focusProps}
          />
          <TextField
            label="Dein Vorname"
            value={from}
            onChangeText={setFrom}
            maxLength={30}
            helperText="Optional, steht in der Mail."
            {...focusProps}
          />
          <View ref={end}>
            <Button label="Visitenkarte schicken" busy={busy} disabled={!isEmail(to)} onPress={send} />
          </View>
          <Text style={styles.meta}>KiezCoins nutzt die Adresse nur für diese eine Mail und speichert sie nicht.</Text>
        </View>
      ) : controlled ? null : (
        <Button label={label} variant="secondary" icon={icon} onPress={() => setOpen(true)} />
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
