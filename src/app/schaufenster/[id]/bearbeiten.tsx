import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Button } from '../../../components/Button';
import { FieldGroup, Notice, QuestionHint } from '../../../components/Content';
import { choosePhoto, CopyField, PHONE_FIELD, SwitchRow, TextField } from '../../../components/Form';
import { PHONE_PATTERN } from '../../../data/digitalCard.mjs';
import { ColorWheel } from '../../../components/ColorWheel';
import { scrollIntoView } from '../../../components/Nudge';
import { PostersAlone } from '../../../components/showcase/PostersAlone';
import type { SettingsArea } from '../../../components/showcase/ShowcaseSettingsRows';
import { RichTextField } from '../../../components/RichText';
import { SubScreen } from '../../../components/Screen';
import { Text } from '../../../components/T';
import {
  answerRequest,
  loadShowcase,
  openRequests,
  setShowcasePoster,
  showcaseInviteLink,
  BG_PALETTE,
  readableOn,
  EMAIL_MAX,
  EMAIL_PATTERN,
  HEX,
  MAX_LINKS,
  notifySearchEngines,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  showcasePosters,
  SLUG_MAX,
  slugStatus,
  updateShowcase,
  type Showcase,
  type SlugStatus,
} from '../../../data/showcase';
import { lookupAddress, type AddressLookup, type Coords } from '../../../data/location';
import { useStore } from '../../../data/store';
import { t } from '../../../data/texts';
import type { ImageSource } from '../../../data/types';
import { useGoBack } from '../../../lib/goBack';
import { useFeature } from '../../../data/unlock';
import { PAYMENT_AMOUNT_MAX, PAYMENT_LINKS_MAX, PAYMENT_TITLE_MAX, paymentLinkProblem } from '../../../data/paymentLinks.mjs';
import { shareText } from '../../../lib/share';
import { color, font, radius, space, text } from '../../../theme/tokens';
import { useAccentColor } from '../../../theme/signal';

/** Titel je Bereich; ohne Bereich die Inhalte */
const TITLES: Record<SettingsArea, string> = {
  sichtbarkeit: 'Leute einladen',
  posten: 'Wer darf posten?',
  aussehen: 'Aussehen',
  adresse: 'Adresse und Suchmaschinen',
};

/**
 * Routen `schaufenster/[id]/bearbeiten` und `schaufenster/[id]/einstellungen?bereich=…`, nur die Gründer:in
 * (2026-11-23: Inhalte getrennt von Einstellungen). Ohne Bereich „Inhalte bearbeiten“: nur Texte und Bilder (Logo,
 * Titelbild, Name, Kurztext, Services, Kiez, Adresse, E-Mail, Telefon, Links, Öffnungszeiten, Impressum, AGB). Mit Bereich genau
 * eine Einstellung von der Seite „Schaufenster“: Einladung und Anfragen (ohne „Für alle sichtbar“), wer posten darf,
 * Aussehen, Adresse und Suchmaschinen. Schalter (Sichtbarkeit, Kalender-Abo, Google, Online-Buchung,
 * Freundschaftsanfragen) und Löschen stehen auf der Seite „Schaufenster“ selbst und speichern sofort (2026-11-23).
 * Speichern schickt die Angaben dieses Bildschirms; Sichtbarkeit und Buchungslink schickt es nicht mit, damit ein
 * älterer Stand die Schalter nicht zurückdreht.
 */
export default function EditShowcase() {
  const { id, bereich } = useLocalSearchParams<{ id: string; bereich?: string }>();
  const area = bereich && bereich in TITLES ? (bereich as SettingsArea) : undefined;
  const title = area ? TITLES[area] : 'Inhalte bearbeiten';
  const goBack = useGoBack();
  const { currentUserId, groups, users } = useStore();
  const [showcase, setShowcase] = useState<Showcase | null | undefined>(undefined);
  const [founder, setFounder] = useState(false);
  const [form, setForm] = useState({ name: '', about: '', services: '', kiez: '', address: '', email: '', phone: '', openingHours: '', imprint: '', terms: '' });
  // Kartensuche zur geänderten Adresse (2026-11-23): Das Ergebnis steht unter dem Feld, bis die Person entscheidet.
  // Gefunden: bestätigen oder als Text speichern. Nicht gefunden oder Suche gestört: als Text speichern.
  const [addressCheck, setAddressCheck] = useState<(AddressLookup & { address: string }) | null>(null);
  const addressRef = useRef<View>(null);
  // Mehrere Links (Daria, 2026-11-10); immer mindestens ein Feld
  const [links, setLinks] = useState<string[]>(['']);
  // Zahlungslinks (Daria, 2026-11-23): Titel, Betrag, Link zum Anbieter; Funktion `schaufenster_bezahlen`
  const [payments, setPayments] = useState<{ title: string; amount: string; url: string }[]>([]);
  const paymentsOn = useFeature('schaufenster_bezahlen');
  const [servicesCollapsed, setServicesCollapsed] = useState(false);
  // Hintergrund der öffentlichen Seite (Daria, 2026-11-10); leer = Standard
  const [bgColor, setBgColor] = useState('');
  // Akzent des Themes (Daria, 2026-11-14)
  const accent = useAccentColor();
  // Eigene Adresse und Angaben für Suchmaschinen (Daria, 2026-11-11, Migration 20261111000200)
  const [slug, setSlug] = useState('');
  const [slugState, setSlugState] = useState<SlugStatus | undefined>();
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [logo, setLogo] = useState<ImageSource | undefined>();
  const [cover, setCover] = useState<ImageSource | undefined>();
  const [posters, setPosters] = useState<Record<string, boolean>>({});
  const [requests, setRequests] = useState<{ userId: string; handle: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    loadShowcase(id, currentUserId).then((d) => {
      setShowcase(d?.showcase ?? null);
      setFounder(!!d?.access.founder);
      if (!d) return;
      const s = d.showcase;
      setForm({
        name: s.name,
        about: s.about ?? '',
        services: s.services ?? '',
        kiez: s.kiez ?? '',
        address: s.address ?? '',
        email: s.email ?? '',
        phone: s.phone ?? '',
        openingHours: s.openingHours ?? '',
        imprint: s.imprint ?? '',
        terms: s.terms ?? '',
      });
      setLinks(s.links.length ? s.links : ['']);
      setPayments(s.paymentLinks.map((p) => ({ title: p.title, amount: p.amount ?? '', url: p.url })));
      setServicesCollapsed(s.servicesCollapsed);
      setBgColor(s.bgColor ?? '');
      setSlug(s.slug);
      setSeoTitle(s.seoTitle ?? '');
      setSeoDescription(s.seoDescription ?? '');
      setLogo(s.logo);
      setCover(s.cover);
      showcasePosters(s.groupId).then(setPosters);
    });
  }, [id, currentUserId]);

  // Beim Tippen prüfen, ob die Adresse frei ist (kurz warten, bis die Person aufhört zu tippen)
  useEffect(() => {
    if (!showcase?.seoReady || !slug || slug === showcase.slug) {
      setSlugState(undefined);
      return;
    }
    let current = true;
    const timer = setTimeout(() => {
      slugStatus(slug, showcase.id).then((state) => current && setSlugState(state));
    }, 400);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [slug, showcase]);

  const loadRequests = useCallback(() => {
    openRequests(id).then(setRequests, () => setRequests([]));
  }, [id]);
  useFocusEffect(loadRequests);

  if (showcase === undefined) {
    return (
      <SubScreen title={title} navigation="back" onLeadingPress={goBack}>
        <ActivityIndicator color={color.text.secondary} />
      </SubScreen>
    );
  }
  if (!showcase || !founder) {
    return (
      <SubScreen title={title} navigation="back" onLeadingPress={goBack}>
        <Notice message="Nur die Gründer:in der Gruppe bearbeitet das Schaufenster." />
      </SubScreen>
    );
  }

  const group = groups.find((g) => g.id === showcase.groupId);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const setAddress = (value: string) => {
    setAddressCheck(null);
    set('address')(value);
  };
  const linkOk = (l: string) => !l.trim() || /^https:\/\/\S+\.\S+$/i.test(l.trim());
  const linksOk = links.every(linkOk);
  const paymentsOk = payments.every((p) => paymentLinkProblem(p) === null);
  const setPayment = (i: number, key: 'title' | 'amount' | 'url') => (value: string) =>
    setPayments((all) => all.map((p, j) => (j === i ? { ...p, [key]: value } : p)));
  const emailOk = !form.email.trim() || EMAIL_PATTERN.test(form.email.trim());
  const phoneOk = !form.phone.trim() || PHONE_PATTERN.test(form.phone.trim());
  const bgOk = !bgColor.trim() || HEX.test(bgColor.trim());
  const setLink = (i: number) => (value: string) => setLinks((all) => all.map((l, j) => (j === i ? value : l)));
  // Link eine Stelle nach oben (-1) oder unten (+1) schieben
  const moveLink = (i: number, by: -1 | 1) =>
    setLinks((all) => {
      const j = i + by;
      if (j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const slugChanged = showcase.seoReady && slug !== showcase.slug;
  const slugOk = !slugChanged || slugState === 'frei' || slugState === 'eigen';
  const slugMessage =
    slugState === 'ungueltig'
      ? t('Die Adresse hat 3 bis 40 Zeichen: Kleinbuchstaben, Zahlen und Bindestriche.')
      : slugState === 'vergeben'
        ? t('Diese Adresse ist schon vergeben. Bitte wähle eine andere.')
        : slugState === 'reserviert'
          ? t('Diese Adresse ist reserviert. Bitte wähle eine andere.')
          : undefined;

  /**
   * Speichern. Punkt für Karte, Anfahrt und Kartenlinks (OpenStreetMap, 2026-11-18): Ohne Punkt steht der Ort überall
   * als reiner Text (2026-11-23). `choice` kommt aus der Kartensuche unter der Adresse: bestätigter Punkt oder null
   * für „als Text speichern“. Ohne `choice` sucht eine geänderte Adresse erst auf der Karte und speichert noch nicht.
   * Eine unveränderte Adresse behält ihren Punkt oder bleibt Text; eine leere löscht den Punkt.
   */
  const save = async (choice?: { coords: Coords | null }) => {
    setBusy(true);
    setFailed(null);
    try {
      const address = form.address.trim();
      let coords: Coords | null | undefined;
      if (choice) coords = choice.coords;
      else if (!address) coords = null;
      else if (address === (showcase.address ?? '').trim()) coords = undefined;
      else {
        const found = await lookupAddress(address);
        setAddressCheck({ ...found, address });
        setTimeout(() => scrollIntoView(addressRef.current), 50);
        return;
      }
      setAddressCheck(null);
      await updateShowcase(showcase.id, currentUserId, {
        ...form,
        coords,
        // AGB, Adresse, Titel und Beschreibung nur speichern, wenn sie geladen sind
        terms: showcase.termsReady ? form.terms : undefined,
        slug: slugChanged ? slug : undefined,
        seoTitle: showcase.seoReady ? seoTitle : undefined,
        seoDescription: showcase.seoReady ? seoDescription : undefined,
        paymentLinks: showcase.paymentReady ? payments : undefined,
        links, servicesCollapsed, bgColor, logo, cover });
      if (showcase.visibility === 'public') notifySearchEngines(showcase.seoReady ? slug : showcase.slug);
      goBack();
    } catch (error) {
      setFailed((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const togglePoster = async (userId: string, allow: boolean) => {
    setPosters((p) => ({ ...p, [userId]: allow }));
    if (!(await setShowcasePoster(showcase.groupId, userId, allow))) setPosters((p) => ({ ...p, [userId]: !allow }));
  };

  const answer = async (userId: string, accept: boolean) => {
    await answerRequest(showcase.id, userId, accept);
    loadRequests();
  };

  const link = showcaseInviteLink(showcase.inviteCode);

  return (
    <SubScreen
      title={title}
      navigation="back"
      onLeadingPress={goBack}
      actions={
        // „Wer darf posten?“ speichert jeden Schalter sofort, „Leute einladen“ hat nichts zu speichern
        area === 'posten' || area === 'sichtbarkeit' ? undefined : (
          <Button label="Speichern" busy={busy} disabled={!form.name.trim() || !linksOk || !paymentsOk || !emailOk || !phoneOk || !bgOk || !slugOk} onPress={() => save()} />
        )
      }
    >
      {area ? null : (
      <>
      <FieldGroup label="Bilder">
        <View style={styles.pictures}>
          <ImageSlot label="Logo" round image={logo} onPress={() => choosePhoto(setLogo, { square: true, title: 'Logo' })} />
          <ImageSlot label="Titelbild" image={cover} onPress={() => choosePhoto(setCover, { title: 'Titelbild' })} />
        </View>
      </FieldGroup>

      <FieldGroup label="Angaben">
        <TextField label="Name" required value={form.name} onChangeText={set('name')} maxLength={60} />
        <TextField label="Kurztext" multiline value={form.about} onChangeText={set('about')} maxLength={1000} placeholder="Wer seid Ihr, was gibt es bei Euch?" />
        {/* Services als formatierbarer Text (Daria, 2026-11-10) */}
        <RichTextField label="Services" value={form.services} onChange={set('services')} maxLength={4000} />
        <TextField label="Kiez" value={form.kiez} onChangeText={set('kiez')} maxLength={80} placeholder="Connewitz" />
        <View ref={addressRef} collapsable={false} style={styles.addressBlock}>
          <TextField
            label="Adresse"
            value={form.address}
            onChangeText={setAddress}
            maxLength={160}
            helperText={
              !addressCheck && form.address.trim() && form.address.trim() === (showcase.address ?? '').trim() && !showcase.coords
                ? 'Ohne Ort auf der Landkarte gespeichert: Deine Seite zeigt die Adresse als Text, ohne Kartenausschnitt, Kartenlink und Anfahrt.'
                : undefined
            }
          />
          {addressCheck ? (
            <AddressCheck check={addressCheck} busy={busy} onSave={(coords) => save({ coords })} onRetry={() => save()} onClose={() => setAddressCheck(null)} />
          ) : null}
        </View>
        {/* Kontakt-Mail (Daria, 2026-11-17): auf der Seite und der Visitenkarte zum Antippen */}
        <TextField
          label="E-Mail"
          value={form.email}
          onChangeText={set('email')}
          maxLength={EMAIL_MAX}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="hallo@kiezblick.de"
          error={emailOk ? undefined : 'Bitte eine E-Mail-Adresse wie hallo@kiezblick.de eintragen'}
        />
        {/* Telefon (Daria, 2026-11-24): steht mit der Mail in der Karte „Kontakt“, zum Antippen */}
        <TextField
          label="Telefon"
          value={form.phone}
          onChangeText={set('phone')}
          maxLength={30}
          helperText="Optional"
          placeholder="0341 123456"
          {...PHONE_FIELD}
          error={phoneOk ? undefined : 'Bitte nur Ziffern, Leerzeichen und + ( ) / - eintragen'}
        />
        {/* Reihenfolge der Links (Daria, 2026-11-23): Sie gilt auf der Seite, der Visitenkarte und für die Auswahl der
            druckbaren Karte, die die ersten Links vorauswählt */}
        {links.map((l, i) => (
          <View key={i} style={styles.linkItem}>
            <TextField
              label={links.length > 1 ? t('Link {n}', { n: i + 1 }) : t('Link')}
              value={l}
              onChangeText={setLink(i)}
              maxLength={300}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder={i === 0 ? 'https://kiezblick.de' : 'https://instagram.com/kiezblick'}
              error={linkOk(l) ? undefined : 'Der Link beginnt mit https://'}
            />
            {links.length > 1 ? (
              <View style={styles.linkOrder}>
                {i > 0 ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={t('Link {n} nach oben', { n: i + 1 })} hitSlop={8} onPress={() => moveLink(i, -1)}>
                    <Text style={styles.linkOrderText}>Nach oben</Text>
                  </Pressable>
                ) : null}
                {i < links.length - 1 ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={t('Link {n} nach unten', { n: i + 1 })} hitSlop={8} onPress={() => moveLink(i, 1)}>
                    <Text style={styles.linkOrderText}>Nach unten</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        ))}
        {links.length < MAX_LINKS ? (
          <Button label="Weiteren Link hinzufügen" icon="plus" variant="ghost" onPress={() => setLinks((all) => [...all, ''])} />
        ) : null}
        {/* Hinweis zur Schreibweise (Daria, 2026-11-18: Google Business Profile): so übernimmt Google die Zeiten von der
            öffentlichen Seite (api/_oeffnungszeiten.mjs) */}
        <TextField
          label="Öffnungszeiten"
          multiline
          value={form.openingHours}
          onChangeText={set('openingHours')}
          maxLength={400}
          placeholder="Mo–Fr 9–18 Uhr"
          helperText="Je Zeile Tage und Uhrzeit, zum Beispiel „Sa 10–14 Uhr“. So übernimmt Google die Zeiten."
        />
        <TextField label="Impressum" multiline value={form.imprint} onChangeText={set('imprint')} maxLength={1000} />
        <QuestionHint
          question="Brauche ich ein Impressum?"
          answer="Ja, wenn Ihr geschäftsmäßig auftretet, zum Beispiel als Laden, Verein oder mit Werbung (§ 5 Digitale-Dienste-Gesetz). Ins Impressum gehören Name, Anschrift und E-Mail-Adresse, dazu Rechtsform, vertretungsberechtigte Person, Registereintrag und Umsatzsteuer-ID, soweit vorhanden. Im Zweifel tragt es ein."
        />
        {/* AGB (Daria, 2026-11-11), freiwillig; Besucher sehen sie eingeklappt */}
        {showcase.termsReady ? <RichTextField label="AGB" value={form.terms} onChange={set('terms')} maxLength={20000} /> : null}
      </FieldGroup>

      {/* Zahlungslinks (Daria, 2026-11-23): Der Betrieb legt den Link beim Anbieter selbst an, KiezCoins speichert nur
          den Link. Auf der Seite erscheint je Eintrag „Bezahlen“. Nur mit Migration 20261123000300 und Funktion an. */}
      {showcase.paymentReady && paymentsOn ? (
        <FieldGroup label="Bezahlen">
          <QuestionHint
            question="Wie bekomme ich einen Zahlungslink?"
            answer="Lege bei Stripe, SumUp oder PayPal ein Konto an und erstelle dort einen Zahlungslink, zum Beispiel für einen Gutschein, einen Kurs oder eine Spende. Den Link trägst Du hier ein, auf Deiner Seite steht dann „Bezahlen“. Das Geld geht direkt an Dich, die Gebühr je Zahlung berechnet der Anbieter. Wer bezahlt hat, siehst Du in Deinem Konto beim Anbieter."
          />
          {payments.map((p, i) => {
            const problem = paymentLinkProblem(p);
            return (
              <View key={i} style={styles.paymentItem}>
                <TextField
                  label={payments.length > 1 ? t('Titel {n}', { n: i + 1 }) : t('Titel')}
                  value={p.title}
                  onChangeText={setPayment(i, 'title')}
                  maxLength={PAYMENT_TITLE_MAX}
                  placeholder="Gutschein: Frühstück für zwei"
                  error={problem === 'title' ? 'Bitte gib einen Titel ein.' : undefined}
                />
                <TextField label="Betrag" value={p.amount} onChangeText={setPayment(i, 'amount')} maxLength={PAYMENT_AMOUNT_MAX} placeholder="24 €" helperText="Optional" />
                <TextField
                  label="Link zum Bezahlen"
                  value={p.url}
                  onChangeText={setPayment(i, 'url')}
                  maxLength={300}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  placeholder="https://buy.stripe.com/…"
                  error={problem === 'url' ? 'Der Link beginnt mit https://' : undefined}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('Zahlungslink {n} entfernen', { n: i + 1 })}
                  hitSlop={8}
                  onPress={() => setPayments((all) => all.filter((_, j) => j !== i))}
                  style={styles.paymentRemove}
                >
                  <Text style={styles.linkOrderText}>Entfernen</Text>
                </Pressable>
              </View>
            );
          })}
          {payments.length < PAYMENT_LINKS_MAX ? (
            <Button
              label={payments.length ? 'Weiteren Zahlungslink hinzufügen' : 'Zahlungslink hinzufügen'}
              icon="plus"
              variant="ghost"
              onPress={() => setPayments((all) => [...all, { title: '', amount: '', url: '' }])}
            />
          ) : null}
        </FieldGroup>
      ) : null}
      </>
      )}

      {area === 'aussehen' ? (
      <>
      <FieldGroup label="Services">
        <SwitchRow
          label="Services einklappen"
          description={
            servicesCollapsed
              ? 'Besucher sehen nur die Überschrift und klappen die Services mit einem Tipp auf.'
              : 'Die Services stehen offen auf der Seite.'
          }
          value={servicesCollapsed}
          onValueChange={setServicesCollapsed}
        />
      </FieldGroup>
      <FieldGroup label="Farbe der öffentlichen Seite">
        <Text style={styles.meta}>Hintergrund von kiezcoins.de/s/{showcase.slug}. Die Schrift wird automatisch hell oder dunkel. In der App bleibt das Schaufenster im App-Look.</Text>
        <View style={styles.swatches}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: !bgColor }}
            accessibilityLabel={t('Standard')}
            onPress={() => setBgColor('')}
            style={[styles.swatch, styles.swatchDefault, !bgColor && [styles.swatchOn, { borderColor: accent }]]}
          >
            <Text style={styles.swatchText}>Standard</Text>
          </Pressable>
          {BG_PALETTE.map((c) => (
            <Pressable
              key={c.hex}
              accessibilityRole="button"
              accessibilityState={{ selected: bgColor.toUpperCase() === c.hex }}
              accessibilityLabel={t(c.name)}
              onPress={() => setBgColor(c.hex)}
              style={[styles.swatch, { backgroundColor: c.hex }, bgColor.toUpperCase() === c.hex && [styles.swatchOn, { borderColor: accent }]]}
            />
          ))}
        </View>
        <TextField
          label="Eigene Farbe"
          value={bgColor}
          onChangeText={(v) => setBgColor(v.trim().startsWith('#') || !v.trim() ? v.trim() : `#${v.trim()}`)}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          placeholder="#DCE1FF"
          error={bgOk ? undefined : 'Bitte so: #DCE1FF'}
        />
        {/* HSL-Rad und Vorschau (Daria, 2026-11-10) */}
        <ColorWheel value={bgColor || PAGE_DEFAULT} onChange={setBgColor} />
        <Text style={styles.meta}>Vorschau</Text>
        <PagePreview bg={bgOk && bgColor ? bgColor : PAGE_DEFAULT} name={form.name} about={form.about} kiez={form.kiez} cover={cover} logo={logo} />
      </FieldGroup>
      </>
      ) : null}

      {/* Leute einladen (2026-11-23): erreichbar über den ausgeschalteten Schalter „Für alle sichtbar, auch im Web“ */}
      {area === 'sichtbarkeit' && showcase.visibility === 'public' ? (
        <Notice message="Dein Schaufenster ist für alle sichtbar. Eine Einladung brauchst Du erst, wenn Du „Für alle sichtbar, auch im Web“ ausschaltest." />
      ) : null}
      {area === 'sichtbarkeit' && showcase.visibility === 'invite' ? (
        <FieldGroup label="Einladung">
          <Notice message="Posts und Termine sehen nur Dein Team und Leute, die Du einlädst. Name, Logo und Angaben sehen alle." />
          <CopyField label="Einladungslink" value={link} />
          <CopyField label="Code" value={showcase.inviteCode} />
          <Button
            label="Einladung teilen"
            variant="secondary"
            icon="friends"
            onPress={() =>
              shareText(
                [t('Komm in unser Schaufenster „{name}“ bei KiezCoins. Mit diesem Link bist Du dabei:', { name: showcase.name }), link, t('Oder mit dem Code:'), showcase.inviteCode].join(
                  '\n',
                ),
              )
            }
          />
        </FieldGroup>
      ) : null}

      {area === 'adresse' && !(showcase.seoReady && showcase.visibility === 'public') ? (
        <Notice message="Eine eigene Adresse und Angaben für Suchmaschinen gibt es, wenn auf der Seite „Schaufenster“ der Schalter „Für alle sichtbar, auch im Web“ an ist." />
      ) : null}
      {area === 'adresse' && showcase.seoReady && showcase.visibility === 'public' ? (
        <FieldGroup label="Adresse">
          <TextField
            label="Adresse der öffentlichen Seite"
            value={slug}
            // Kleinbuchstaben, Leerzeichen werden zu Bindestrichen
            onChangeText={(v) => setSlug(v.toLowerCase().replace(/\s+/g, '-'))}
            maxLength={SLUG_MAX}
            autoCapitalize="none"
            autoCorrect={false}
            error={slugMessage}
            helperText={
              slugChanged && slugState === 'frei'
                ? t('Die Adresse ist frei.')
                : 'Kleinbuchstaben, Zahlen und Bindestriche, 3 bis 40 Zeichen.'
            }
          />
          <Text noTranslate style={styles.address}>
            kiezcoins.de/s/{slug || '…'}
          </Text>
          <QuestionHint
            question="Was passiert mit meiner alten Adresse?"
            answer="Die alte Adresse leitet auf die neue weiter. Geteilte Links und QR-Codes funktionieren weiter. Niemand sonst kann Deine alte Adresse übernehmen."
          />
        </FieldGroup>
      ) : null}

      {area === 'adresse' && showcase.seoReady && showcase.visibility === 'public' ? (
        <FieldGroup label="In Suchmaschinen">
          <TextField
            label="Seitentitel"
            value={seoTitle}
            onChangeText={setSeoTitle}
            maxLength={SEO_TITLE_MAX}
            placeholder={autoTitle(form.name, form.kiez)}
            helperText={t('{n} von {max} Zeichen. Sichtbar sind meist die ersten 60.', { n: seoTitle.length, max: SEO_TITLE_MAX })}
          />
          <TextField
            label="Beschreibung"
            multiline
            value={seoDescription}
            onChangeText={setSeoDescription}
            maxLength={SEO_DESCRIPTION_MAX}
            placeholder={autoDescription(form.name, form.kiez, form.about)}
            helperText={t('{n} von {max} Zeichen. Sichtbar sind meist die ersten 155.', { n: seoDescription.length, max: SEO_DESCRIPTION_MAX })}
          />
          <QuestionHint
            question="Wofür brauche ich Seitentitel und Beschreibung?"
            answer="Suchmaschinen wie Google, Bing oder Ecosia zeigen beides in ihren Ergebnissen. Ein guter Titel nennt, was Du anbietest und wo. Die Beschreibung macht in ein bis zwei Sätzen Lust auf einen Besuch. Leere Felder füllt die App aus Name, Kiez und Kurztext."
          />
          <Text style={styles.meta}>Vorschau</Text>
          <SearchPreview
            slug={slug || showcase.slug}
            title={seoTitle.trim() || autoTitle(form.name, form.kiez)}
            description={seoDescription.trim() || autoDescription(form.name, form.kiez, form.about)}
          />
        </FieldGroup>
      ) : null}

      {area === 'sichtbarkeit' && requests.length ? (
        <FieldGroup label="Anfragen">
          {requests.map((r) => (
            <View key={r.userId} style={styles.row}>
              <Text noTranslate style={styles.name}>
                {r.handle}
              </Text>
              <Pressable onPress={() => answer(r.userId, false)} hitSlop={8} accessibilityRole="button">
                <Text style={styles.link}>Ablehnen</Text>
              </Pressable>
              <Button label="Annehmen" variant="secondary" onPress={() => answer(r.userId, true)} />
            </View>
          ))}
        </FieldGroup>
      ) : null}

      {area === 'posten' ? (
        <FieldGroup label="Wer darf posten?">
          {/* Fragen und Erklärungen stehen in der passenden Komponente, nie als grauer Text (Daria, 2026-11-18) */}
          <QuestionHint question="Wer darf Termine erstellen?" answer="Wer posten darf, erstellt auch Termine." />
          {group?.members.map((m) => {
            const me = m.userId === currentUserId;
            const user = users.find((u) => u.id === m.userId);
            return me || m.role === 'founder' ? null : (
              <SwitchRow
                key={m.userId}
                label={user?.name ?? t('Unbekannt')}
                value={!!posters[m.userId]}
                onValueChange={(allow) => togglePoster(m.userId, allow)}
              />
            );
          })}
          {!group || group.members.length <= 1 ? <PostersAlone groupId={group?.id} /> : null}
        </FieldGroup>
      ) : null}

      {failed ? <Notice variant="warning" message={failed} /> : null}
    </SubScreen>
  );
}

/** Wie api/s.mjs (titelVon, beschreibungVon), damit die Vorschau zeigt, was ohne eigene Angaben erscheint */
const autoTitle = (name: string, kiez: string) => `${name.trim() || t('Dein Schaufenster')}${kiez.trim() ? ` in ${kiez.trim()}` : ''} – KiezCoins`;
function autoDescription(name: string, kiez: string, about: string): string {
  const short = about.replace(/\s+/g, ' ').trim();
  if (short) return short.length > 160 ? `${short.slice(0, 159).trimEnd()}…` : short;
  return `${name.trim() || t('Dein Schaufenster')}${kiez.trim() ? ` in ${kiez.trim()}` : ''}: Termine, Neuigkeiten und Infos bei KiezCoins.`;
}

/** So ungefähr sieht der Eintrag in einer Suchmaschine aus; lange Texte werden wie dort abgeschnitten */
function SearchPreview({ slug, title, description }: { slug: string; title: string; description: string }) {
  const cut = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value);
  return (
    <View style={styles.search} accessibilityLabel={t('Vorschau in Suchmaschinen')}>
      <Text noTranslate style={styles.searchUrl}>
        kiezcoins.de › s › {slug}
      </Text>
      <Text noTranslate style={styles.searchTitle} numberOfLines={1}>
        {cut(title, 60)}
      </Text>
      <Text noTranslate style={styles.searchText} numberOfLines={2}>
        {cut(description, 155)}
      </Text>
    </View>
  );
}

/** Standard-Hintergrund der öffentlichen Seite (website/seite.css, --bg) */
const PAGE_DEFAULT = '#FAFBEF';

/** Verkleinerte öffentliche Seite mit der gewählten Farbe; Schrift wie dort hell oder dunkel */
function PagePreview({ bg, name, about, kiez, cover, logo }: { bg: string; name: string; about: string; kiez: string; cover?: ImageSource; logo?: ImageSource }) {
  const c = readableOn(bg);
  return (
    <View style={[styles.preview, { backgroundColor: bg }]} accessibilityLabel={t('Vorschau der öffentlichen Seite')}>
      <Text noTranslate style={[styles.previewBrand, { color: c.text }]}>
        KiezCoins
      </Text>
      {cover ? <Image source={cover} style={styles.previewCover} contentFit="cover" /> : <View style={[styles.previewCover, { backgroundColor: c.surface }]} />}
      <View style={styles.previewHead}>
        {logo ? <Image source={logo} style={[styles.previewLogo, { borderColor: bg }]} contentFit="cover" /> : null}
        <Text noTranslate style={[styles.previewName, { color: c.text }]} numberOfLines={1}>
          {name || t('Dein Schaufenster')}
        </Text>
      </View>
      {kiez ? (
        <Text noTranslate style={[styles.previewSmall, { color: c.muted }]}>
          {kiez}
        </Text>
      ) : null}
      {about ? (
        <Text noTranslate style={[styles.previewText, { color: c.text }]} numberOfLines={2}>
          {about}
        </Text>
      ) : null}
      <View style={[styles.previewCard, { backgroundColor: c.surface }]}>
        <Text style={[styles.previewSmall, { color: c.dark ? '#A9B4FF' : '#5260E0' }]}>Termin</Text>
        <Text style={[styles.previewText, { color: c.text, fontFamily: font.semiBold }]}>Flohmarkt im Hof</Text>
      </View>
    </View>
  );
}

function ImageSlot({ label, image, round, onPress }: { label: string; image?: ImageSource; round?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t('{label} wählen', { label: t(label) })} style={styles.slot}>
      <View style={[round ? styles.slotRound : styles.slotWide, styles.slotBox]}>
        {image ? <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={styles.plus}>+</Text>}
      </View>
      <Text style={styles.meta}>{label}</Text>
    </Pressable>
  );
}

/**
 * Ergebnis der Kartensuche unter dem Feld „Adresse“ (2026-11-23). Gefunden: Die Person sieht, welchen Ort die Karte
 * meint, und bestätigt ihn, denn die Suche trifft manchmal daneben. Sonst bleibt „als Text speichern“: Die Seite zeigt
 * den Ort dann ohne Karte, Anfahrt und Kartenlink.
 */
function AddressCheck({
  check,
  busy,
  onSave,
  onRetry,
  onClose,
}: {
  check: AddressLookup & { address: string };
  busy: boolean;
  onSave: (coords: Coords | null) => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.addressCheck}>
      {check.status === 'found' ? (
        <Notice message={t('Auf der Landkarte gefunden: {place}. Stimmt das?', { place: check.label })} onClose={onClose} />
      ) : check.status === 'notFound' ? (
        <Notice
          variant="warning"
          message={t('„{address}“ findet die Kartensuche nicht. Prüf die Schreibweise, oder speichere die Adresse als Text. Dann zeigt Deine Seite sie ohne Kartenausschnitt, Kartenlink und Anfahrt.', { address: check.address })}
          onClose={onClose}
        />
      ) : (
        <Notice
          variant="warning"
          message="Die Kartensuche antwortet gerade nicht. Versuch es gleich noch mal, oder speichere die Adresse als Text."
          onClose={onClose}
        />
      )}
      {check.status === 'found' ? <Button label="Ja, mit Kartenpunkt speichern" busy={busy} onPress={() => onSave(check.coords)} /> : null}
      {check.status === 'error' ? <Button label="Noch mal suchen" variant="secondary" busy={busy} onPress={onRetry} /> : null}
      <Button label="Als Text speichern" variant="secondary" disabled={busy} onPress={() => onSave(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  paymentItem: { gap: space[12], paddingBottom: space[12], borderBottomWidth: 1, borderBottomColor: color.line.hairline },
  paymentRemove: { alignSelf: 'flex-end' },
  linkItem: { gap: space[6] },
  linkOrder: { flexDirection: 'row', justifyContent: 'flex-end', gap: space[16] },
  linkOrderText: { ...text.caption, color: color.text.secondary, textDecorationLine: 'underline' },
  addressBlock: { gap: space[12] },
  addressCheck: { gap: space[8] },
  pictures: { flexDirection: 'row', alignItems: 'flex-start', gap: space[16] },
  slot: { alignItems: 'center', gap: space[4] },
  slotBox: { overflow: 'hidden', backgroundColor: color.bg.surface, alignItems: 'center', justifyContent: 'center' },
  slotRound: { width: 80, height: 80, borderRadius: 40 },
  slotWide: { width: 160, height: 90, borderRadius: radius.md },
  plus: { ...text.title, color: color.text.secondary },
  meta: { ...text.caption, color: color.text.secondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  name: { ...text.body, flex: 1, color: color.text.primary },
  link: { ...text.caption, color: color.text.secondary, textDecorationLine: 'underline' },
  preview: { gap: space[6], padding: space[12], borderRadius: radius.md, borderWidth: 1, borderColor: color.bg.surface },
  previewBrand: { ...text.labelXs, alignSelf: 'flex-end' },
  // Ecken rechteckig wie auf der öffentlichen Seite
  previewCover: { width: '100%', aspectRatio: 16 / 9 },
  // Logo rechts, Name links daneben und linksbündig, wie auf der öffentlichen Seite
  previewHead: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: space[8], marginTop: -space[20], paddingRight: space[8] },
  previewLogo: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, alignSelf: 'flex-start' },
  // Beginnt unter dem Titelbild, damit ein langer Name nach unten umbricht
  previewName: { ...text.photoTitle, flex: 1, alignSelf: 'flex-start', marginTop: space[20] + space[6] },
  previewSmall: { ...text.tag },
  previewText: { ...text.caption },
  previewCard: { padding: space[8], borderRadius: radius.post, gap: space[2], marginTop: space[4] },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: color.text.secondary },
  swatchDefault: { width: 'auto', paddingHorizontal: space[12], justifyContent: 'center', backgroundColor: color.bg.surface },
  swatchOn: { borderWidth: 3 },
  swatchText: { ...text.caption, color: color.text.primary },
  address: { ...text.body, color: color.text.primary },
  search: { gap: space[2], padding: space[12], borderRadius: radius.md, backgroundColor: color.bg.surface },
  searchUrl: { ...text.caption, color: color.text.secondary },
  searchTitle: { ...text.bodyStrong, color: color.accent.primary },
  searchText: { ...text.caption, color: color.text.primary },
});
