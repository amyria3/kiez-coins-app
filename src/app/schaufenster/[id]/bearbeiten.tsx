import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { FieldGroup, KaterCard, Notice, QuestionHint } from '../../../components/Content';
import { Chip, ChipGroup, choosePhoto, CopyField, SwitchRow, TextField } from '../../../components/Form';
import { ColorWheel } from '../../../components/ColorWheel';
import { RichTextField } from '../../../components/RichText';
import { SubScreen } from '../../../components/Screen';
import { Text } from '../../../components/T';
import {
  answerRequest,
  deleteShowcase,
  loadShowcase,
  openRequests,
  setShowcasePoster,
  showcaseInviteLink,
  showcasePublicLink,
  BG_PALETTE,
  readableOn,
  HEX,
  MAX_LINKS,
  showcasePosters,
  updateShowcase,
  type Showcase,
  type Visibility,
} from '../../../data/showcase';
import { useStore } from '../../../data/store';
import { t } from '../../../data/texts';
import type { ImageSource } from '../../../data/types';
import { useGoBack } from '../../../lib/goBack';
import { shareText } from '../../../lib/share';
import { color, font, radius, space, text } from '../../../theme/tokens';

/**
 * Route `schaufenster/[id]/bearbeiten` (Daria, 2026-11-10): nur die Gründer:in. Angaben, Bilder, Sichtbarkeit,
 * Einladung und Anfragen bei „nur für Eingeladene“, wer posten darf, Schaufenster löschen.
 */
export default function EditShowcase() {
  // von=schaufenster: geöffnet über kiezcoins.de/schaufenster. Nach dem Löschen geht es dorthin zurück statt auf die
  // interne Gruppe, die Läden ohne die Social App gar nicht kennen.
  const { id, von } = useLocalSearchParams<{ id: string; von?: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { currentUserId, groups, users } = useStore();
  const [showcase, setShowcase] = useState<Showcase | null | undefined>(undefined);
  const [founder, setFounder] = useState(false);
  const [form, setForm] = useState({ name: '', about: '', services: '', kiez: '', address: '', openingHours: '', imprint: '' });
  // Mehrere Links (Daria, 2026-11-10); immer mindestens ein Feld
  const [links, setLinks] = useState<string[]>(['']);
  const [servicesCollapsed, setServicesCollapsed] = useState(false);
  // Hintergrund der öffentlichen Seite (Daria, 2026-11-10); leer = Standard
  const [bgColor, setBgColor] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
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
        openingHours: s.openingHours ?? '',
        imprint: s.imprint ?? '',
      });
      setLinks(s.links.length ? s.links : ['']);
      setServicesCollapsed(s.servicesCollapsed);
      setBgColor(s.bgColor ?? '');
      setVisibility(s.visibility);
      setLogo(s.logo);
      setCover(s.cover);
      showcasePosters(s.groupId).then(setPosters);
    });
  }, [id, currentUserId]);

  const loadRequests = useCallback(() => {
    openRequests(id).then(setRequests, () => setRequests([]));
  }, [id]);
  useFocusEffect(loadRequests);

  if (showcase === undefined) {
    return (
      <SubScreen title="Schaufenster bearbeiten" navigation="back" onLeadingPress={goBack}>
        <ActivityIndicator color={color.text.secondary} />
      </SubScreen>
    );
  }
  if (!showcase || !founder) {
    return (
      <SubScreen title="Schaufenster bearbeiten" navigation="back" onLeadingPress={goBack}>
        <KaterCard>Nur die Gründer:in der Gruppe bearbeitet das Schaufenster.</KaterCard>
      </SubScreen>
    );
  }

  const group = groups.find((g) => g.id === showcase.groupId);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const linkOk = (l: string) => !l.trim() || /^https:\/\/\S+\.\S+$/i.test(l.trim());
  const linksOk = links.every(linkOk);
  const bgOk = !bgColor.trim() || HEX.test(bgColor.trim());
  const setLink = (i: number) => (value: string) => setLinks((all) => all.map((l, j) => (j === i ? value : l)));

  const save = async () => {
    setBusy(true);
    setFailed(null);
    try {
      await updateShowcase(showcase.id, currentUserId, { ...form, links, servicesCollapsed, bgColor, visibility, logo, cover });
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

  const remove = () =>
    Alert.alert(t('Schaufenster löschen?'), t('Alle Posts und Termine im Schaufenster verschwinden. Das lässt sich nicht rückgängig machen.'), [
      { text: t('Abbrechen'), style: 'cancel' },
      {
        text: t('Löschen'),
        style: 'destructive',
        onPress: async () => {
          if (!(await deleteShowcase(showcase.id))) return;
          if (von === 'schaufenster') router.dismissTo('/schaufenster');
          else router.dismissTo({ pathname: '/groups/[id]', params: { id: showcase.groupId } });
        },
      },
    ]);

  const link = showcaseInviteLink(showcase.inviteCode);

  return (
    <SubScreen
      title="Schaufenster bearbeiten"
      navigation="back"
      onLeadingPress={goBack}
      actions={<Button label="Speichern" busy={busy} disabled={!form.name.trim() || !linksOk || !bgOk} onPress={save} />}
    >
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
        <TextField label="Kiez" value={form.kiez} onChangeText={set('kiez')} maxLength={80} placeholder="Connewitz" />
        <TextField label="Adresse" value={form.address} onChangeText={set('address')} maxLength={160} />
        {links.map((l, i) => (
          <TextField
            key={i}
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
        ))}
        {links.length < MAX_LINKS ? (
          <Button label="Weiteren Link hinzufügen" icon="plus" variant="ghost" onPress={() => setLinks((all) => [...all, ''])} />
        ) : null}
        <TextField label="Öffnungszeiten" multiline value={form.openingHours} onChangeText={set('openingHours')} maxLength={400} placeholder="Mo–Fr 9–18 Uhr" />
        <TextField label="Impressum" multiline value={form.imprint} onChangeText={set('imprint')} maxLength={1000} />
        <QuestionHint
          question="Brauche ich ein Impressum?"
          answer="Ja, wenn Ihr geschäftsmäßig auftretet, zum Beispiel als Laden, Verein oder mit Werbung (§ 5 Digitale-Dienste-Gesetz). Ins Impressum gehören Name, Anschrift und E-Mail-Adresse, dazu Rechtsform, vertretungsberechtigte Person, Registereintrag und Umsatzsteuer-ID, soweit vorhanden. Im Zweifel tragt es ein."
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
            style={[styles.swatch, styles.swatchDefault, !bgColor && styles.swatchOn]}
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
              style={[styles.swatch, { backgroundColor: c.hex }, bgColor.toUpperCase() === c.hex && styles.swatchOn]}
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

      <FieldGroup label="Wer sieht das Schaufenster?">
        <ChipGroup>
          <Chip label="Alle" selected={visibility === 'public'} onPress={() => setVisibility('public')} />
          <Chip label="Nur Eingeladene" selected={visibility === 'invite'} onPress={() => setVisibility('invite')} />
        </ChipGroup>
        <Text style={styles.meta}>
          {visibility === 'public'
            ? 'Alle in der App sehen Deine Posts und Termine, dazu alle im Internet auf der öffentlichen Seite.'
            : 'Name, Logo und Angaben sehen alle. Posts und Termine sehen nur Dein Team und Eingeladene.'}
        </Text>
        {/* Öffentliche Seite ohne Anmeldung, dort lassen sich Termine auch ohne Konto liken (Daria, 2026-11-10) */}
        {visibility === 'public' && showcase.visibility === 'public' ? (
          <CopyField label="Öffentliche Seite" value={showcasePublicLink(showcase.slug)} />
        ) : null}
        {visibility === 'invite' && showcase.visibility === 'invite' ? (
          <>
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
          </>
        ) : visibility === 'invite' ? (
          <Text style={styles.meta}>Link und Code zum Einladen erscheinen nach dem Speichern.</Text>
        ) : null}
      </FieldGroup>

      {requests.length ? (
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

      {group ? (
        <FieldGroup label="Wer darf posten?">
          <Text style={styles.meta}>Wer posten darf, erstellt auch Termine.</Text>
          {group.members.map((m) => {
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
          {group.members.length <= 1 ? <Text style={styles.meta}>Noch bist Du allein in der Gruppe.</Text> : null}
        </FieldGroup>
      ) : null}

      {failed ? <Notice variant="warning" message={failed} /> : null}
      <Button label="Schaufenster löschen" variant="danger" onPress={remove} />
    </SubScreen>
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

const styles = StyleSheet.create({
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
  previewBrand: { ...text.caption, fontSize: 9, lineHeight: 12, alignSelf: 'flex-end', fontFamily: font.semiBold },
  // Ecken rechteckig wie auf der öffentlichen Seite
  previewCover: { width: '100%', aspectRatio: 16 / 9 },
  // Logo rechts, Name links daneben und linksbündig, wie auf der öffentlichen Seite
  previewHead: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: space[8], marginTop: -space[20], paddingRight: space[8] },
  previewLogo: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, alignSelf: 'flex-start' },
  // Beginnt unter dem Titelbild, damit ein langer Name nach unten umbricht
  previewName: { fontFamily: font.onPhoto, fontSize: 19, lineHeight: 20, flex: 1, alignSelf: 'flex-start', marginTop: space[20] + space[6] },
  previewSmall: { ...text.caption, fontSize: 11, lineHeight: 14 },
  previewText: { ...text.caption },
  previewCard: { padding: space[8], borderRadius: radius.post, gap: space[2], marginTop: space[4] },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: color.text.secondary },
  swatchDefault: { width: 'auto', paddingHorizontal: space[12], justifyContent: 'center', backgroundColor: color.bg.surface },
  swatchOn: { borderWidth: 3, borderColor: color.accent.primary },
  swatchText: { ...text.caption, color: color.text.primary },
});
