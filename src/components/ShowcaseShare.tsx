import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CARD_MAILS_PER_ADDRESS, cardMailsSent } from '../data/cardMailLog';
import { localDate } from '../data/reminders';
import { sendCardMail, type CardMailResult, type Showcase } from '../data/showcase';
import { useStore } from '../data/store';
import { visibleEmail } from '../data/auth';
import { t } from '../data/texts';
import { color, radius, space, text } from '../theme/tokens';
import { Button } from './Button';
import { Notice } from './Content';
import { EMAIL_FIELD, GIVEN_NAME_FIELD, NAME_FIELD, TextField } from './Form';
import { useKeyboardHeight } from './Keyboard';
import { scrollIntoView } from './Nudge';
import { Text } from './T';
import { PlaceField } from './showcase/PlaceField';
import type { IconName } from './icons/svgs';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const MESSAGES: Record<Exclude<CardMailResult, 'ok'>, string> = {
  email: 'Bitte prüfe die Mail-Adresse.',
  name: 'Beim Vornamen gehen nur Buchstaben, höchstens 30.',
  limit: 'Für heute sind genug Mails gesendet. Probier es morgen wieder.',
  not_found: 'Die Mail geht nur, wenn Dein Schaufenster öffentlich und online ist.',
  error: 'Das hat nicht geklappt. Probier es gleich nochmal.',
};

const two = (n: number) => String(n).padStart(2, '0');

/** „heute um 14:32“ oder „morgen um 9:05“ für kommende Zeitpunkte */
function untilAt(at: number): string {
  const d = new Date(at);
  const time = `${two(d.getHours())}:${two(d.getMinutes())}`;
  return localDate(d) === localDate() ? t('heute um {zeit}', { zeit: time }) : t('morgen um {zeit}', { zeit: time });
}

/** „heute um 14:32“ oder „gestern um 23:10“ für vergangene Zeitpunkte */
function sentAt(at: number): string {
  const d = new Date(at);
  const time = `${two(d.getHours())}:${two(d.getMinutes())}`;
  return localDate(d) === localDate() ? t('heute um {zeit}', { zeit: time }) : t('gestern um {zeit}', { zeit: time });
}

/** Hinweis, wenn die Karte in den letzten 24 Stunden schon an diese Adresse ging (data/cardMailLog.ts) */
export function repeatMessage(times: number[]): string {
  const last = times[times.length - 1];
  if (times.length < CARD_MAILS_PER_ADDRESS) {
    return t('Du hast die Digitale Visitenkarte {wann} schon an diese Adresse gesendet.', { wann: sentAt(last) });
  }
  return t(
    'Du hast die Digitale Visitenkarte schon zweimal an diese Adresse gesendet, zuletzt {wann}. Mehr als zwei Mails in 24 Stunden gehen nicht an dieselbe Adresse. Ab {ab} geht es wieder.',
    { wann: sentAt(last), ab: untilAt(times[0] + 86400e3) },
  );
}

/**
 * Erst Bescheid geben, dann ein zweites Mal schicken (Daria, 2026-11-23). check() liefert beim ersten Tippen false,
 * wenn die Karte schon an diese Adresse ging, und zeigt den Hinweis. Beim zweiten Tippen auf dieselbe Adresse geht die
 * Mail raus, solange die Grenze von zwei Mails nicht erreicht ist.
 */
export function useRepeatCheck(slug: string) {
  const [repeat, setRepeat] = useState<{ to: string; times: number[] } | null>(null);
  const key = (to: string) => to.trim().toLowerCase();
  const current = (to: string) => (repeat && repeat.to === key(to) ? repeat : null);
  const check = async (to: string): Promise<boolean> => {
    const known = current(to);
    if (known) return known.times.length < CARD_MAILS_PER_ADDRESS;
    const times = await cardMailsSent(slug, to);
    if (!times.length) return true;
    setRepeat({ to: key(to), times });
    return false;
  };
  const shown = (to: string) => {
    const r = current(to);
    return r ? { message: repeatMessage(r.times), full: r.times.length >= CARD_MAILS_PER_ADDRESS } : null;
  };
  return { check, shown, clear: () => setRepeat(null) };
}

/**
 * Secondary-Button, der sich zum Formular öffnet: Adresse eintippen, KiezCoins verschickt die Digitale Visitenkarte mit dem
 * Link zur Seite über die Edge Function `visitenkarte-mail` (#408) (Daria, 2026-11-18: „Der Knopf sollte aber ne Mail
 * eintragen die wir schicken“).
 *
 * Tastatur (Daria, 2026-11-18, Bildschirmfoto): Keyboard.tsx scrollt nur das aktive Feld ins Bild, Vorname und
 * „Digitale Visitenkarte schicken“ lagen dann unter der Tastatur. Ist ein Feld des Formulars aktiv und die Tastatur offen,
 * scrollt die Seite zusätzlich so weit, dass das Formular bis zum Button zu sehen ist. Nur die Scrollfläche des
 * Screens bewegt sich, nie die Browserseite selbst, damit iOS die Tastatur nicht wieder schließt (#413).
 */
export function CardMailButton({
  showcase,
  label,
  icon,
  open: openProp,
  onOpenChange,
  team = false,
  self = false,
  intro,
}: {
  showcase: Showcase;
  label: string;
  icon?: IconName;
  /** Satz über dem Formular: was passiert (Daria, 2026-11-23) */
  intro?: string;
  /** Von außen gesteuert, z. B. in der Digitalen Visitenkarte: der Knopf klappt das Formular auf und wieder zu */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Das Team schickt im Namen des Schaufensters: kein Feld „Dein Vorname“ (Daria, 2026-11-23). Dafür dieselben Felder wie
   * „Kontakt speichern und per Mail schicken“: Name und „Wo habt Ihr Euch getroffen?“, beide für die Mail (Anrede und
   * Ort der Begegnung). Nur „Notiz für Dich“ fehlt, weil kein Kontakt gespeichert wird (UX-Regeln, „So bleiben ähnliche
   * Formulare gleich“, Daria, 2026-11-24). Gäste nennen ihren Vornamen als Absender.
   */
  team?: boolean;
  /**
   * „An mich per Mail senden“ für Fremde (Daria, 2026-11-24: „eine andere User Persona“): Die Person sendet sich die
   * Karte selbst. Ein Feld „Deine Mail-Adresse“, bei Angemeldeten aus dem Profil; kein Vorname.
   */
  self?: boolean;
}) {
  const [openState, setOpenState] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;
  const setOpen = (v: boolean) => (controlled ? onOpenChange?.(v) : setOpenState(v));
  const repeat = useRepeatCheck(showcase.slug);
  // Bei „An mich per Mail senden“ steht die eigene Adresse schon da, wenn die Person angemeldet ist
  const { profile } = useStore();
  const ownMail = self ? visibleEmail(profile.email) : '';
  // Abbrechen schließt das Formular und verwirft die Eingaben (UX-Regeln, 2026-11-23)
  const cancel = () => {
    setOpen(false);
    setTo(ownMail);
    setFrom('');
    setName('');
    setPlace('');
    setMessage('');
    setResult(null);
    repeat.clear();
  };
  const [to, setTo] = useState(ownMail);
  const [from, setFrom] = useState('');
  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
  const [message, setMessage] = useState('');
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

  const again = repeat.shown(to);

  const send = async () => {
    setResult(null);
    if (!(await repeat.check(to))) return;
    setBusy(true);
    const r = await sendCardMail(showcase.slug, to, team || self ? undefined : from, team ? { name, place, message } : undefined, self);
    setBusy(false);
    if (r === 'ok') {
      // Erfolg (Daria, 2026-11-23: „Where is success message?“): Das Formular klappt zu, die Meldung steht direkt unter
      // dem Knopf, wo der Blick gerade ist. Vorher lag sie unter dem Formular und oft außerhalb des Bildschirms.
      setResult({ ok: true, message: t('Die Digitale Visitenkarte ist unterwegs an {to}.', { to: to.trim() }) });
      repeat.clear();
      setTo(ownMail);
      setFrom('');
      setName('');
      setPlace('');
      setMessage('');
      setOpen(false);
    } else {
      setResult({ ok: false, message: t(MESSAGES[r]) });
    }
  };

  return (
    <View style={styles.wrap}>
      {controlled ? (
        <Button
          label={label}
          variant="secondary"
          icon={icon}
          onPress={() => {
            setResult(null);
            setOpen(!open);
          }}
        />
      ) : null}
      {result?.ok && !open ? <Notice message={result.message} onClose={() => setResult(null)} /> : null}
      {open ? (
        // Grauer Rahmen wie die anderen aufgeklappten Optionen der Visitenkarte (UX-Regeln, ähnliche Formulare gleich)
        <View style={[styles.form, styles.panel]}>
          {intro ? <Text style={styles.body}>{t(intro)}</Text> : null}
          {team ? (
            <TextField label="Name" value={name} onChangeText={setName} maxLength={80} helperText="Optional" autoFocus {...NAME_FIELD} {...focusProps} />
          ) : null}
          <TextField
            label={team ? 'Mail-Adresse' : self ? 'Deine Mail-Adresse' : 'An welche Adresse?'}
            value={to}
            onChangeText={setTo}
            maxLength={254}
            placeholder={team || self ? undefined : 'name@beispiel.de'}
            autoFocus={!team}
            {...EMAIL_FIELD}
            {...focusProps}
          />
          {team ? <PlaceField value={place} onChange={setPlace} /> : null}
          {/* Nachricht in der Mail wie bei „Kontakt speichern und per Mail senden“ (Daria, 2026-11-24) */}
          {team ? (
            <TextField label="Nachricht in der Mail" value={message} onChangeText={setMessage} multiline maxLength={1000} helperText="Optional" {...focusProps} />
          ) : null}
          {/* Früher „Optional, steht in der Mail.“: DeepL machte daraus „'Optional' is stated in the email.“ (Daria,
              2026-11-23). Jetzt sagt der Hinweis, wozu der Name dient. */}
          {!team && !self ? (
            <TextField
              label="Dein Vorname (optional)"
              value={from}
              onChangeText={setFrom}
              maxLength={30}
              helperText="Damit die Mail sagt, von wem sie kommt."
              {...GIVEN_NAME_FIELD}
              {...focusProps}
            />
          ) : null}
          <View ref={end} style={styles.form}>
            {/* Hinweis vor dem Knopf: Er sagt, was ein erneutes Tippen bewirkt (UX-Regeln, Daria, 2026-11-24) */}
            {again ? <Notice message={again.message} onClose={repeat.clear} /> : null}
            <Button
              label={again && !again.full ? 'Trotzdem noch mal senden' : self ? 'An mich senden' : 'Digitale Visitenkarte senden'}
              busy={busy}
              disabled={!isEmail(to) || !!again?.full}
              onPress={send}
            />
            {/* Fehler direkt unter dem Knopf, das Formular bleibt offen */}
            {result && !result.ok ? <Notice variant="warning" message={result.message} onClose={() => setResult(null)} /> : null}
          </View>
          <Button label="Abbrechen" variant="ghost" onPress={cancel} />
          <Text style={styles.meta}>KiezCoins nutzt die Adresse nur für diese eine Mail und speichert sie nicht.</Text>
        </View>
      ) : controlled ? null : (
        <Button label={label} variant="secondary" icon={icon} onPress={() => setOpen(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[16] },
  form: { gap: space[16] },
  panel: { padding: space[16], borderRadius: radius.md, backgroundColor: color.bg.surface },
  meta: { ...text.caption, color: color.text.secondary },
  body: { ...text.body, color: color.text.primary },
});
