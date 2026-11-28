// Pille über dem Tagesstapel (Daria, 2026-11-28): „Du hast Dir vorgenommen: Tatum anrufen, Klavier spielen, 5 min
// Yoga und … Du hast heute außerdem ganze 3 Termine. WTF.“ Ohne Speicher und Netz, die Übersetzung kommt von außen
// (`tr`, in der App `t` aus texts.ts). Getestet in tests/daySummary.test.ts.

type Tr = (original: string, vars?: Record<string, string | number>) => string;

export type DaySummaryInput = {
  /** „Heute“, „Morgen“ oder „Mo, 30.11.“ */
  day: string;
  today: boolean;
  /** Offene Vorhaben des Tags, schon mit großem Anfangsbuchstaben */
  tasks: string[];
  /** Termine des Tags: Erinnerungen mit Uhrzeit, verbundene Kalender, Vorgemerktes */
  dates: number;
};

/** „A“, „A und B“, „A, B und C“ */
export function joinList(items: string[], tr: Tr): string {
  if (items.length < 2) return items.join('');
  return tr('{list} und {last}', { list: items.slice(0, -1).join(', '), last: items[items.length - 1] });
}

function datesText(n: number, tr: Tr): string {
  if (n === 1) return tr('einen Termin');
  if (n === 2) return tr('zwei Termine');
  return tr('ganze {n} Termine', { n });
}

/** Leerer Text: Heute steht nichts Offenes an, die Liste wählt dann selbst (z. B. „alles erledigt“) */
export function daySummary({ day, today, tasks, dates }: DaySummaryInput, tr: Tr): string {
  const parts: string[] = [];
  if (tasks.length) parts.push(tr('Du hast Dir vorgenommen: {list}.', { list: joinList(tasks, tr) }));
  if (dates) {
    const what = datesText(dates, tr);
    if (today) parts.push(tasks.length ? tr('Du hast heute außerdem {what}.', { what }) : tr('Du hast heute {what}.', { what }));
    else parts.push(tr('{day} hast Du {what}.', { day: day === 'Morgen' ? day : tr('Am {day}', { day }), what }));
    if (dates >= 3) parts.push(tr('WTF.'));
  }
  if (!parts.length && !today) return tr('{day} steht noch nichts an.', { day: day === 'Morgen' ? day : tr('Am {day}', { day }) });
  return parts.join(' ');
}
