import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';

import { cardActions, cardActionTemplate, type CardOrigin, type CardViewer } from '../../data/cardActions.mjs';
import { WEB_APP_URL } from '../../data/groups';
import { sendCardMail, showcasePublicLink, type Showcase } from '../../data/showcase';
import { sendContactToShowcase, type ContactResult } from '../../data/showcaseCard';
import { useStore } from '../../data/store';
import { t } from '../../data/texts';
import { contactFileName, contactVcard } from '../../lib/contactCard';
import { shareLink } from '../../lib/share';
import { color, radius, space, text } from '../../theme/tokens';
import { Button } from '../Button';
import { Notice, QuestionHint } from '../Content';
import { CheckOption, EMAIL_FIELD, NAME_FIELD, TextField } from '../Form';
import { InviteQr } from '../InviteQr';
import { scrollIntoView } from '../Nudge';
import { CardMailButton } from '../ShowcaseShare';
import { Text } from '../T';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

type Panel = 'sendContact' | 'exchange' | 'addContact' | 'qr' | 'mail';

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
 * Weiterleitungsoptionen der Digitalen Visitenkarte in der App (2026-11-23). Welche Knöpfe in welcher Reihenfolge
 * erscheinen, entscheidet src/data/cardActions.mjs, dieselbe Regel wie auf kiezcoins.de/s/<kurzname>/visitenkarte.
 * Ist eine Option aufgeklappt, tritt der Hauptknopf als Secondary-Knopf zurück, wie auf der Webseite.
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
            // vCard von kiezcoins.de: iPhone und Android bieten „Neuer Kontakt“ an; der Abruf zählt beim Team als gespeichert
            return (
              <Button
                key={id}
                label={label(id)}
                variant={variant}
                onPress={() => Linking.openURL(`${showcasePublicLink(s.slug)}/kontakt.vcf`).catch(() => {})}
              />
            );
          case 'sendContact':
          case 'exchange':
            return (
              <View key={id} style={styles.item}>
                <Button label={label(id)} variant={variant} onPress={() => toggle(id)} />
                {panel === id ? (
                  <View ref={panelRef} collapsable={false}>
                    <ContactForm showcase={s} exchange={id === 'exchange'} onCancel={close} />
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
                        ? t('Die andere Person scannt den QR-Code mit der Kamera. Sie speichert Eure Digitale Visitenkarte und kann Euch ihren Kontakt schicken.')
                        : t('Mit der Kamera scannen, um die Digitale Visitenkarte zu öffnen.')}
                    </Text>
                    <InviteQr value={codeLink} label={t('QR-Code zur Digitalen Visitenkarte')} />
                    <Button label="Schließen" variant="ghost" onPress={close} />
                  </View>
                ) : null}
              </View>
            );
          case 'mail':
            return (
              <View key={id} ref={panel === 'mail' ? panelRef : undefined} collapsable={false}>
                <CardMailButton
                  showcase={s}
                  label={label(id)}
                  open={panel === 'mail'}
                  onOpenChange={(o) => setPanel(o ? 'mail' : null)}
                  askName={viewer !== 'team'}
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
  consent: 'Bitte bestätige die Einwilligung.',
  limit: 'Für heute sind genug Kontakte verschickt. Probier es morgen wieder.',
  no_contact: 'Dieses Schaufenster hat keine Kontakt-Mail.',
  error: 'Das hat nicht geklappt. Probier es gleich nochmal.',
};

/**
 * „Deinen Kontakt schicken“ und „Kontakte tauschen“ für Mitglieder (2026-11-23): Name und Mail kommen aus dem Profil
 * und lassen sich ändern. Beim Tausch kommt die Digitale Visitenkarte immer per Mail zurück, beim Schicken nur auf Wunsch.
 */
function ContactForm({ showcase: s, exchange, onCancel }: { showcase: Showcase; exchange: boolean; onCancel: () => void }) {
  const router = useRouter();
  const { profile } = useStore();
  const [name, setName] = useState(profile.handle ?? '');
  const [email, setEmail] = useState(profile.email ?? '');
  const [place, setPlace] = useState('');
  const [message, setMessage] = useState('');
  const [sendCard, setSendCard] = useState(true);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const send = async () => {
    setBusy(true);
    setResult(null);
    const withCard = exchange || sendCard;
    const r = await sendContactToShowcase(s.slug, { name, email, place, message: exchange ? '' : message, sendCard: withCard });
    setBusy(false);
    if (r === 'ok' || r === 'card_failed') {
      const done = t('{name} hat Deinen Kontakt erhalten.', { name: s.name });
      setResult({
        ok: true,
        message:
          r === 'card_failed'
            ? `${done} ${t('Die Digitale Visitenkarte konnte nicht verschickt werden.')}`
            : withCard
              ? `${done} ${t('Die Digitale Visitenkarte ist unterwegs an {to}.', { to: email.trim() })}`
              : done,
      });
      setPlace('');
      setMessage('');
      setConsent(false);
    } else {
      setResult({ ok: false, message: t(CONTACT_MESSAGES[r]) });
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.body}>
        {exchange
          ? t('Du erhältst den Kontakt von {name}, {name} erhält Deinen Kontakt.', { name: s.name })
          : t('{name} erhält Deine Kontaktdaten per Mail.', { name: s.name })}
      </Text>
      <TextField label="Name" value={name} onChangeText={setName} maxLength={80} autoFocus {...NAME_FIELD} />
      <TextField label="Mail-Adresse" value={email} onChangeText={setEmail} maxLength={254} {...EMAIL_FIELD} />
      <TextField label="Wo habt Ihr Euch getroffen?" value={place} onChangeText={setPlace} maxLength={120} helperText="Optional" />
      {exchange ? null : <TextField label="Nachricht" value={message} onChangeText={setMessage} multiline maxLength={1000} helperText="Optional" />}
      {exchange ? null : (
        <CheckOption label={t('Digitale Visitenkarte von {name} per Mail erhalten', { name: s.name })} selected={sendCard} onPress={() => setSendCard(!sendCard)} />
      )}
      <CheckOption label={t('Ich willige ein, dass {name} meine Angaben erhält.', { name: s.name })} selected={consent} onPress={() => setConsent(!consent)} />
      <Pressable accessibilityRole="link" onPress={() => router.push('/legal/datenschutz')} hitSlop={8}>
        <Text style={styles.link}>{t('Datenschutz lesen')}</Text>
      </Pressable>
      <Button
        label={exchange ? 'Kontakte tauschen' : 'Kontakt schicken'}
        busy={busy}
        disabled={!name.trim() || !isEmail(email) || !consent}
        onPress={send}
      />
      <Button label="Abbrechen" variant="ghost" onPress={onCancel} />
      <QuestionHint
        question={t('Was passiert mit meinen Angaben?')}
        answer={t('KiezCoins schickt sie per Mail an {name} und speichert sie nicht.', { name: s.name })}
      />
      {result ? <Notice variant={result.ok ? undefined : 'warning'} message={result.message} onClose={() => setResult(null)} /> : null}
    </View>
  );
}

/**
 * „Kontakt von Hand eintragen“ fürs Team (2026-11-23): Die Person steht vor einem, hat aber kein Handy zur Hand.
 * Es entsteht eine vCard auf dem Gerät, auf Wunsch geht die Digitale Visitenkarte per Mail an die Person. KiezCoins speichert
 * den Kontakt nicht. Die vCard entsteht im Browser; in der Android-App öffnet der Knopf dieselbe Seite im Browser.
 * Wessen Kontakt gemeint ist, sagt ein Satz oben und die Frage unten (Daria, 2026-11-23: „wessen Kontakt?“).
 */
function ManualContact({ showcase, onCancel }: { showcase: Showcase; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [sendCard, setSendCard] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const first = name.trim().split(/\s+/)[0] ?? '';

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
    setBusy(true);
    setResult(null);
    // Kontakt ins eigene Adressbuch: Datei herunterladen, iPhone und Android bieten „Neuer Kontakt“ an
    const blob = new Blob([contactVcard({ name, email, place, note })], { type: 'text/vcard;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = contactFileName(name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    let message = t('Der Kontakt ist gespeichert.');
    let ok = true;
    if (sendCard && isEmail(email)) {
      const r = await sendCardMail(showcase.slug, email);
      ok = r === 'ok';
      message = ok
        ? t('Der Kontakt ist gespeichert. Die Digitale Visitenkarte ist unterwegs an {to}.', { to: email.trim() })
        : t('Der Kontakt ist gespeichert. Die Digitale Visitenkarte konnte nicht verschickt werden.');
    }
    setBusy(false);
    setResult({ ok, message });
    if (ok) {
      setName('');
      setEmail('');
      setPlace('');
      setNote('');
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.body}>{t('Steht jemand ohne Handy vor Dir, trag die Person hier ein. Ihr Kontakt kommt in Dein Adressbuch.')}</Text>
      <TextField label="Name" value={name} onChangeText={setName} maxLength={80} autoFocus {...NAME_FIELD} />
      <TextField label="Mail-Adresse" value={email} onChangeText={setEmail} maxLength={254} {...EMAIL_FIELD} />
      <TextField label="Wo habt Ihr Euch getroffen?" value={place} onChangeText={setPlace} maxLength={120} helperText="Optional" />
      <TextField label="Notiz für Dich" value={note} onChangeText={setNote} multiline maxLength={500} helperText="Optional" />
      {isEmail(email) ? (
        <CheckOption
          label={first ? t('Digitale Visitenkarte per Mail an {name} senden', { name: first }) : t('Digitale Visitenkarte per Mail senden')}
          selected={sendCard}
          onPress={() => setSendCard(!sendCard)}
        />
      ) : null}
      <Button
        label={sendCard && isEmail(email) ? 'Speichern und Digitale Visitenkarte senden' : 'Kontakt speichern'}
        busy={busy}
        disabled={!name.trim() || (!!email.trim() && !isEmail(email))}
        onPress={save}
      />
      <Button label="Abbrechen" variant="ghost" onPress={onCancel} />
      <QuestionHint
        question={t('Wo landet der Kontakt, den ich hier eintrage?')}
        answer={t(
          'In Deinem Adressbuch: Dein Handy bietet an, die Person mit Name, Mail-Adresse, Treffpunkt und Notiz als neuen Kontakt anzulegen. KiezCoins speichert davon nichts. Die Mail-Adresse braucht KiezCoins nur, um ihr die Digitale Visitenkarte zu schicken.',
        )}
      />
      {result ? <Notice variant={result.ok ? undefined : 'warning'} message={result.message} onClose={() => setResult(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[12] },
  item: { gap: space[12] },
  panel: { gap: space[16], padding: space[16], borderRadius: radius.md, backgroundColor: color.bg.surface },
  body: { ...text.body, color: color.text.primary },
  link: { ...text.caption, color: color.text.primary, textDecorationLine: 'underline' },
});
