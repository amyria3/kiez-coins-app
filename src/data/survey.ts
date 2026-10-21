import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * UX/UI-Umfrage für Testerinnen und Tester. Fragen und Antworten im Wortlaut von Daria (21.10.2026).
 * Die Schlüssel stehen so in der Tabelle `survey_answers` (Migration 20261021001500).
 */
export type SurveyQuestion = {
  key: 'opinion' | 'usability' | 'design' | 'support' | 'recommend';
  title: string;
  /** Mehrfachauswahl */
  multiple?: boolean;
  options: { key: string; label: string }[];
};

export const surveyQuestions: SurveyQuestion[] = [
  {
    key: 'opinion',
    title: 'Was denkst Du über diese App?',
    options: [
      { key: 'no_more_apps', label: '„Nicht noch eine App!“' },
      { key: 'good_idea', label: 'Gute Idee' },
      { key: 'undecided', label: 'Weiß noch nicht' },
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
];

/** Antworten je Frage: Einfachauswahl als ein Schlüssel, Mehrfachauswahl als Liste. */
export type SurveyAnswer = {
  opinion: string;
  usability: string;
  design: string;
  support: string[];
  recommend: string;
};

/** Auswertung aus `survey_results()`: Anzahl Antworten und je Frage die Zahl pro Antwort. */
export type SurveyResults = { total: number } & Record<SurveyQuestion['key'], Record<string, number>>;

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
