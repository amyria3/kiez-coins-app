import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';

import { cardActions, cardActionTemplate, type CardOrigin, type CardViewer } from '../../data/cardActions.mjs';
import { visibleEmail } from '../../data/auth';
import { WEB_APP_URL } from '../../data/groups';
import { sendCardMail, showcasePublicLink, type Showcase } from '../../data/showcase';
import { countShowcaseVisit, sendContactToShowcase, type ContactResult } from '../../data/showcaseCard';
import { useStore } from '../../data/store';
import { t } from '../../data/texts';
import { showcaseVcard } from '../../data/vcard.mjs';
import { contactFileName, contactVcard } from '../../lib/contactCard';
import { saveVcard } from '../../lib/saveVcard';
import { shareLink } from '../../lib/share';
import { color, radius, space, text } from '../../theme/tokens';
import { Button } from '../Button';
import { Notice, QuestionHint } from '../Content';
import { CheckOption, EMAIL_FIELD, NAME_FIELD, PHONE_FIELD, TextField } from '../Form';
import { InviteQr } from '../InviteQr';
import { scrollIntoView } from '../Nudge';
import { CardMailButton, useRepeatCheck } from '../ShowcaseShare';
import { PlaceField } from './PlaceField';
import { Text } from '../T';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

type Panel = 'saveContact' | 'message' | 'addContact' | 'qr' | 'mail' | 'mailSelf';

type Props = {
  showcase: Showcase;
  viewer: CardViewer;
  origin: CardOrigin;
  canBefriend?: boolean;
  following?: boolean;
  /** Folgen und Anfreunden laufen gerade */
  busy?: boolean;
  onFollow?: () => void;
  onBefriend?: () => void;
  onShowcase?: () => void;
};

/**
 * Weiterleitungsoptionen der Digitalen Visitenkarte (2026-11-23), für Team, Mitglieder und Gäste. Welche Knöpfe in
 * welcher Reihenfolge erscheinen, entscheidet src/data/cardActions.mjs. Gäste sehen dieselbe Komponente unter
 * app.kiezcoins.de/s/<kurzname>/visitenkarte; kiezcoins.de/s/<kurzname>/visitenkarte leitet dorthin (Daria,
 * 2026-11-23: eine Komponente statt zweier Fassungen). Ist eine Option aufgeklappt, tritt der Hauptknopf als
 * Secondary-Knopf zurück.
 */
export function CardActions({ showcase: s, viewer, origin, canBefriend, following, busy, onFollow, onBefriend, onShowcase }: Props) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [copied, setCopied] = useState(false);
  const hasContactMail = isEmail(s.email ?? '');
  const actions = cardActions({ viewer, origin, hasContactMail, canBefriend, following });
  const link = `${showcasePublicLink(s.slug)}/visitenkarte`;
  // Der QR-Code führt zur Ansicht mit Kennung der Begegnung: Wer ihn scannt, hat das Team getroffen
  const codeLink = `${link}?via=karte`;
  const label = (id: (typeof actions)[number]['id']) => t(cardActionTemplate(id, { viewer, origin }), { name: s.name });
  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
  const close = () => setPanel(null);
  // Aufgeklapptes ganz ins Bild holen (UX-Regeln, 2026-11-23): den QR-Code bis zum unteren Rand, Formulare ab ihrem Anfang
  const panelRef = useRef<View>(null);
  useEffect(() => {
    if (!panel) return;
    const timer = setTimeout(() => scrollIntoView(panelRef.current, panel === 'qr' ? 'end' : 'start'), 80);
    return () => clearTimeout(timer);
  }, [panel]);

  const copy = async () => {
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={styles.list}>
      {actions.map(({ id, primary }) => {
        const variant = primary && !panel ? 'primary' : 'secondary';
        switch (id) {
          case 'share':
            return (
              <Button
                key={id}
                label={label(id)}
                variant={variant}
                onPress={() => shareLink({ title: t('Digitale Visitenkarte von {name}', { name: s.name }), text: t('Digitale Visitenkarte von {name}', { name: s.name }), url: link })}
              />
            );
          case 'copyLink':
            return <Button key={id} label={copied ? 'Link kopiert' : label(id)} variant={variant} icon={copied ? 'check' : undefined} onPress={copy} />;
          case 'saveContact':
            // Im Browser fragt ein Formular nach Notiz und, nach dem QR-Code der Karte, nach dem Ort der Begegnung; die
            // vCard entsteht auf dem Gerät. In der App auf dem Handy liefert kiezcoins.de die vCard ohne Notiz.
            // iPhone und Android bieten „Neuer Kontakt“ an; beides zählt beim Team als gespeichert.
            if (Platform.OS !== 'web') {
              return (
                <Button
                  key={id}
                  label={label(id)}
                  variant={variant}
                  onPress={() => Linking.openURL(`${showcasePublicLink(s.slug)}/kontakt.vcf`).catch(() => {})}
                />
              );
            }
            return (
              <View key={id} style={styles.item}>
                <Button label={label(id)} variant={variant} onPress={() => toggle(id)} />
                {panel === id ? (
                  <View ref={panelRef} collapsable={false}>
                    <SaveContact showcase={s} met={origin === 'card' && viewer !== 'team'} onCancel={close} />
                  </View>
                ) : null}
              </View>
            );
          case 'message':
            return (
              <View key={id} style={styles.item}>
                <Button label={label(id)} variant={variant} onPress={() => toggle(id)} />
                {panel === id ? (
                  <View ref={panelRef} collapsable={false}>
                    <MessageForm showcase={s} met={origin === 'card'} onCancel={close} />
                  </View>
                ) : null}
              </View>
            );
          case 'addContact':
            return (
              <View key={id} style={styles.item}>
                <Button label={label(id)} variant={variant} onPress={() => toggle(id)} />
                {panel === id ? (
                  <View ref={panelRef} collapsable={false}>
                    <ManualContact showcase={s} onCancel={close} />
                  </View>
                ) : null}
              </View>
            );
          case 'qr':
            return (
              <View key={id} style={styles.item}>
                <Button label={label(id)} variant={variant} onPress={() => toggle(id)} />
                {panel === id ? (
                  <View ref={panelRef} collapsable={false} style={styles.panel}>
                    <Text style={styles.body}>
                      {viewer === 'team' && hasContactMail
                        ? t('Die andere Person scannt den QR-Code mit der Kamera. Sie speichert Eure Digitale Visitenkarte und kann Euch ihren Kontakt senden.')
                        : t('Mit der Kamera scannen, um die Digitale Visitenkarte zu öffnen.')}
                    </Text>
                    <InviteQr value={codeLink} label={t('QR-Code zur Digitalen Visitenkarte')} />
                    <Button label="Schließen" variant="ghost" onPress={close} />
                  </View>
                ) : null}
              </View>
            );
          case 'mail':
          case 'mailSelf':
            return (
              <View key={id} ref={panel === id ? panelRef : undefined} collapsable={false}>
                <CardMailButton
                  showcase={s}
                  label={label(id)}
                  intro={id === 'mail' ? 'Sendet Eure Digitale Visitenkarte per Mail an die Adresse, die Du einträgst. Auf diesem Handy wird kein Kontakt gespeichert.' : undefined}
                  open={panel === id}
                  onOpenChange={(o) => setPanel(o ? id : null)}
                  team={id === 'mail'}
                  self={id === 'mailSelf'}
                />
              </View>
            );
          case 'follow':
            return <Button key={id} label={label(id)} variant={variant} busy={busy} onPress={onFollow} />;
          case 'befriend':
            return <Button key={id} label={label(id)} variant={variant} busy={busy} onPress={onBefriend} />;
          case 'showcase':
            return <Button key={id} label={label(id)} variant={variant} onPress={onShowcase} />;
          default:
            return null;
        }
      })}
    </View>
  );
}

const CONTACT_MESSAGES: Record<Exclude<ContactResult, 'ok' | 'card_failed'>, string> = {
  email: 'Bitte prüfe die Mail-Adresse.',
  name: 'Bitte trage Deinen Namen ein.',
  phone: 'Bitte prüfe die Telefonnummer.',
  consent: 'Bitte bestätige die Einwilligung.',
  limit: 'Für heute sind genug Nachrichten gesendet. Probier es morgen wieder.',
  no_contact: 'Dieses Schaufenster hat keine Kontakt-Mail.',
  error: 'Das hat nicht geklappt. Probier es gleich nochmal.',
};

/**
 * „Nachricht oder Frage senden“ (Daria, 2026-11-24), ersetzt „Deinen Kontakt senden“ und „Kontakte tauschen“: Die
 * Nachricht geht mit Name und Mail-Adresse an die Kontakt-Mail des Schaufensters, „Antworten“ geht an die Person.
 * Die Person bekommt eine Kopie ihrer Nachricht mit der Digitalen Visitenkarte. Die Mail-Adresse ist Pflicht, sonst
 * kann das Schaufenster nicht antworten (Daria, 2026-11-24). Angemeldete finden Name und Mail aus dem Profil vor.
 * Nach dem QR-Code der Karte fragt das Formular zusätzlich nach dem Ort der Begegnung.
 */
function MessageForm({ showcase: s, met, onCancel }: { showcase: Showcase; met: boolean; onCancel: () => void }) {
  const router = useRouter();
  const { profile } = useStore();
  const [name, setName] = useState(profile.handle ?? '');
  const [email, setEmail] = useState(visibleEmail(profile.email));
  const [phone, setPhone] = useState('');
  const [place, setPlace] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const send = async () => {
    setBusy(true);
    setResult(null);
    const r = await sendContactToShowcase(s.slug, { name, email, phone, place, message, sendCard: true });
    setBusy(false);
    if (r === 'ok' || r === 'card_failed') {
      const done = t('{name} hat Deine Nachricht erhalten.', { name: s.name });
      setResult({
        ok: true,
        message:
          r === 'card_failed'
            ? `${done} ${t('Die Kopie konnte nicht gesendet werden.')}`
            : `${done} ${t('Eine Kopie mit der Digitalen Visitenkarte ist unterwegs an {to}.', { to: email.trim() })}`,
      });
      setPhone('');
      setPlace('');
      setMessage('');
      setConsent(false);
    } else {
      setResult({ ok: false, message: t(CONTACT_MESSAGES[r]) });
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.body}>{t('{name} erhält Deine Nachricht per Mail und kann Dir antworten. Du erhältst eine Kopie mit der Digitalen Visitenkarte.', { name: s.name })}</Text>
      <TextField label="Name" value={name} onChangeText={setName} maxLength={80} autoFocus {...NAME_FIELD} />
      <TextField label="Mail-Adresse" value={email} onChangeText={setEmail} maxLength={254} {...EMAIL_FIELD} />
      <TextField label="Telefon" value={phone} onChangeText={setPhone} maxLength={30} helperText="Optional" {...PHONE_FIELD} />
      {met ? <PlaceField value={place} onChange={setPlace} /> : null}
      <TextField label="Nachricht oder Frage" value={message} onChangeText={setMessage} multiline maxLength={1000} />
      <CheckOption label={t('Ich willige ein, dass {name} meine Angaben erhält.', { name: s.name })} selected={consent} onPress={() => setConsent(!consent)} />
      <Pressable accessibilityRole="link" onPress={() => router.push('/legal/datenschutz')} hitSlop={8}>
        <Text style={styles.link}>{t('Datenschutz lesen')}</Text>
      </Pressable>
      <Button label="Nachricht senden" busy={busy} disabled={!name.trim() || !isEmail(email) || !message.trim() || !consent} onPress={send} />
      {/* Rückmeldung direkt unter dem Knopf (UX-Regeln) */}
      {result ? <Notice variant={result.ok ? undefined : 'warning'} message={result.message} onClose={() => setResult(null)} /> : null}
      <Button label="Abbrechen" variant="ghost" onPress={onCancel} />
      <QuestionHint
        question={t('Was passiert mit meinen Angaben?')}
        answer={t('KiezCoins sendet sie per Mail an {name} und speichert sie nicht.', { name: s.name })}
      />
    </View>
  );
}

/**
 * „Kontakt speichern und per Mail schicken“ fürs Team (2026-11-23, bis dahin „Kontakt von Hand eintragen“): Die Person steht vor einem, hat aber kein Handy zur Hand.
 * Es entsteht eine vCard auf dem Gerät, auf Wunsch geht die Digitale Visitenkarte per Mail an die Person. KiezCoins speichert
 * den Kontakt nicht. Die vCard entsteht im Browser; in der Android-App öffnet der Knopf dieselbe Seite im Browser.
 * Wessen Kontakt gemeint ist, sagt ein Satz oben und die Frage unten (Daria, 2026-11-23: „wessen Kontakt?“).
 */
function ManualContact({ showcase, onCancel }: { showcase: Showcase; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [place, setPlace] = useState('');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [sendCard, setSendCard] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const first = name.trim().split(/\s+/)[0] ?? '';
  // Ging die Karte schon an diese Adresse? Erst Hinweis, beim zweiten Tippen senden (Daria, 2026-11-23)
  const repeat = useRepeatCheck(showcase.slug);
  const again = sendCard && isEmail(email) ? repeat.shown(email) : null;
  const mailNow = sendCard && isEmail(email) && !again?.full;

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.panel}>
        <Button
          label="Im Browser öffnen"
          variant="secondary"
          iconEnd="external"
          onPress={() => Linking.openURL(`${WEB_APP_URL}/schaufenster/${showcase.id}/visitenkarte`).catch(() => {})}
        />
        <Button label="Abbrechen" variant="ghost" onPress={onCancel} />
      </View>
    );
  }

  const save = async () => {
    setResult(null);
    if (mailNow && !(await repeat.check(email))) return;
    setBusy(true);
    // Kontakt ins eigene Adressbuch: Datei herunterladen, iPhone und Android bieten „Neuer Kontakt“ an
    saveVcard(contactVcard({ name, email, place, note }), contactFileName(name));
    let message = t('Der Kontakt ist gespeichert.');
    let ok = true;
    if (mailNow) {
      // Name und Ort auch in die Mail: Anrede und Ort der Begegnung, wie bei „Nur per Mail schicken“ (2026-11-24)
      const r = await sendCardMail(showcase.slug, email, undefined, { name, place, message });
      ok = r === 'ok';
      message = ok
        ? t('Der Kontakt ist gespeichert. Die Digitale Visitenkarte ist unterwegs an {to}.', { to: email.trim() })
        : t('Der Kontakt ist gespeichert. Die Digitale Visitenkarte konnte nicht gesendet werden.');
    }
    setBusy(false);
    setResult({ ok, message });
    if (ok) {
      repeat.clear();
      setName('');
      setEmail('');
      setPlace('');
      setMessage('');
      setNote('');
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.body}>{t('Speichert den Kontakt der Person auf diesem Handy und sendet ihr Eure Digitale Visitenkarte per Mail. Gut, wenn jemand ohne Handy vor Dir steht.')}</Text>
      <TextField label="Name" value={name} onChangeText={setName} maxLength={80} autoFocus {...NAME_FIELD} />
      <TextField label="Mail-Adresse" value={email} onChangeText={setEmail} maxLength={254} {...EMAIL_FIELD} />
      <PlaceField value={place} onChange={setPlace} />
      {/* Nachricht in der Mail an die Person, die Notiz bleibt nur im eigenen Adressbuch (Daria, 2026-11-24) */}
      {mailNow ? <TextField label="Nachricht in der Mail" value={message} onChangeText={setMessage} multiline maxLength={1000} helperText="Optional" /> : null}
      <TextField label="Notiz für Dich" value={note} onChangeText={setNote} multiline maxLength={500} helperText="Optional" />
      {isEmail(email) ? (
        <CheckOption
          label={first ? t('Digitale Visitenkarte per Mail an {name} senden', { name: first }) : t('Digitale Visitenkarte per Mail senden')}
          selected={sendCard}
          onPress={() => setSendCard(!sendCard)}
        />
      ) : null}
      {/* Hinweis vor dem Knopf (UX-Regeln, Daria, 2026-11-24) */}
      {again ? <Notice message={again.message} onClose={repeat.clear} /> : null}
      <Button
        label={!mailNow ? 'Kontakt speichern' : again ? 'Speichern und trotzdem noch mal senden' : 'Speichern und Digitale Visitenkarte senden'}
        busy={busy}
        disabled={!name.trim() || (!!email.trim() && !isEmail(email))}
        onPress={save}
      />
      <Button label="Abbrechen" variant="ghost" onPress={onCancel} />
      <QuestionHint
        question={t('Wo landet der Kontakt, den ich hier eintrage?')}
        answer={t(
          'In Deinem Adressbuch: Dein Handy bietet an, die Person mit Name, Mail-Adresse, Treffpunkt und Notiz als neuen Kontakt anzulegen. KiezCoins speichert davon nichts. Die Mail-Adresse braucht KiezCoins nur, um ihr die Digitale Visitenkarte zu senden.',
        )}
      />
      {result ? <Notice variant={result.ok ? undefined : 'warning'} message={result.message} onClose={() => setResult(null)} /> : null}
    </View>
  );
}

/**
 * „In Kontakte speichern“ im Browser (2026-11-23): Notiz und, nach dem QR-Code der Karte, der Ort der Begegnung kommen
 * in die vCard des Schaufensters (data/vcard.mjs). Die Datei entsteht auf dem Gerät, KiezCoins speichert nichts davon.
 */
function SaveContact({ showcase: s, met, onCancel }: { showcase: Showcase; met: boolean; onCancel: () => void }) {
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);

  const save = () => {
    saveVcard(showcaseVcard(s, { place, note }), `${s.slug}.vcf`);
    countShowcaseVisit(s.slug, 'save');
    setDone(true);
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.body}>{t(met ? 'Ort und Notiz werden im Kontakt gespeichert.' : 'Die Notiz wird im Kontakt gespeichert.')}</Text>
      {met ? <PlaceField value={place} onChange={setPlace} autoFocus /> : null}
      <TextField label="Notiz für Dich" value={note} onChangeText={setNote} multiline maxLength={500} helperText="Optional" autoFocus={!met} />
      <Button label="Kontakt sichern" onPress={save} />
      <Button label="Abbrechen" variant="ghost" onPress={onCancel} />
      <Text style={styles.meta}>
        {t(met ? 'Das Datum wird automatisch ergänzt. Ort und Notiz stehen nur in Deinem Adressbuch.' : 'Das Datum wird automatisch ergänzt. Die Notiz steht nur in Deinem Adressbuch.')}
      </Text>
      {done ? <Notice message={t('Dein Handy bietet jetzt an, {name} als neuen Kontakt anzulegen.', { name: s.name })} onClose={() => setDone(false)} /> : null}
    </View>
  );
}


const styles = StyleSheet.create({
  list: { gap: space[12] },
  item: { gap: space[12] },
  panel: { gap: space[16], padding: space[16], borderRadius: radius.md, backgroundColor: color.bg.surface },
  body: { ...text.body, color: color.text.primary },
  link: { ...text.caption, color: color.text.primary, textDecorationLine: 'underline' },
  meta: { ...text.caption, color: color.text.secondary },
});
