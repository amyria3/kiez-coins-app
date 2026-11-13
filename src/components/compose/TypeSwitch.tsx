import { useEffect, useState } from 'react';

import { Segments } from '../FeedHeader';
import { usePrivateSignal } from '../../theme/signal';

/**
 * Schalter für den Beitragstyp beim Erstellen (Daria, 23.10.2026): Text, Bild, Me-Challenge, We-Challenge.
 * Look „Kiez“: derselbe gezeichnete Umschalter wie der Ort darüber (Privat / Gruppe / Kiez / Überall),
 * also Spur und geneigter Knopf aus `Segments` (Daria, 09.11.2026).
 */
export function TypeSwitch<K extends string>({
  options,
  value,
  onChange,
  turn = true,
}: {
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  /**
   * Die Auswahl ist lila, solange die Person den Typ nicht berührt hat und `turn` gilt; danach schwarz-weiß
   * wie der Ort darüber. So sieht man, was eingestellt ist (Daria, 2026-10-31). Im Erstellen-Blatt wird der Typ
   * erst lila, wenn der Ort bestätigt ist.
   */
  turn?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  // Unter „Privat“ bleibt die Auswahl gelb, auch nach dem Berühren (Daria, 2026-11-13)
  const signal = usePrivateSignal();
  const accent = signal || (turn && !touched);
  // Ist der Ort wieder offen (Blatt neu geöffnet), beginnt auch der Typ von vorn
  useEffect(() => {
    if (!turn) setTouched(false);
  }, [turn]);
  const pick = (key: K) => {
    setTouched(true);
    onChange(key);
  };
  return <Segments tabs={options.map((o) => ({ key: o.key, label: o.label }))} selectedKey={value} onChange={pick} accent={accent} />;
}
