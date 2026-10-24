import type { Challenge, Comment, Group, Profile, User } from './types';

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
    gender: 'er',
    location: 'Radebergerstr. 12, 04188 Leipzig',
    avatar: images.avatarPeter,
  },
  {
    id: 'lena',
    name: 'Lena K.',
    firstName: 'Lena',
    gender: 'sie',
  },
  {
    id: 'gardeners',
    name: 'Nachbarschaftsgärtner:innen',
    firstName: 'Nachbarschaftsgärtner:innen',
    location: 'Tempelhofer Feld',
    group: true,
    payout: {
      accountHolder: 'Nachbarschaftsgärtner:innen e. V.',
      // Wie in Figma, aber mit gültiger Prüfziffer (Figma: DE12 …)
      iban: 'DE38 4306 0967 1234 5648 21',
      paypal: 'garten@example.org',
    },
  },
];

const gardenersPayout = sampleUsers.find((u) => u.id === 'gardeners')!.payout!;

const gardenComments: Comment[] = [
  {
    id: 'c1',
    authorId: 'lena',
    body: 'Gibt es vor Ort Handschuhe oder soll ich eigene mitbringen?',
    createdAt: inPast(2 * HOUR),
  },
  {
    id: 'c2',
    authorId: 'peter',
    replyToId: 'c1',
    body: 'Handschuhe und Schaufeln sind da. Bring gern Wasser mit!',
    createdAt: inPast(1 * HOUR),
  },
];

/** Profil aus dem Onboarding in Figma. Bis das Onboarding durchlaufen ist, ist `onboarded` false. */
export const sampleProfile: Profile = {
  email: '',
  handle: '',
  push: true,
  onboarded: false,
};

export const sampleChallenges: Challenge[] = [
  {
    id: 'vorher-nachher-hof',
    type: 'before_after',
    title: 'Hinterhof aufgeräumt',
    text: '#vorher Sperrmüll und Scherben, keiner wollte hier sitzen.\n#nachher Alles weg, zwei Bänke repariert. Danke an @Lena!',
    beforeText: 'Sperrmüll und Scherben, keiner wollte hier sitzen.',
    afterText: 'Alles weg, zwei Bänke repariert. Danke an @Lena!',
    authorId: 'peter',
    location: 'Schönefeld, Leipzig',
    coords: { latitude: 51.359, longitude: 12.411 },
    kiez: 'Schönefeld, Leipzig',
    status: 'open',
    image: images.cleanupAfter,
    imageBefore: images.cleanupBefore,
    imageAfter: images.cleanupAfter,
    timerStartedAt: inPast(3 * HOUR + 14 * 60 * 1000),
    finishedAt: inPast(1 * HOUR),
    likedByMe: false,
    likeCount: 12,
    deadline: inPast(1 * HOUR),
    createdAt: inPast(1 * HOUR),
    comments: [],
  },
  {
    id: 'garten-kuf',
    type: 'individual',
    title: 'Gartensanierung im KulturHaus KUF',
    text: 'KulturHaus KUF freut sich über Hilfe bei der Sanierung des Nachbarschaftsgartens. Gebraucht werden Schaufeln, Handschuhe und ein paar helfende Hände am Samstag ab 10 Uhr. Wasser und Kaffee gibt es vor Ort.',
    authorId: 'peter',
    location: 'Radebergerstr. 12, 04188 Leipzig',
    coords: { latitude: 51.358, longitude: 12.413 },
    kiez: 'Schönefeld, Leipzig',
    bountyAmount: 15,
    status: 'open',
    image: images.garden,
    likedByMe: false,
    deadline: inFuture(5 * DAY + 12 * HOUR),
    createdAt: inPast(2 * HOUR),
    comments: gardenComments,
  },
  {
    id: 'tempelhofer-feld',
    type: 'wave',
    title: 'Müll auf dem Tempelhofer Feld',
    text: 'Nachbarschaftsgärtner:innen in der Fachhochschule: heute mit @DeinSchönerNachbar',
    challengeText:
      'Hilfe! Auf dem Tempelhofer Feld hat sich nach den letzten paar Festivals einiges an Müll angesammelt. Wir möchten am Sonntag gemeinsam aufräumen. Greifzangen und Säcke sind da.',
    authorId: 'gardeners',
    views: 48,
    location: 'Tempelhofer Feld',
    coords: { latitude: 52.473, longitude: 13.402 },
    kiez: 'Tempelhof, Berlin',
    comments: [],
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
    coords: { latitude: 51.358, longitude: 12.413 },
    kiez: 'Schönefeld, Leipzig',
    bountyAmount: 5,
    status: 'open',
    image: images.garden,
    likedByMe: false,
    deadline: inFuture(2 * DAY + 4 * HOUR),
    createdAt: inPast(5 * HOUR),
    comments: [],
  },
  {
    id: 'gruenstreifen-malibu',
    type: 'individual',
    title: 'Müll Grünstreifen vor Malibu',
    text: 'Auf dem Grünstreifen vor dem Malibu liegen seit dem Wochenende Flaschen und Verpackungen. Säcke und Handschuhe stelle ich bereit.',
    authorId: 'peter',
    assigneeId: 'gardeners',
    location: 'Radebergerstr. 12, 04188 Leipzig',
    coords: { latitude: 51.358, longitude: 12.413 },
    kiez: 'Schönefeld, Leipzig',
    bountyAmount: 15,
    status: 'reported',
    image: images.cleanupBefore,
    likedByMe: false,
    deadline: inFuture(3 * DAY),
    createdAt: inPast(2 * DAY),
    acceptedAt: inPast(1 * DAY),
    report: {
      photo: images.cleanupAfter,
      note: 'Beete sind frei, Werkzeug liegt wieder im Schuppen.',
    },
    payoutShare: { method: 'iban', payout: gardenersPayout },
    comments: [],
  },
  {
    id: 'sommerfest',
    type: 'individual',
    title: 'Hilfe Sommerfest',
    text: 'Für das Sommerfest im Hof brauchen wir Hilfe beim Aufbau von Bänken und Pavillons.',
    authorId: 'peter',
    assigneeId: 'gardeners',
    location: 'Radebergerstr. 12, 04188 Leipzig',
    coords: { latitude: 51.358, longitude: 12.413 },
    kiez: 'Schönefeld, Leipzig',
    bountyAmount: 15,
    status: 'paid_marked',
    image: images.cleanupAfter,
    likedByMe: false,
    deadline: inPast(2 * DAY),
    createdAt: inPast(9 * DAY),
    acceptedAt: inPast(7 * DAY),
    report: { photo: images.cleanupAfter },
    payoutShare: { method: 'iban', payout: gardenersPayout },
    comments: [],
    paidMarkedAt: inPast(1 * DAY),
  },
  // Gruppenaufgaben der Beispielgruppe „Hof Kastanienallee“
  {
    id: 'gruppe-muell',
    type: 'individual',
    groupId: 'hof-kastanienallee',
    edensteine: 3,
    title: 'Mülltonnen rausstellen',
    text: 'Dienstag früh kommt die Abfuhr. Wer stellt die Tonnen am Montagabend raus?',
    authorId: 'peter',
    location: '',
    status: 'open',
    likedByMe: false,
    comments: [],
    createdAt: inPast(5 * HOUR),
    deadline: inFuture(1 * DAY),
  },
  {
    id: 'gruppe-hof',
    type: 'individual',
    groupId: 'hof-kastanienallee',
    edensteine: 5,
    title: 'Hof fegen',
    text: 'Laub vom Hof und vor den Fahrradständern fegen.',
    authorId: 'gardeners',
    assigneeId: 'lena',
    location: '',
    status: 'confirmed',
    image: images.cleanupAfter,
    likedByMe: false,
    comments: [],
    createdAt: inPast(4 * DAY),
    deadline: inPast(1 * DAY),
    acceptedAt: inPast(3 * DAY),
    confirmedAt: inPast(2 * DAY),
  },
  {
    id: 'gruppe-pflanzen',
    type: 'individual',
    groupId: 'hof-kastanienallee',
    edensteine: 2,
    title: 'Pflanzen im Treppenhaus gießen',
    text: 'Einmal pro Woche, die Kanne steht unter der Treppe.',
    authorId: 'peter',
    assigneeId: 'gardeners',
    location: '',
    status: 'confirmed',
    image: images.garden,
    likedByMe: false,
    comments: [],
    createdAt: inPast(6 * DAY),
    deadline: inPast(2 * DAY),
    acceptedAt: inPast(5 * DAY),
    confirmedAt: inPast(3 * DAY),
  },
];

export const sampleGroups: Group[] = [
  {
    id: 'hof-kastanienallee',
    name: 'Hof Kastanienallee',
    founderId: 'gardeners',
    inviteCode: 'K7M2QX',
    showLeaderboard: true,
    createdAt: inPast(10 * DAY),
    members: [
      { userId: 'gardeners', role: 'founder', joinedAt: inPast(10 * DAY) },
      { userId: 'peter', role: 'member', joinedAt: inPast(9 * DAY) },
      { userId: 'lena', role: 'member', joinedAt: inPast(8 * DAY) },
    ],
  },
];

export const topChallengeIds = ['igelnest', 'gruenstreifen-malibu', 'sommerfest'];
