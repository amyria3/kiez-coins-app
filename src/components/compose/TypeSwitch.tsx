import { Segments } from '../FeedHeader';

/**
 * Schalter für den Beitragstyp beim Erstellen (Daria, 23.10.2026): Text, Bild, Me-Challenge, We-Challenge.
 * Look „Kiez“: derselbe gezeichnete Umschalter wie der Ort darüber (Privat / Gruppe / Kiez / Überall),
 * also Spur und geneigter Knopf aus `Segments` (Daria, 09.11.2026).
 * Die Auswahl ist immer in der Akzentfarbe des Bereichs (lila, unter „Privat“ gelb). Papierweiß wird sie nur im
 * Umschalter des Feeds (Daria, 2026-11-15: beim Erstellen und Bearbeiten kein Farbwechsel nach dem Berühren).
 */
export function TypeSwitch<K extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  /** Früher: lila bis zum ersten Berühren. Ohne Wirkung mehr, bleibt für bestehende Aufrufe. */
  turn?: boolean;
}) {
  return <Segments tabs={options.map((o) => ({ key: o.key, label: o.label }))} selectedKey={value} onChange={onChange} accent />;
}
