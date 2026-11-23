import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { deleteShowcase, loadBookingUrl, shortLink, type Showcase } from '../../data/showcase';
import { t } from '../../data/texts';
import { FieldGroup } from '../Content';
import { NavRow } from '../Rows';

/** Bereiche des Bildschirms `schaufenster/[id]/einstellungen` */
export type SettingsArea = 'sichtbarkeit' | 'posten' | 'buchung' | 'aussehen' | 'adresse';

/**
 * „Einstellungen“ auf der Seite „Schaufenster“ (2026-11-23): graue Zeilen mit Wert, jede öffnet einen kleinen eigenen
 * Bildschirm. Was nur an oder aus ist, steht als Schalter unter „Funktionen“. Löschen ist die letzte Zeile, in Rot.
 */
export function ShowcaseSettingsRows({ showcase: s, onOpen, onDeleted }: { showcase: Showcase; onOpen: (area: SettingsArea) => void; onDeleted: () => void }) {
  const [booking, setBooking] = useState<string | undefined>(undefined);
  useFocusEffect(
    useCallback(() => {
      loadBookingUrl(s.id).then(setBooking, () => setBooking(undefined));
    }, [s.id]),
  );

  const remove = () =>
    Alert.alert(t('Schaufenster löschen?'), t('Alle Posts und Termine im Schaufenster verschwinden. Das lässt sich nicht rückgängig machen.'), [
      { text: t('Abbrechen'), style: 'cancel' },
      {
        text: t('Löschen'),
        style: 'destructive',
        onPress: async () => {
          if (await deleteShowcase(s.id)) onDeleted();
        },
      },
    ]);

  return (
    <FieldGroup heading label="Einstellungen">
      <NavRow label="Wer sieht das Schaufenster?" value={s.visibility === 'public' ? t('Alle') : t('Nur Eingeladene')} onPress={() => onOpen('sichtbarkeit')} />
      <NavRow label="Wer darf posten?" onPress={() => onOpen('posten')} />
      <NavRow label="Online-Buchung" value={booking ? shortLink(booking) : t('Aus')} onPress={() => onOpen('buchung')} />
      <NavRow label="Aussehen" value={t('Farbe, Services')} onPress={() => onOpen('aussehen')} />
      <NavRow label="Adresse und Suchmaschinen" value={`kiezcoins.de/s/${s.slug}`} onPress={() => onOpen('adresse')} />
      <NavRow label="Schaufenster löschen" tone="danger" onPress={remove} />
    </FieldGroup>
  );
}
