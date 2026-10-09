import type { Challenge, User } from './types';

// Beispieldaten aus den Figma-Screens. Fotos: assets/sample (aus Figma exportiert).

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();
const inFuture = (ms: number) => new Date(now + ms).toISOString();
const inPast = (ms: number) => new Date(now - ms).toISOString();

export const images = {
  garden: require('../../assets/sample/garden.png'),
  cleanupAfter: require('../../assets/sample/cleanup-after.png'),
  cleanupBefore: require('../../assets/sample/cleanup-before.png'),
  avatarPeter: require('../../assets/sample/avatar-peter.png'),
};

export const sampleUsers: User[] = [
  {
    id: 'peter',
    name: 'Peter J.',
    firstName: 'Peter',
    avatar: images.avatarPeter,
  },
  {
    id: 'gardeners',
    name: 'Nachbarschaftsgärtner*innen',
    firstName: 'Nachbarschaftsgärtner*innen',
    group: true,
    payout: {
      accountHolder: 'Nachbarschaftsgärtner*innen e. V.',
      // Wie in Figma, aber mit gültiger Prüfziffer (Figma: DE12 …)
      iban: 'DE38 4306 0967 1234 5648 21',
      paypal: 'garten@example.org',
    },
  },
];

export const sampleChallenges: Challenge[] = [
  {
    id: 'garten-kuf',
    type: 'individual',
    title: 'Gartensanierung im KulturHaus KUF',
    text: 'KulturHaus KUF freut sich über Hilfe bei der Sanierung des Nachbarschaftsgartens. Gebraucht werden Schaufeln, Handschuhe und ein paar helfende Hände am Samstag ab 10 Uhr. Wasser und Kaffee gibt es vor Ort.',
    authorId: 'peter',
    location: 'Radebergerstr. 12, 04188 Leipzig',
    bountyAmount: 15,
    status: 'open',
    image: images.garden,
    likedByMe: false,
    deadline: inFuture(5 * DAY + 12 * HOUR),
    createdAt: inPast(2 * HOUR),
  },
  {
    id: 'tempelhofer-feld',
    type: 'wave',
    title: 'Müll auf dem Tempelhofer Feld',
    text: 'Nachbarschaftsgärtner*innen in der Fachhochschule: heute mit @DeinSchönerNachbar',
    challengeText:
      'Hilfe! Auf dem Tempelhofer Feld hat sich nach den letzten paar Festivals einiges an Müll angesammelt. Wir möchten am Sonntag gemeinsam aufräumen. Greifzangen und Säcke sind da.',
    authorId: 'gardeners',
    location: 'Tempelhofer Feld',
    status: 'confirmed',
    imageAfter: images.cleanupAfter,
    imageBefore: images.cleanupBefore,
    likedByMe: true,
    deadline: inPast(1 * DAY),
    createdAt: inPast(3 * DAY),
  },
  // Die folgenden drei sind die Top-Challenges in der Leiste oben im Feed.
  // „Müll Grünstreifen“ und „Hilfe Sommerfest“ stehen schon weiter im Ablauf,
  // damit sich die Flows „Erledigung bestätigen“ und „Bounty auf Vertrauen“ direkt ausprobieren lassen.
  {
    id: 'igelnest',
    type: 'individual',
    title: 'Reparatur Igelnest',
    text: 'Das Igelhaus im Hinterhof ist beim letzten Sturm umgekippt. Wer hilft, es wieder aufzubauen und mit Laub zu füllen?',
    authorId: 'peter',
    location: 'Radebergerstr. 12, 04188 Leipzig',
    bountyAmount: 5,
    status: 'open',
    image: images.garden,
    likedByMe: false,
    deadline: inFuture(2 * DAY + 4 * HOUR),
    createdAt: inPast(5 * HOUR),
  },
  {
    id: 'gruenstreifen-malibu',
    type: 'individual',
    title: 'Müll Grünstreifen vor Malibu',
    text: 'Auf dem Grünstreifen vor dem Malibu liegen seit dem Wochenende Flaschen und Verpackungen. Säcke und Handschuhe stelle ich bereit.',
    authorId: 'peter',
    assigneeId: 'gardeners',
    location: 'Radebergerstr. 12, 04188 Leipzig',
    bountyAmount: 15,
    status: 'reported',
    image: images.cleanupBefore,
    likedByMe: false,
    deadline: inFuture(3 * DAY),
    createdAt: inPast(2 * DAY),
    report: {
      photo: images.cleanupAfter,
      note: 'Beete sind frei, Werkzeug liegt wieder im Schuppen.',
      shareIban: true,
      sharePaypal: false,
    },
  },
  {
    id: 'sommerfest',
    type: 'individual',
    title: 'Hilfe Sommerfest',
    text: 'Für das Sommerfest im Hof brauchen wir Hilfe beim Aufbau von Bänken und Pavillons.',
    authorId: 'peter',
    assigneeId: 'gardeners',
    location: 'Radebergerstr. 12, 04188 Leipzig',
    bountyAmount: 15,
    status: 'paid_marked',
    image: images.cleanupAfter,
    likedByMe: false,
    deadline: inPast(2 * DAY),
    createdAt: inPast(9 * DAY),
    report: {
      photo: images.cleanupAfter,
      shareIban: true,
      sharePaypal: false,
    },
    paidMarkedAt: inPast(1 * DAY),
  },
];

export const topChallengeIds = ['igelnest', 'gruenstreifen-malibu', 'sommerfest'];
