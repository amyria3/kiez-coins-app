import { useCallback, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  loadFriendRequestsSwitch,
  loadShowcaseFunctions,
  setFriendRequestsSwitch,
  setShowcaseFunction,
  type Showcase,
  type ShowcaseFunctions as Functions,
} from '../../data/showcase';
import { space } from '../../theme/tokens';
import { Button } from '../Button';
import { FieldGroup, Notice, QuestionHint } from '../Content';
import { SwitchRow } from '../Form';

/** Kostenloses Unternehmensprofil bei Google anlegen (Google Business Profile) */
const GOOGLE_PROFILE_URL = 'https://business.google.com/create';

/**
 * „Funktionen“ auf der Seite „Schaufenster“ (2026-11-23): nur echte An/Aus-Schalter, je mit einer Frage zum Ablauf,
 * wie in „Dein Konto › Funktionen“. Alles mit Eingaben steht unter „Einstellungen“.
 * - Kalender-Abo und „Bei Google finden lassen“ wirken nur bei „Alle“ und online. Sonst sind sie ausgegraut; ein Tipp
 *   erklärt warum und führt zu „Wer sieht das Schaufenster?“. Ohne Migration 20261123000200 fehlen beide.
 * - Jeder Schalter speichert sofort.
 */
export function ShowcaseFunctions({ showcase: s, onOpenVisibility }: { showcase: Showcase; onOpenVisibility: () => void }) {
  const [fn, setFn] = useState<Functions | null | undefined>(undefined);
  const [friends, setFriends] = useState<boolean | undefined>(undefined);
  const [why, setWhy] = useState(false);
  const [failed, setFailed] = useState(false);
  const usable = s.visibility === 'public' && s.switches.online;

  useFocusEffect(
    useCallback(() => {
      loadShowcaseFunctions(s.id).then(setFn, () => setFn(null));
      loadFriendRequestsSwitch(s.id).then(setFriends, () => setFriends(undefined));
    }, [s.id]),
  );

  const toggle = async (key: keyof Functions, on: boolean) => {
    if (!fn) return;
    setFailed(false);
    setFn({ ...fn, [key]: on });
    if (!(await setShowcaseFunction(s.id, key, on))) {
      setFn((cur) => (cur ? { ...cur, [key]: !on } : cur));
      setFailed(true);
    }
  };
  const toggleFriends = async (on: boolean) => {
    setFailed(false);
    setFriends(on);
    if (!(await setFriendRequestsSwitch(s.id, on))) {
      setFriends(!on);
      setFailed(true);
    }
  };

  if (!fn && friends === undefined) return null;

  return (
    <FieldGroup heading label="Funktionen">
      <View style={styles.list}>
        {why ? (
          <Notice
            message={
              s.switches.online
                ? 'Kalender-Abo und Google gibt es nur, wenn Dein Schaufenster auf „Alle“ steht. Dann hat es eine Seite im Web.'
                : 'Kalender-Abo und Google gibt es nur, solange Dein Schaufenster online ist.'
            }
            action={s.switches.online ? { label: 'Zu „Wer sieht das Schaufenster?“', onPress: onOpenVisibility } : undefined}
            onClose={() => setWhy(false)}
          />
        ) : null}
        {fn ? (
          <>
            <SwitchRow
              label="Kalender-Abo"
              description={
                fn.calendarFeed
                  ? 'Deine Kundschaft abonniert Deine Termine. Neue erscheinen von selbst in ihrem Kalender.'
                  : 'Auf Deiner Seite gibt es kein Kalender-Abo.'
              }
              value={fn.calendarFeed}
              onValueChange={(on) => toggle('calendarFeed', on)}
              disabled={!usable}
              whyDisabled={() => setWhy(true)}
            />
            <QuestionHint
              question="Wie funktioniert das Kalender-Abo?"
              answer="Auf Deiner Seite im Web steht bei den Terminen „Kalender abonnieren“. Wer abonniert, bekommt jeden neuen Termin von selbst in den eigenen Kalender. Schaltest Du das Abo aus, verschwindet der Knopf, und auch bestehende Abos bekommen keine neuen Termine mehr."
            />
            <SwitchRow
              label="Bei Google finden lassen"
              description={
                fn.searchListing
                  ? 'Google und andere Suchmaschinen nehmen Deine Seite auf.'
                  : 'Suchmaschinen nehmen Deine Seite nicht auf. Wer den Link hat, sieht sie trotzdem.'
              }
              value={fn.searchListing}
              onValueChange={(on) => toggle('searchListing', on)}
              disabled={!usable}
              whyDisabled={() => setWhy(true)}
            />
            <QuestionHint
              question="Wie finden mich Leute bei Google Maps?"
              answer="Google liest Deine Seite im Web: Name, Adresse, Karte, Öffnungszeiten und Termine. Für Google Maps legst Du kostenlos ein Unternehmensprofil an und trägst dort den Link zu Deiner Seite als Website ein. Google prüft den Eintrag, das dauert einige Tage."
              then={
                usable && fn.searchListing ? (
                  <Button label="Google-Unternehmensprofil anlegen" variant="secondary" iconEnd="external" onPress={() => Linking.openURL(GOOGLE_PROFILE_URL)} />
                ) : undefined
              }
            />
          </>
        ) : null}
        {friends !== undefined ? (
          <>
            <SwitchRow
              label="Freundschaftsanfragen über das Schaufenster"
              description={
                friends
                  ? 'Wer Deine Seite oder Digitale Visitenkarte öffnet, kann Dir mit einem Tipp eine Freundschaftsanfrage schicken.'
                  : 'Auf Deiner Seite erscheint kein Knopf zum Anfreunden.'
              }
              value={friends}
              onValueChange={toggleFriends}
            />
            <QuestionHint
              question="Was passiert bei einer Freundschaftsanfrage?"
              answer="Die Anfrage kommt in der App bei Dir an. Du entscheidest, ob Du sie annimmst. Erst dann seid Ihr in KiezCoins befreundet."
            />
          </>
        ) : null}
        {failed ? <Notice variant="warning" message="Das hat nicht geklappt. Probier es gleich noch mal." onClose={() => setFailed(false)} /> : null}
      </View>
    </FieldGroup>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[12] },
});
