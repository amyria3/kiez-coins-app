/**
 * Begrüßung nach dem Anheuern (Route `tour`): kurze Videos zu den Hauptfunktionen.
 *
 * Videos nachreichen: Datei nach `assets/tour/` legen (MP4, H.264, Hochformat 9:16, unter 10 MB)
 * und bei `video` eintragen, z. B. `video: require('../../assets/tour/posten.mp4')`.
 * Alternativ eine öffentliche Adresse, z. B. aus dem Supabase-Storage: `video: 'https://…/posten.mp4'`.
 * Ohne Video zeigt die Seite den Kater.
 */
export type TourStep = {
  key: string;
  title: string;
  text: string;
  /** require('…mp4') oder https-Adresse */
  video?: number | string;
};

export const tourSteps: TourStep[] = [
  {
    key: 'posten',
    title: 'Foto machen, Challenge posten',
    text: 'Siehst Du etwas, das im Kiez zu tun ist? Tipp auf die Kamera, gib einen Titel und den Ort an. Coins sind freiwillig. Oder teil einfach ein schönes Bild.',
  },
  {
    key: 'annehmen',
    title: 'Annehmen und anpacken',
    text: 'Nimm eine Challenge in Deiner Nähe an, erledige sie und zeig das Ergebnis mit einem Foto. Die Person bestätigt, dann ist es geschafft.',
  },
  {
    key: 'coins',
    title: 'Coins direkt, Vertrauen zuerst',
    text: 'Wer Coins verspricht, zahlt sie direkt an Dich, per Überweisung oder PayPal. Kiez Coins bewegt kein Geld.',
  },
  {
    key: 'gruppen',
    title: 'Gruppen für WG, Familie und Verein',
    text: 'Verteilt Aufgaben unter Euch und sammelt Edensteine. Sie gelten nur in Eurer Gruppe.',
  },
];

export const TOUR_SEEN_KEY = 'tour_seen_v1';
