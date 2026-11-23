import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Button } from '../../../components/Button';
import { Notice } from '../../../components/Content';
import { CheckOption, TextField } from '../../../components/Form';
import { InviteQr } from '../../../components/InviteQr';
import { SubScreen } from '../../../components/Screen';
import { CardMailButton } from '../../../components/ShowcaseShare';
import { Text } from '../../../components/T';
import { WEB_APP_URL } from '../../../data/groups';
import { loadShowcase, sendCardMail, showcasePublicLink, type Showcase } from '../../../data/showcase';
import { useStore } from '../../../data/store';
import { t } from '../../../data/texts';
import { CARD_H, CARD_W, cardData, downloadCard, drawBusinessCard, printCard, type CardSides } from '../../../lib/businessCard';
import { contactFileName, contactVcard } from '../../../lib/contactCard';
import { useGoBack } from '../../../lib/goBack';
import { shareText } from '../../../lib/share';
import { color, radius, space, text } from '../../../theme/tokens';

const web = Platform.OS === 'web';
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** Desktop: Maus oder Trackpad. Druck und Export gibt es nur dort (Daria, 2026-11-23) */
const desktop = () =>
  web && typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

type Panel = 'tauschen' | 'code' | 'mail' | null;

/**
 * Route `schaufenster/[id]/visitenkarte`: die Ansicht des Teams (Daria, 2026-11-23). Dieselben Knöpfe wie die
 * öffentliche Ansicht kiezcoins.de/s/<kurzname>/visitenkarte, untereinander: Teilen, Link kopieren, Kontakte tauschen,
 * Instant-Code zeigen, Per Mail schicken. Ist eine Option aufgeklappt, tritt „Teilen“ als Secondary-Knopf zurück.
 * „Link kopieren“ gibt es nur hier. Druck und Export stehen ganz am Schluss und nur auf dem Desktop.
 *
 * Kontakte tauschen hat zwei Wege: Die andere Person scannt den Instant-Code und trägt sich auf der öffentlichen Seite
 * ein (die Angaben kommen per Mail an die Kontakt-Mail des Schaufensters), oder das Team trägt die Person von Hand ein.
 * Dann entsteht eine vCard auf dem Gerät, und auf Wunsch geht die Visitenkarte per Mail an die Person. KiezCoins
 * speichert den Kontakt nicht. Die Karte wird im Browser gezeichnet; in der Android-App öffnen Vorschau, vCard und
 * Export dieselbe Seite im Browser.
 */
export default function ShowcaseBusinessCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack();
  const { currentUserId } = useStore();
  const [showcase, setShowcase] = useState<Showcase | null | undefined>(undefined);
  const [team, setTeam] = useState(false);
  const [sides, setSides] = useState<CardSides | null>(null);
  const [preview, setPreview] = useState<{ front: string; back: string } | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [copied, setCopied] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadShowcase(id, currentUserId).then((d) => {
        setShowcase(d?.showcase ?? null);
        setTeam(!!d?.access.team);
      });
    }, [id, currentUserId]),
  );

  useEffect(() => {
    if (!showcase || !web) return;
    let off = false;
    drawBusinessCard(cardData(showcase)).then((s) => {
      if (off || !s) return;
      setSides(s);
      setPreview({ front: s.front.toDataURL('image/png'), back: s.back.toDataURL('image/png') });
    });
    return () => {
      off = true;
    };
  }, [showcase]);

  if (showcase === undefined) {
    return (
      <SubScreen title="Visitenkarte" navigation="back" onLeadingPress={goBack}>
        <ActivityIndicator color={color.text.secondary} />
      </SubScreen>
    );
  }
  if (showcase === null || !team) {
    return (
      <SubScreen title="Visitenkarte" navigation="back" onLeadingPress={goBack}>
        <Notice message="Die Visitenkarte kann nur das Team des Schaufensters exportieren." />
      </SubScreen>
    );
  }

  const link = `${showcasePublicLink(showcase.slug)}/visitenkarte`;
  const codeLink = `${link}?via=karte`;
  const toggle = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));

  const copy = async () => {
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <SubScreen title="Visitenkarte" navigation="back" onLeadingPress={goBack}>
      <View style={styles.page}>
        <Text style={styles.body}>
          {t('Vorne stehen Name, Kiez und ein Instant-Code zu Eurer Visitenkarte, hinten Adresse, Öffnungszeiten, Services und Links. Ändern kannst Du die Angaben unter „Schaufenster bearbeiten“.')}
        </Text>
        {web ? (
          preview ? (
            <View style={styles.sides}>
              <Text style={styles.label}>Vorne</Text>
              <Image source={{ uri: preview.front }} style={styles.card} contentFit="contain" accessibilityLabel={t('Vorderseite der Visitenkarte')} />
              <Text style={styles.label}>Hinten</Text>
              <Image source={{ uri: preview.back }} style={styles.card} contentFit="contain" accessibilityLabel={t('Rückseite der Visitenkarte')} />
            </View>
          ) : (
            <ActivityIndicator color={color.text.secondary} />
          )
        ) : null}

        <View style={styles.buttons}>
          <Button label="Visitenkarte teilen" variant={panel ? 'secondary' : 'primary'} onPress={() => shareText(link)} />
          <Button label={copied ? 'Link kopiert' : 'Link kopieren'} variant="secondary" icon={copied ? 'check' : undefined} onPress={copy} />

          <Button label="Kontakte tauschen" variant="secondary" onPress={() => toggle('tauschen')} />
          {panel === 'tauschen' ? <Exchange showcase={showcase} codeLink={codeLink} /> : null}

          <Button label="Instant-Code zeigen" variant="secondary" onPress={() => toggle('code')} />
          {panel === 'code' ? (
            <View style={styles.panel}>
              <Text style={styles.body}>{t('Mit der Kamera scannen, um die Visitenkarte zu öffnen.')}</Text>
              <InviteQr value={codeLink} label={t('Instant-Code zur Visitenkarte')} />
            </View>
          ) : null}

          <CardMailButton showcase={showcase} label="Per Mail schicken" open={panel === 'mail'} onOpenChange={(o) => setPanel(o ? 'mail' : null)} />
        </View>

        {desktop() ? (
          <View style={styles.buttons}>
            <Text style={styles.label}>{t('Druck und Export')}</Text>
            <Button label="Visitenkarte herunterladen" variant="secondary" disabled={!sides} onPress={() => sides && downloadCard(sides, showcase.name)} />
            <Button label="Drucken oder als PDF" variant="secondary" disabled={!sides} onPress={() => sides && printCard(sides, showcase.name)} />
            <Text style={styles.meta}>
              {t('Format 85 × 55 mm wie eine Scheckkarte. Für die Druckerei im Druckdialog „Als PDF sichern“ wählen: Das PDF hat zwei Seiten, vorne und hinten.')}
            </Text>
          </View>
        ) : null}
      </View>
    </SubScreen>
  );
}

/** „Kontakte tauschen“: per Instant-Code oder von Hand */
function Exchange({ showcase, codeLink }: { showcase: Showcase; codeLink: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [sendCard, setSendCard] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const hasMail = !!showcase.email?.trim();
  const first = name.trim().split(/\s+/)[0] ?? '';

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
        ? t('Der Kontakt ist gespeichert. Die Visitenkarte ist unterwegs an {to}.', { to: email.trim() })
        : t('Der Kontakt ist gespeichert. Die Visitenkarte konnte nicht verschickt werden.');
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
      <Text style={styles.heading}>{t('Per Instant-Code')}</Text>
      <Text style={styles.body}>
        {hasMail
          ? t('Die andere Person scannt den Code und trägt ihre Kontaktdaten ein. Sie erhält Deine Visitenkarte, Du erhältst ihren Kontakt per Mail.')
          : t('Die andere Person scannt den Code und speichert Deine Visitenkarte. Damit sie Dir ihren Kontakt schicken kann, trag unter „Schaufenster bearbeiten“ eine Kontakt-Mail ein.')}
      </Text>
      <InviteQr value={codeLink} label={t('Instant-Code zur Visitenkarte')} />

      <Text style={styles.heading}>{t('Von Hand eintragen')}</Text>
      {web ? (
        <>
          <TextField label="Name" value={name} onChangeText={setName} maxLength={80} />
          <TextField label="Mail-Adresse" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={254} />
          <TextField label="Wo habt Ihr Euch getroffen?" value={place} onChangeText={setPlace} maxLength={120} helperText="Optional" />
          <TextField label="Notiz für Dich" value={note} onChangeText={setNote} multiline maxLength={500} helperText="Optional" />
          {isEmail(email) ? (
            <CheckOption
              label={first ? t('Visitenkarte per Mail an {name} senden', { name: first }) : t('Visitenkarte per Mail senden')}
              selected={sendCard}
              onPress={() => setSendCard(!sendCard)}
            />
          ) : null}
          <Button
            label={sendCard && isEmail(email) ? 'Speichern und Visitenkarte senden' : 'Kontakt speichern'}
            busy={busy}
            disabled={!name.trim() || (!!email.trim() && !isEmail(email))}
            onPress={save}
          />
          <Text style={styles.meta}>{t('Der Kontakt wird in Deinem Adressbuch gespeichert. KiezCoins speichert ihn nicht.')}</Text>
          {result ? <Notice variant={result.ok ? undefined : 'warning'} message={result.message} onClose={() => setResult(null)} /> : null}
        </>
      ) : (
        <Button
          label="Im Browser öffnen"
          variant="secondary"
          onPress={() => Linking.openURL(`${WEB_APP_URL}/schaufenster/${showcase.id}/visitenkarte`).catch(() => {})}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[24] },
  sides: { gap: space[8] },
  body: { ...text.body, color: color.text.primary },
  heading: { ...text.bodyStrong, color: color.text.primary },
  label: { ...text.caption, color: color.text.secondary },
  card: { width: '100%', aspectRatio: CARD_W / CARD_H, borderRadius: radius.md, marginBottom: space[12] },
  buttons: { gap: space[12] },
  panel: { gap: space[16], padding: space[16], borderRadius: radius.md, backgroundColor: color.bg.surface },
  meta: { ...text.caption, color: color.text.secondary },
});
