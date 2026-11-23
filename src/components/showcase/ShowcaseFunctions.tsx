import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

import {
  BOOKING_PATTERN,
  CAL_SIGNUP_URL,
  loadBookingUrl,
  loadFriendRequestsSwitch,
  loadShowcaseFunctions,
  setBookingUrl,
  setFriendRequestsSwitch,
  setShowcaseFunction,
  setShowcaseVisibility,
  type Showcase,
  type ShowcaseFunctions as Functions,
  type Visibility,
} from '../../data/showcase';
import { space } from '../../theme/tokens';
import { Button } from '../Button';
import { FieldGroup, Notice, QuestionHint } from '../Content';
import { SwitchRow, TextField } from '../Form';

/** Kostenloses Unternehmensprofil bei Google anlegen (Google Business Profile) */
const GOOGLE_PROFILE_URL = 'https://business.google.com/create';
/** Auf diesem Gerät gemerkt: Online-Buchung bewusst ausgeschaltet, solange kein Link gespeichert ist */
const bookingOffKey = (id: string) => `schaufenster-buchung-aus-${id}`;

/**
 * „Funktionen“ auf der Seite „Schaufenster“ (Daria, 2026-11-23): alles, was sich an- und ausschalten lässt, als
 * Schalter, der sofort speichert. Regel (UX/UI-Regeln › Schalter): Was es nur mit eingeschaltetem Schalter gibt, steht
 * darunter und erscheint erst, wenn er an ist (SwitchRow `children`).
 * - „Für alle sichtbar, auch im Web“ (visibility): an zeigt darunter „Bei Google finden lassen“ und „Kalender-Abo“, die
 *   nur mit einer Seite im Web wirken; aus zeigt den Weg zur Einladung.
 * - „Online-Buchung“: an zeigt das Feld für den Buchungslink mit Frage. Ohne Link ist der Schalter an (nichts ist von
 *   Anfang an aus); bewusst ausgeschaltet merkt sich das Gerät, mit Link entfernt Ausschalten den Link.
 * - „Freundschaftsanfragen über das Schaufenster“.
 * Ohne die Migrationen fehlen die jeweiligen Schalter.
 */
export function ShowcaseFunctions({ showcase: s, onOpenInvite, onChanged }: { showcase: Showcase; onOpenInvite: () => void; onChanged: () => void }) {
  const [visibility, setVisibility] = useState<Visibility>(s.visibility);
  const [fn, setFn] = useState<Functions | null | undefined>(undefined);
  const [friends, setFriends] = useState<boolean | undefined>(undefined);
  // Buchungslink: gespeichert (null = keiner), Entwurf im Feld, bewusst aus
  const [booking, setBooking] = useState<string | null | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [bookingOff, setBookingOff] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const [failed, setFailed] = useState(false);
  const online = s.switches.online;
  const isPublic = visibility === 'public';

  useEffect(() => setVisibility(s.visibility), [s.visibility]);
  useFocusEffect(
    useCallback(() => {
      loadShowcaseFunctions(s.id).then(setFn, () => setFn(null));
      loadFriendRequestsSwitch(s.id).then(setFriends, () => setFriends(undefined));
      loadBookingUrl(s.id).then(
        (url) => {
          setBooking(url);
          setDraft(url ?? '');
        },
        () => setBooking(undefined),
      );
      AsyncStorage.getItem(bookingOffKey(s.id)).then(
        (v) => setBookingOff(v === '1'),
        () => {},
      );
    }, [s.id]),
  );

  /** Sofort speichern, bei einem Fehler zurückdrehen und Bescheid sagen */
  const attempt = async (apply: () => void, undo: () => void, save: () => Promise<boolean>) => {
    setFailed(false);
    apply();
    if (!(await save())) {
      undo();
      setFailed(true);
      return false;
    }
    return true;
  };
  const toggleVisibility = async (on: boolean) => {
    const next: Visibility = on ? 'public' : 'invite';
    if (await attempt(() => setVisibility(next), () => setVisibility(on ? 'invite' : 'public'), () => setShowcaseVisibility(s, next))) onChanged();
  };
  const toggle = (key: keyof Functions, on: boolean) =>
    fn && attempt(() => setFn({ ...fn, [key]: on }), () => setFn((cur) => (cur ? { ...cur, [key]: !on } : cur)), () => setShowcaseFunction(s.id, key, on));
  const toggleFriends = (on: boolean) => attempt(() => setFriends(on), () => setFriends(!on), () => setFriendRequestsSwitch(s.id, on));
  const toggleBooking = async (on: boolean) => {
    setBookingOff(!on);
    AsyncStorage.setItem(bookingOffKey(s.id), on ? '0' : '1').catch(() => {});
    // Ausschalten mit Link entfernt den Link; der Entwurf im Feld bleibt, falls sie gleich wieder einschaltet
    if (!on && booking) await attempt(() => setBooking(null), () => setBooking(booking), () => setBookingUrl(s.id, null));
  };
  const saveBooking = async () => {
    setSavingBooking(true);
    const url = draft.trim();
    await attempt(() => setBooking(url || null), () => setBooking(booking), () => setBookingUrl(s.id, url || null));
    setSavingBooking(false);
  };

  const draftOk = !draft.trim() || BOOKING_PATTERN.test(draft.trim());
  const bookingOn = !bookingOff || !!booking;

  return (
    <FieldGroup heading label="Funktionen">
      <View style={styles.list}>
        <SwitchRow
          label="Für alle sichtbar, auch im Web"
          description={
            isPublic
              ? 'Alle sehen Deine Posts und Termine, in der App und auf Deiner Seite im Web.'
              : 'Posts und Termine sehen nur Dein Team und Leute, die Du einlädst. Name, Logo und Angaben sehen alle.'
          }
          value={isPublic}
          onValueChange={toggleVisibility}
        >
          {fn ? (
            <>
              <SwitchRow
                label="Bei Google finden lassen"
                description={
                  !online
                    ? 'Geht nur, solange Dein Schaufenster online ist.'
                    : fn.searchListing
                      ? 'Google und andere Suchmaschinen nehmen Deine Seite auf.'
                      : 'Suchmaschinen nehmen Deine Seite nicht auf. Wer den Link hat, sieht sie trotzdem.'
                }
                value={fn.searchListing}
                onValueChange={(on) => toggle('searchListing', on)}
                disabled={!online}
              >
                <QuestionHint
                  question="Wie finden mich Leute bei Google Maps?"
                  answer="Google liest Deine Seite im Web: Name, Adresse, Karte, Öffnungszeiten und Termine. Für Google Maps legst Du kostenlos ein Unternehmensprofil an und trägst dort den Link zu Deiner Seite als Website ein. Google prüft den Eintrag, das dauert einige Tage."
                  then={<Button label="Google-Unternehmensprofil anlegen" variant="secondary" iconEnd="external" onPress={() => Linking.openURL(GOOGLE_PROFILE_URL)} />}
                />
              </SwitchRow>
              <SwitchRow
                label="Kalender-Abo"
                description={
                  !online
                    ? 'Geht nur, solange Dein Schaufenster online ist.'
                    : fn.calendarFeed
                      ? 'Deine Kundschaft abonniert Deine Termine. Neue erscheinen von selbst in ihrem Kalender.'
                      : 'Auf Deiner Seite gibt es kein Kalender-Abo.'
                }
                value={fn.calendarFeed}
                onValueChange={(on) => toggle('calendarFeed', on)}
                disabled={!online}
              >
                <QuestionHint
                  question="Wie funktioniert das Kalender-Abo?"
                  answer="Auf Deiner Seite im Web steht bei den Terminen „Kalender abonnieren“. Wer abonniert, bekommt jeden neuen Termin von selbst in den eigenen Kalender. Schaltest Du das Abo aus, verschwindet der Knopf, und auch bestehende Abos bekommen keine neuen Termine mehr."
                />
              </SwitchRow>
            </>
          ) : null}
        </SwitchRow>
        {!isPublic ? <Button label="Leute einladen" variant="secondary" icon="friends" onPress={onOpenInvite} /> : null}

        {booking !== undefined ? (
          <SwitchRow
            label="Online-Buchung"
            description={
              !bookingOn
                ? 'Auf Deiner Seite gibt es keinen Knopf zum Buchen.'
                : booking
                  ? 'Auf Deiner Seite steht „Termin buchen“.'
                  : 'Trag Deinen Buchungslink ein, dann steht auf Deiner Seite „Termin buchen“.'
            }
            value={bookingOn}
            onValueChange={toggleBooking}
          >
            <TextField
              label="Buchungslink"
              value={draft}
              onChangeText={setDraft}
              maxLength={300}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="https://cal.com/kiezblick"
              error={draftOk ? undefined : 'Der Link beginnt mit https://'}
            />
            {draft.trim() !== (booking ?? '') ? (
              <Button label="Buchungslink speichern" busy={savingBooking} disabled={!draftOk} onPress={saveBooking} />
            ) : null}
            <QuestionHint
              question="Wie bekomme ich einen Buchungslink?"
              answer="Mit einem kostenlosen Konto bei Cal.com legst Du fest, wann man bei Dir Termine buchen kann. Den Link zu Deiner Buchungsseite trägst Du hier ein. Im Schaufenster steht dann „Termin buchen“. Andere Buchungsdienste gehen auch."
              then={<Button label="Cal.com-Konto anlegen" variant="secondary" iconEnd="external" onPress={() => Linking.openURL(CAL_SIGNUP_URL)} />}
            />
          </SwitchRow>
        ) : null}

        {friends !== undefined ? (
          <SwitchRow
            label="Freundschaftsanfragen über das Schaufenster"
            description={
              friends
                ? 'Wer Deine Seite oder Digitale Visitenkarte öffnet, kann Dir mit einem Tipp eine Freundschaftsanfrage schicken.'
                : 'Auf Deiner Seite erscheint kein Knopf zum Anfreunden.'
            }
            value={friends}
            onValueChange={toggleFriends}
          >
            <QuestionHint
              question="Was passiert bei einer Freundschaftsanfrage?"
              answer="Die Anfrage kommt in der App bei Dir an. Du entscheidest, ob Du sie annimmst. Erst dann seid Ihr in KiezCoins befreundet."
            />
          </SwitchRow>
        ) : null}
        {failed ? <Notice variant="warning" message="Das hat nicht geklappt. Probier es gleich noch mal." onClose={() => setFailed(false)} /> : null}
      </View>
    </FieldGroup>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[12] },
});
