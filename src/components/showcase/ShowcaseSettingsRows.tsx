import { Alert } from 'react-native';

import { deleteShowcase, type Showcase } from '../../data/showcase';
import { t } from '../../data/texts';
import { FieldGroup } from '../Content';
import { NavRow } from '../Rows';

/** Bereiche des Bildschirms `schaufenster/[id]/einstellungen` */
export type SettingsArea = 'sichtbarkeit' | 'posten' | 'aussehen' | 'adresse';

/**
 * „Einstellungen“ auf der Seite „Schaufenster“ (2026-11-23): graue Zeilen mit Wert, jede öffnet einen kleinen eigenen
 * Bildschirm. Was sich an- und ausschalten lässt, steht als Schalter unter „Funktionen“, auch Sichtbarkeit und
 * Online-Buchung (Daria, 2026-11-23). Die Einladung (`sichtbarkeit`) öffnet der Schalter „Für alle sichtbar“ im
 * ausgeschalteten Zustand. Löschen ist die letzte Zeile, in Rot.
 */
export function ShowcaseSettingsRows({ showcase: s, onOpen, onDeleted }: { showcase: Showcase; onOpen: (area: SettingsArea) => void; onDeleted: () => void }) {
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
      <NavRow label="Wer darf posten?" onPress={() => onOpen('posten')} />
      <NavRow label="Aussehen" value={t('Farbe, Services')} onPress={() => onOpen('aussehen')} />
      <NavRow label="Adresse und Suchmaschinen" value={`kiezcoins.de/s/${s.slug}`} onPress={() => onOpen('adresse')} />
      <NavRow label="Schaufenster löschen" tone="danger" onPress={remove} />
    </FieldGroup>
  );
}
