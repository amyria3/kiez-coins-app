import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * UX/UI-Umfrage für Testerinnen und Tester. Fragen und Antworten im Wortlaut von Daria (21.10.2026).
 * Die Schlüssel stehen so in der Tabelle `survey_answers` (Migration 20261021001500).
 */
export type SurveyQuestion = {
  key: 'opinion' | 'frequency' | 'usability' | 'design' | 'support' | 'recommend' | 'reason';
  title: string;
  /** Mehrfachauswahl */
  multiple?: boolean;
  /** Zusätzliches Feld für eine eigene Antwort. Die Frage gilt als beantwortet mit Auswahl oder eigener Antwort. */
  freeText?: boolean;
  options: { key: string; label: string }[];
};

/** Reihenfolge der Antworten: von „top“ zu „flop“ (Daria, 26.10.2026). */
export const surveyQuestions: SurveyQuestion[] = [
  {
    // Ergänzt am 26.10.2026 (Daria: „mitunter wichtigste Frage“, an erster Stelle)
    key: 'frequency',
    title: 'Wie oft würdest Du die App nutzen?',
    options: [
      { key: 'often', label: 'Oft, vielleicht sogar täglich' },
      { key: 'sometimes', label: 'Gelegentlich' },
      { key: 'rarely', label: 'Eher ausnahmsweise' },
    ],
  },
  {
    key: 'opinion',
    title: 'Was denkst Du über diese App?',
    options: [
      { key: 'good_idea', label: 'Gute Idee' },
      { key: 'undecided', label: 'Weiß noch nicht' },
      { key: 'no_more_apps', label: '„Nicht noch eine App!“' },
    ],
  },
  {
    key: 'usability',
    title: 'Wie bequem und intuitiv findest Du die App?',
    options: [
      { key: 'intuitive', label: 'Sehr intuitiv, alles oder fast alles selbsterklärend' },
      { key: 'medium', label: 'Mittel' },
      { key: 'difficult', label: 'Gar nicht, sehr schwierig zu navigieren' },
    ],
  },
  {
    key: 'design',
    title: 'Wie findest Du das Design?',
    options: [
      { key: 'great', label: 'Klasse' },
      { key: 'meh', label: 'Naja' },
      { key: 'awful', label: 'Ganz furchtbar' },
    ],
  },
  {
    key: 'support',
    title: 'Könntest Du Dir vorstellen, das Team finanziell zu unterstützen?',
    multiple: true,
    options: [
      { key: 'buy_once', label: 'Einmal kaufen' },
      { key: 'subscribe', label: 'Abonnieren' },
      { key: 'cannot_afford', label: 'Kann mir keine weitere App leisten' },
      { key: 'pointless', label: 'Finde es sinnlos, für Apps zu zahlen' },
      { key: 'would_not_pay', label: 'Würde für diese App nicht bezahlen' },
    ],
  },
  {
    key: 'recommend',
    title: 'Würdest Du die App weiterempfehlen?',
    options: [
      { key: 'already', label: 'Hab ich schon' },
      { key: 'maybe', label: 'Kann es mir vorstellen' },
      { key: 'never_recommend', label: 'Nein, weil ich grundsätzlich keine Apps empfehle' },
      { key: 'nobody', label: 'Ich kenne keine potentiell interessierte Person' },
      { key: 'dislike', label: 'Nein, finde die App nicht gut' },
    ],
  },
  {
    // Ergänzt am 26.10.2026 als letzte Frage, mit eigener Antwort
    key: 'reason',
    title: 'Wieso hast Du die App getestet?',
    freeText: true,
    options: [
      { key: 'exciting', label: 'Klingt mega spannend' },
      { key: 'curious', label: 'Neugierde' },
      { key: 'nice', label: 'Wollte nur nett sein' },
    ],
  },
];

/** Antworten je Frage: Einfachauswahl als ein Schlüssel, Mehrfachauswahl als Liste. */
export type SurveyAnswer = {
  opinion: string;
  /** Fehlt bei Antworten vor dem 26.10.2026 */
  frequency: string | null;
  usability: string;
  design: string;
  support: string[];
  recommend: string;
  /** Frage „Wieso getestet?“: Auswahl und eigene Antwort, beides freiwillig, eins von beiden nötig */
  reason?: string | null;
  reason_other?: string | null;
  /** Freier Kommentar, freiwillig (Migration 20261026000100) */
  comment?: string | null;
};

/** Höchstlänge des Kommentars, wie in der Datenbank */
export const SURVEY_COMMENT_MAX = 1000;

/** Auswertung aus `survey_results()`: Anzahl Antworten und je Frage die Zahl pro Antwort. */
export type SurveyResults = {
  total: number;
  comments?: { text: string; at: string }[];
  /** Eigene Antworten zu „Wieso hast Du die App getestet?“ */
  reason_other?: { text: string; at: string }[];
} & Record<
  SurveyQuestion['key'],
  Record<string, number>
>;

// ---------------------------------------------------------------------------
// Wann die Umfrage von selbst erscheint
// ---------------------------------------------------------------------------

export type SurveySnooze = 'tomorrow' | 'week' | 'never';

const DAY = 24 * 60 * 60 * 1000;
const snoozeKey = (userId: string) => `survey.snooze.${userId}`;

/** Merkt sich auf diesem Gerät, wann die Umfrage wieder erscheinen darf. `never` gilt auch nach dem Absenden. */
export async function snoozeSurvey(userId: string, snooze: SurveySnooze) {
  const until = snooze === 'never' ? 'never' : new Date(Date.now() + (snooze === 'week' ? 7 : 1) * DAY).toISOString();
  try {
    await AsyncStorage.setItem(snoozeKey(userId), until);
  } catch {
    // Ohne Speicher erscheint die Umfrage beim nächsten Start wieder
  }
}

/** true, wenn die Umfrage auf diesem Gerät gerade nicht erscheinen soll. */
export async function isSurveySnoozed(userId: string): Promise<boolean> {
  try {
    const until = await AsyncStorage.getItem(snoozeKey(userId));
    if (!until) return false;
    return until === 'never' || new Date(until).getTime() > Date.now();
  } catch {
    return false;
  }
}

/** Ab so vielen Nutzungstagen fragt die App von selbst nach der Umfrage (Daria, 22.10.2026) */
export const SURVEY_AFTER_DAYS = 3;
const USAGE_KEY = 'usage_days_v1';

/**
 * Merkt sich den heutigen Tag als Nutzungstag (auf diesem Gerät) und gibt zurück,
 * an wie vielen verschiedenen Tagen die App schon offen war.
 */
export async function countUsageDay(): Promise<number> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const days: string[] = JSON.parse((await AsyncStorage.getItem(USAGE_KEY)) ?? '[]');
    if (!days.includes(today)) {
      days.push(today);
      await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(days.slice(-30)));
    }
    return days.length;
  } catch {
    return 0;
  }
}
