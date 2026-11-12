import { useEffect, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import { findPlace, roundCoords, type Coords } from '../../data/location';
import { showcaseOfGroup } from '../../data/showcase';
import { useStore } from '../../data/store';
import type { Challenge } from '../../data/types';
import { Button } from '../Button';
import { QuestionHint } from '../Content';
import { TextField } from '../Form';

/**
 * Ist die Gruppe öffentlich? Gruppen werden über ihr Schaufenster öffentlich: Sichtbarkeit „Alle“ und online.
 * Ohne Schaufenster, im Demo-Modus oder bei einem Fehler: nicht öffentlich.
 */
export function usePublicGroup(groupId: string | undefined): boolean {
  const { mode } = useStore();
  const [isPublic, setIsPublic] = useState(false);
  useEffect(() => {
    if (!groupId || mode !== 'live') return setIsPublic(false);
    let alive = true;
    showcaseOfGroup(groupId).then((s) => {
      if (alive) setIsPublic(!!s && s.visibility === 'public' && s.switches.online);
    });
    return () => {
      alive = false;
    };
  }, [groupId, mode]);
  return isPublic;
}

/**
 * Ort für Posts in öffentlichen Gruppen (Daria, 2026-11-12: „Bitte auch für öffentliche Gruppen Location teilen
 * erlauben“). Freiwillig, mit „Aktuellen Standort verwenden“ wie im Kiez. In anderen Gruppen gibt es kein Feld,
 * der Ort eines Entwurfs bleibt aber erhalten.
 */
export function useGroupPlace(
  groupId: string | undefined,
  draft?: Challenge,
): { location: string; coords?: Coords; field: ReactNode } {
  const isPublic = usePublicGroup(groupId);
  const [location, setLocation] = useState(draft?.location ?? '');
  const [coords, setCoords] = useState<Coords | undefined>(draft?.coords);
  const [locating, setLocating] = useState(false);

  const useCurrent = async () => {
    setLocating(true);
    try {
      const place = await findPlace();
      setLocation(place.street ?? place.kiez);
      setCoords(roundCoords(place.coords));
    } catch {
      Alert.alert('Standort nicht gefunden', 'Gib den Ort von Hand ein oder erlaube den Standort in den Einstellungen.');
    } finally {
      setLocating(false);
    }
  };

  const field = isPublic ? (
    <>
      <TextField
        label="Ort"
        helperText="Optional. Vorschlag auf Grundlage Deines Standorts, ohne Hausnummer."
        value={location}
        maxLength={120}
        onChangeText={(value) => {
          setLocation(value);
          // Von Hand geändert: Der Punkt passt nicht mehr sicher dazu
          setCoords(undefined);
        }}
      />
      <Button
        busy={locating}
        label={locating ? 'Suche Standort …' : 'Aktuellen Standort verwenden'}
        variant="secondary"
        onPress={useCurrent}
        disabled={locating}
      />
      <QuestionHint
        question="Welchen Ort gebe ich an?"
        answer="Einen öffentlichen Ort, den viele kennen, zum Beispiel einen Platz, eine Straßenecke oder ein Geschäft. Gib nie eine Wohnadresse an. Sei sorgsam mit der Sicherheit anderer Menschen."
      />
    </>
  ) : null;

  return { location, coords, field };
}
