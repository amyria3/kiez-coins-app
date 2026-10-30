// Klickbarer Prototyp der App auf kiezcoins.de. Läuft ohne Server und ohne Konto, alle Daten sind Beispiele.
// Zwei Orte: „Kiez“ (Nachbarschaft, We-Challenges mit Coins) und „Hof Kastanienallee“ (Gruppe) (Aufgaben mit Edensteinen).
// Drei Hauptfunktionen (Daria, 25.10.2026): Me-Challenge (Standard, ohne Coins), We-Challenge, Kiez und Gruppe.
// Icons, Kater, Kartenbilder und die Liste der Fotos kommen aus `prototyp/daten.js` (erzeugt von
// scripts/build-download-site.mjs aus denselben SVGs wie die App). Bewegung „Schranke“ wie in src/theme/tokens.ts.
(function () {
  'use strict';
  var KC = window.KC;
  var root = document.getElementById('prototyp');
  if (!KC || !root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Sprache kommt aus <html lang> (Daria, 26.10.2026). Im Code stehen Deutsch und Englisch, die übrigen Sprachen
  // bringt die Seite als window.KC_T mit (scripts/site/sprachen/<code>.json, Schlüssel ist der deutsche Text).
  // Fehlt dort ein Text, gilt Englisch. Platzhalter wie {name} füllt `vars`.
  var LANG = document.documentElement.lang || 'de';
  var EN = LANG !== 'de';
  var D = window.KC_T || {};
  function T(de, en, vars) {
    var s = LANG === 'de' ? de : LANG === 'en' ? en : D[de] || en;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }

  // ---------- Hilfen ----------
  function svg(name, h) {
    var d = KC.svg[name];
    var w = Math.round((d.w / d.h) * h * 10) / 10;
    return d.svg.replace(/width="[^"]*" height="[^"]*"/, 'width="' + w + '" height="' + h + '" aria-hidden="true" focusable="false"');
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function $(sel, el) {
    return (el || root).querySelector(sel);
  }
  function $$(sel, el) {
    return Array.prototype.slice.call((el || root).querySelectorAll(sel));
  }
  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function find(list, id) {
    return list.filter(function (x) { return x.id === id; })[0];
  }

  // Text unter der Überschrift, wenn der Ort keinen eigenen für das Szenario hat
  var LEDE = T('Kennst Du das? Irgendwas muss erledigt werden, doch wer in Gottes Namen soll das machen? KiezCoins bietet ein Interface, um Arbeit besser zu verteilen - zu Hause oder im Kiez. Zusammen sind wir stärker, gesünder, glücklicher, wohlhabender und bekommen sogar mehr gebacken!', 'Sound familiar? Something needs doing, but who on earth is going to do it? KiezCoins gives you an interface to share work better – at home or in your neighborhood. Together we’re stronger, healthier, happier, wealthier and we even get more done!');

  // Eigene Me-Challenge in Kiez und Gruppen: Du spannst selbst die Wäscheleine. Das Mähen ist dort eine Bitte an andere (We-Challenge, Daria, 28.10.2026)
  var ME = {
    before: 'waesche',
    after: 'waesche',
    suggestions: ['Neue Wäscheleine im Hof spannen', 'Müll im Park sammeln', 'Fahrradkeller aufräumen'],
    // Titel von Daria (29.10.2026)
    demo: ['Waschtag mit Aussicht', ''],
    demoAfter: 'Die neue Leine hängt, die erste Wäsche trocknet schon.',
    done: '1 gute Tat für den Kiez!',
  };

  // ---------- Beispieldaten je Ort ----------
  // kind: 'me' = Me-Challenge (Vorher-Nachher, ohne Belohnung), 'we' = We-Challenge (Coins bzw. Edensteine)
  var MODES = {
    kiez: {
      unit: 'euro',
      place: 'Connewitz',
      countText: function (n) { return n === 1 ? T('1 We-Challenge in Deiner Nähe', '1 We-Challenge near you') : T('{n} We-Challenges in Deiner Nähe', '{n} We-Challenges near you', { n: n }); },
      headline: 'Kleine Challenges für mehr echte Gemeinschaft',
      // Text unter der Überschrift je nach Szenario (Daria, 26.10.2026); ohne Eintrag gilt LEDE
      ledes: {
        me: 'Kennst Du den Spruch „Tue Gutes und rede darüber“? Und hier ist Space dafür, weil wir alle so ein bisschen voneinander lernen. Angeben und freundschaftlicher Wettbewerb sind Teil des Games!',
        we: 'Kampf der Abstumpfung, Kampf der Indifferenz – wider den totalen Rückzug in die eigenen vier Wände. Reclaim den öffentlichen Raum. Ob Geld oder Zeit und Skills – teile Deine Ressourcen mit anderen und lass wunderbare Synergieeffekte entstehen.',
      },
      people: {
        lena: { name: 'Lena K.', short: 'Lena', color: '#FFB2E5' },
        peter: { name: 'Peter J.', short: 'Peter', color: '#FFAD7E' },
        mo: { name: 'Mo S.', short: 'Mo', color: '#FFC500' },
        du: { name: 'Du', short: 'Du', color: '#7E94FF' },
      },
      challenges: [
        {
          id: 'auwald', kind: 'me',
          title: 'Müll im Auwald gesammelt',
          text: 'Nach dem Wochenende lagen Flaschen und Verpackungen am Weg. Drei Säcke später hat der Igel seine Ruhe.',
          author: 'lena', before: 'muell-wald', after: 'waldweg', took: '1 h 40 min', comments: 3, likes: 24,
        },
        {
          id: 'hund', kind: 'we',
          title: 'Mittags mit Bruno Gassi gehen',
          text: 'Hallo liebe Nachbar:innen, ich bin Peter und stolzer Besitzer eines kleinen, süßen Hundes. Mein Job ist zurzeit sehr herausfordernd, und ich brauche deshalb jemanden, der mit ihm spazieren geht: Mittwoch und Donnerstag gegen 13 Uhr, eine Runde von 45 Minuten. Ich bin bis abends im Büro. Bruno ist ruhig und läuft gut an der Leine. Aufgrund seiner Rasse hat er ein paar gesundheitliche Issues, das erkläre ich dann gern direkt.',
          author: 'peter', reward: 5, dist: '200 m', left: 'noch 2 Tage', img: 'hund', comments: 2, likes: 9,
        },
        {
          id: 'igel', kind: 'bild',
          title: 'Igel am Wegrand',
          text: 'Heute Abend am Wegrand im Park. Bitte langsam fahren!',
          author: 'lena', img: 'igel', comments: 4, likes: 31,
        },
      ],
      group: null,
      create: {
        suggestions: ['Ein Stück Rasen für Elisas Geburtstag mähen', 'Igelhaus aufbauen', 'Fahrradkeller aufräumen'],
        // Das Mähen bittet die Nachbarschaft; dieselbe Aufgabe als eigene Me-Challenge steht unter „Nur ich“ (Daria, 28.10.2026)
        demo: ['Ein Stück Rasen für Elisas Geburtstag mähen', 'Es wäre schön, wenn jemand ein Stück des Rasens für die Kleinen frei-mähen könnte, weil Elisa am Freitag Geburtstag hat und die Zecken im hohen Rasen gerade wüten.'],
        rewards: [5, 10, 15, 20],
        reward: 10,
        photo: 'hohes-gras',
        published: 'Deine We-Challenge ist online. Die Nachbarschaft sieht sie jetzt.',
      },
      // Reihenfolge = Reihenfolge der Knöpfe neben dem Telefon: [Schlüssel, Titel, Text, Kurzform fürs Handy]
      scenarios: [
        ['me', 'Me-Challenge', 'How do you feel today? Teile einen Life-Hack oder ein besonders kinder- und budgetfreundliches Rezept. Oder fordere Dich selbst heraus und tue etwas richtig Nettes für Mensch oder Tier. Angeben und freundschaftlicher Wettbewerb sind gewollt!', 'Me-Challenge'],
        ['we', 'We-Challenge', 'Dir ist etwas aufgefallen, was getan werden müsste, was Du aber nicht selbst tun kannst? Poste eine We-Challenge in Deinem Kiez, setze eine Belohnung aus und lehn Dich erst mal zurück. Wir sind gespannt, was sich so alles bewegen lässt!', 'We-Challenge'],
        ['bild', 'Nur ein Bild', 'Teile mit Deinen Nachbar:innen besondere Momente, Orte oder Buchempfehlungen.', 'Bild'],
        ['feed', 'Feed', 'Wie in jedem sozialen Netzwerk: sehen, was andere Menschen so posten. Hol Dir Inspiration, Tipps, Life Hacks & Satisfaction über erledigte Challenges.', 'Feed'],
      ],
      // Bild ohne Aufgabe, ohne Coins (Daria, 28.10.2026)
      bild: {
        suggestions: ['Cospudener See', 'Neues Café am Kreuz', 'Buchtipp für den Winter'],
        demo: ['Cospudener See', 'Einfach eine besondere Stimmung hier, besonders im Frühling.'],
        photo: 'wald',
        published: 'Dein Bild ist online. Die Nachbarschaft sieht es jetzt.',
      },
    },
    gruppe: {
      unit: 'eden',
      place: 'Hof Kastanienallee',
      countText: function (n) { return n === 1 ? T('1 offene Aufgabe', '1 open task') : T('{n} offene Aufgaben', '{n} open tasks', { n: n }); },
      headline: 'Kleine Challenges für mehr echte Gemeinschaft',
      people: {
        lena: { name: 'Lena K.', short: 'Lena', color: '#FFB2E5' },
        peter: { name: 'Peter J.', short: 'Peter', color: '#FFAD7E' },
        gardeners: { name: 'Nachbarschaftsgärtner:innen', short: 'Gärtner:innen', color: '#93F4A7' },
        du: { name: 'Du', short: 'Du', color: '#7E94FF' },
      },
      challenges: [
        {
          id: 'gisela', kind: 'we',
          title: 'Für Gisela aus dem 3. Stock einkaufen',
          text: 'Gisela kommt nach ihrer Hüft-OP noch nicht die Treppen runter. Sie gibt Dir Liste und Geld an der Wohnungstür.',
          author: 'lena', reward: 4, dist: '3. Stock', left: 'bis Freitag', img: null, comments: 2, likes: 6,
        },
        {
          id: 'keller', kind: 'we',
          title: 'Fahrradkeller entrümpeln',
          text: 'Samstag ab 10 Uhr tragen wir Räder ohne Besitzer:in zum Sperrmüll. Markiert Eure Räder bis Freitag mit Band. Wer hilft beim Tragen?',
          author: 'peter', reward: 5, dist: 'Keller', left: 'Samstag', img: null, comments: 4, likes: 5,
        },
      ],
      group: {
        name: 'Hof Kastanienallee',
        sub: '4 Mitglieder · Rangliste an',
        members: [
          { id: 'peter', score: 18 },
          { id: 'lena', score: 14 },
          { id: 'du', score: 12 },
          { id: 'gardeners', score: 9 },
        ],
        tasks: [
          { id: 'hof', title: 'Hof fegen', by: 'gardeners', eden: 3 },
          { id: 'pflanzen', title: 'Pflanzen im Treppenhaus gießen', by: 'peter', eden: 2 },
          { id: 'tonnen', title: 'Mülltonnen rausstellen', by: 'peter', eden: 1 },
        ],
      },
      create: {
        suggestions: ['Ein Stück Rasen mähen', 'Treppenhaus wischen', 'Hof fegen'],
        demo: ['Ein Stück Rasen für Elisas Geburtstag mähen', 'Es wäre schön, wenn jemand ein Stück des Rasens für die Kleinen frei-mähen könnte, weil Elisa am Freitag Geburtstag hat und die Zecken im hohen Rasen gerade wüten.'],
        rewards: [1, 3, 5, 10],
        reward: 3,
        photo: 'hohes-gras',
        published: 'Deine We-Challenge ist da. Alle im Hof Kastanienallee sehen sie jetzt.',
      },
      scenarios: [
        ['me', 'Me-Challenge', 'Teile Life-Hacks und Rezepte in Deiner Gruppe. Hol Dir Bestätigung und Ermutigung für eine Gewohnheit, die Du entwickeln möchtest. Oder hast Du etwas für die anderen Menschen in Deiner Gruppe gemacht – und es verdient eine Portion Wertschätzung? Go!', 'Me-Challenge'],
        ['we', 'We-Challenge', 'Organisiert euch spielerisch innerhalb eurer Gruppe. Wer mehr lästige Aufgaben übernimmt, verdient sich einen hohen Rang in der Liste. Auf die Plätze, fertig, los!', 'We-Challenge'],
        ['bild', 'Nur ein Bild', 'Teile mit Deinen Liebsten und Freund:innen besondere Momente, Orte oder Buchempfehlungen.', 'Bild'],
        ['feed', 'Feed', 'Wie in jedem sozialen Netzwerk: sehen, was andere Menschen so posten. Hol Dir Inspiration, Tipps, Life Hacks & Satisfaction über erledigte Challenges.', 'Feed'],
      ],
      bild: {
        suggestions: ['Unsere Beete im Hof', 'Buchtipp für den Winter', 'Sommerfest im Hof'],
        demo: ['Unsere Beete im Hof', 'Neue Beete by CityGardening (mein Verein) – sagt Bescheid, wenn ihr euch was wünscht.'],
        photo: 'garten',
        published: 'Dein Bild ist da. Alle im Hof Kastanienallee sehen es jetzt.',
      },
    },
    // Nur ich: Was Du hier postest, siehst nur Du. Me-Challenges und Bilder, keine We-Challenges, keine Coins (Daria, 27.10.2026)
    ich: {
      unit: 'euro',
      place: 'Nur ich',
      countText: function () { return T('Was Du hier postest, siehst nur Du.', 'Only you see what you post here.'); },
      headline: 'Kleine Challenges für mehr echte Gemeinschaft',
      people: {
        du: { name: 'Du', short: 'Du', color: '#7E94FF' },
      },
      challenges: [
      ],
      group: null,
      create: {
        suggestions: [], demo: ['', ''], rewards: [], reward: 0, photo: null, published: '',
      },
      me: {
        before: 'hohes-gras',
        after: 'gemaeht',
        demo: ['Rasenmäher bei Peter abholen & ein Stück Rasen für Elisas Geburtstag freimähen', ''],
        demoAfter: '',
        done: 'Geschafft! Nur Du siehst es.',
      },
      scenarios: [
        ['me', 'Me-Challenge', 'Hast Du Dir etwas vorgenommen und brauchst ein wenig Motivation aus der Silicon-Valley-Trickkiste? Dokumentiere Deinen Fortschritt – nutze Gamification zur Glücksmaximierung, geschützt vor fremden Blicken.', 'Me-Challenge'],
        ['bild', 'Nur ein Bild', 'Speichere visuelle Notizen oder schöne Momente in Deinem Alltag.', 'Bild'],
        // „Nur ich“: Hier postet niemand sonst (Text von Claude, 29.10.2026)
        ['feed', 'Feed', 'Dein Feed nur für Dich: Hier sammelst Du Deine Bilder und Me-Challenges, geschützt vor fremden Blicken.', 'Feed'],
      ],
      bild: {
        suggestions: ['Lieblingsplatz', 'Notiz für später', 'Sonnenuntergang'],
        demo: ['Lieblingsplatz', 'Die Bank am Teich, kurz bevor die Sonne untergeht.'],
        photo: 'wald',
        published: 'Gespeichert. Nur Du siehst Dein Bild.',
      },
    },
  };

  // Englische Fassung der Beispieldaten: überschreibt nur die Texte, Struktur und Zahlen bleiben
  var ME_EN = {
    suggestions: ['Put up a new clothesline in the courtyard', 'Pick up litter in the park', 'Tidy the bike cellar'],
    demo: ['Laundry day with a view', ''],
    demoAfter: 'The new line is up, the first laundry is already drying.',
    done: '1 good deed for the neighborhood!',
  };
  var MODES_EN = {
    kiez: {
      headline: 'Small challenges for more real community',
      ledes: {
        me: 'Know the saying “Do good and talk about it”? This is the space for it, because we all learn a little from each other. Showing off and friendly competition are part of the game!',
        we: 'Fight numbness, fight indifference – against retreating completely into your own four walls. Reclaim public space. Money, time or skills – share your resources with others and let wonderful synergies happen.',
      },
      people: { du: { name: 'You', short: 'You' } },
      challenges: [
        { title: 'Picked up litter in the floodplain forest', text: 'After the weekend, bottles and packaging lay along the path. Three bags later, the hedgehog has its peace.' },
        { title: 'Fix a flat on a kid’s bike', text: 'The rear tube on my daughter’s bike is flat. I have a patch kit, but I can’t get the tire off the rim. She needs the bike on Monday to get to school.', left: '3 days left' },
        { title: 'Walk Bruno at lunchtime', text: 'Hi dear neighbors, I’m Peter, the proud owner of a small, sweet dog. My job is very demanding right now, so I need someone to walk him: Wednesday and Thursday around 1 pm, a 45-minute walk. I’m at the office until evening. Bruno is calm and walks well on the leash. Because of his breed he has a few health issues – I’m happy to explain them in person.', left: '2 days left' },
        { title: 'Hedgehog by the path', text: 'Tonight by the path in the park. Please ride slowly!' },
      ],
      create: {
        suggestions: ['Mow a patch of lawn for Elisa’s birthday', 'Build a hedgehog house', 'Tidy the bike cellar'],
        demo: ['Mow a patch of lawn for Elisa’s birthday', 'It would be lovely if someone could mow a patch of the lawn for the little ones, because Elisa’s birthday is on Friday and the ticks are running wild in the tall grass.'],
        published: 'Your We-Challenge is live. The neighborhood can see it now.',
      },
      scenarios: [
        ['me', 'Me-Challenge', 'How do you feel today? Share a life hack or an especially kid- and budget-friendly recipe. Or challenge yourself and do something really nice for people or animals. Showing off and friendly competition are welcome!', 'Me-Challenge'],
        ['we', 'We-Challenge', 'Noticed something that needs doing, but you can’t do it yourself? Post a We-Challenge in your neighborhood, set a reward and sit back for a while. We’re curious how much we can get moving!', 'We-Challenge'],
        ['bild', 'Just a photo', 'Share special moments, places or book tips with your neighbors.', 'Photo'],
        ['feed', 'Feed', 'Like any social network: see what other people post. Get inspiration, tips, life hacks & satisfaction from completed challenges.', 'Feed'],
      ],
      bild: {
        suggestions: ['Lake Cospuden', 'New café at the corner', 'Book tip for winter'],
        demo: ['Lake Cospuden', 'Just a special atmosphere here, especially in spring.'],
        published: 'Your photo is live. The neighborhood can see it now.',
      },
    },
    gruppe: {
      headline: 'Small challenges for more real community',
      people: { gardeners: { name: 'Neighborhood gardeners', short: 'Gardeners' }, du: { name: 'You', short: 'You' } },
      challenges: [
        { title: 'Shop for Gisela on the 3rd floor', text: 'After her hip surgery, Gisela can’t manage the stairs yet. She’ll give you the list and money at her door.', dist: '3rd floor', left: 'by Friday' },
        { title: 'Clear out the bike cellar', text: 'Saturday from 10 am we’re taking ownerless bikes to the bulky waste. Mark your bikes with tape by Friday. Who can help carry?', dist: 'Cellar', left: 'Saturday' },
      ],
      group: {
        sub: '4 members · Leaderboard on',
        tasks: [{ title: 'Sweep the courtyard' }, { title: 'Water the plants in the stairwell' }, { title: 'Put out the bins' }],
      },
      create: {
        suggestions: ['Mow a patch of lawn', 'Mop the stairwell', 'Sweep the courtyard'],
        demo: ['Mow a patch of lawn for Elisa’s birthday', 'It would be lovely if someone could mow a patch of the lawn for the little ones, because Elisa’s birthday is on Friday and the ticks are running wild in the tall grass.'],
        published: 'Your We-Challenge is up. Everyone in Hof Kastanienallee can see it now.',
      },
      scenarios: [
        ['me', 'Me-Challenge', 'Share life hacks and recipes in your group. Get recognition and encouragement for a habit you want to build. Or did you do something for the other people in your group – and it deserves a portion of appreciation? Go!', 'Me-Challenge'],
        ['we', 'We-Challenge', 'Organize yourselves playfully within your group. Whoever takes on more tedious tasks earns a high rank on the list. On your marks, get set, go!', 'We-Challenge'],
        ['bild', 'Just a photo', 'Share special moments, places or book tips with your loved ones and friends.', 'Photo'],
        ['feed', 'Feed', 'Like any social network: see what other people post. Get inspiration, tips, life hacks & satisfaction from completed challenges.', 'Feed'],
      ],
      bild: {
        suggestions: ['Our courtyard beds', 'Book tip for winter', 'Courtyard summer party'],
        demo: ['Our courtyard beds', 'New beds by CityGardening (my club) – let us know if there’s anything you’d like.'],
        published: 'Your photo is up. Everyone in Hof Kastanienallee can see it now.',
      },
    },
    ich: {
      headline: 'Small challenges for more real community',
      place: 'Just me',
      me: { demo: ['Pick up the mower from Peter & mow a patch for Elisa’s birthday', ''], done: 'Done! Only you can see it.' },
      people: { du: { name: 'You', short: 'You' } },
      challenges: [
      ],
      scenarios: [
        ['me', 'Me-Challenge', 'Set yourself a goal and need a little motivation from the Silicon Valley bag of tricks? Track your progress – use gamification to maximize happiness, safe from prying eyes.', 'Me-Challenge'],
        ['bild', 'Just a photo', 'Save visual notes or beautiful moments from your everyday life.', 'Photo'],
        ['feed', 'Feed', 'Your feed, just for you: collect your photos and Me-Challenges here, safe from prying eyes.', 'Feed'],
      ],
      bild: {
        suggestions: ['Favorite spot', 'Note for later', 'Sunset'],
        demo: ['Favorite spot', 'The bench by the pond, just before the sun goes down.'],
        published: 'Saved. Only you see your photo.',
      },
    },
  };
  // Legt die Texte von `from` über `to`; Listen werden Eintrag für Eintrag zusammengeführt
  function overlay(to, from) {
    Object.keys(from).forEach(function (k) {
      var v = from[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && to[k] && typeof to[k] === 'object') overlay(to[k], v);
      else if (Array.isArray(v) && Array.isArray(to[k]) && v.length && typeof v[0] === 'object' && !Array.isArray(v[0])) {
        v.forEach(function (item, i) { if (to[k][i]) overlay(to[k][i], item); });
      } else to[k] = v;
    });
  }
  // Übrige Sprachen: jeder deutsche Text aus KC_T, sonst der englische an derselben Stelle, sonst unverändert
  function tr(de, en) {
    if (typeof de === 'string') return D[de] || (typeof en === 'string' ? en : de);
    if (Array.isArray(de)) return de.map(function (x, i) { return tr(x, en && en[i]); });
    if (de && typeof de === 'object') {
      var o = {};
      Object.keys(de).forEach(function (k) { o[k] = tr(de[k], en && en[k]); });
      return o;
    }
    return de;
  }
  if (LANG === 'en') {
    overlay(ME, ME_EN);
    overlay(MODES, MODES_EN);
  } else if (EN) {
    ME = tr(ME, ME_EN);
    MODES = tr(MODES, MODES_EN);
  }

  // Überall (Daria, 29.10.2026): wie Kiez, dazu Beiträge von weiter weg. Ab 5 km nur auf Anfrage mitmachen.
  MODES.ueberall = clone(MODES.kiez);
  (function (u) {
    u.place = T('Überall', 'Everywhere');
    u.countText = function (n) { return n === 1 ? T('1 We-Challenge überall', '1 We-Challenge everywhere') : T('{n} We-Challenges überall', '{n} We-Challenges everywhere', { n: n }); };
    u.people.mo = u.people.mo || { name: 'Mo S.', short: 'Mo', color: '#FFC500' };
    u.challenges.splice(1, 0, {
      id: 'kisten', kind: 'we', far: true,
      title: T('Bücherkisten zum Tauschregal tragen', 'Carry book boxes to the swap shelf'),
      text: T('Drei Kisten Bücher aus dem Keller zum offenen Bücherregal am Markt. Mit Sackkarre geht es zu zweit in einer halben Stunde.', 'Three boxes of books from the cellar to the open bookshelf at the market. With a hand truck it takes two people half an hour.'),
      author: 'mo', reward: 10, dist: '148 km', left: T('noch 5 Tage', '5 days left'), img: null, comments: 0, likes: 3,
    });
    u.scenarios = u.scenarios.map(function (s) {
      return s[0] === 'feed' ? ['feed', 'Feed', T('Beiträge von überall, nicht nur aus Deinem Kiez. Wer weiter als 5 km entfernt ist, macht auf Anfrage mit.', 'Posts from everywhere, not just your neighborhood. If you’re more than 5 km away, you join on request.'), 'Feed'] : s;
    });
    u.create.published = T('Deine We-Challenge ist online. Sie erscheint im Kiez und in „Überall“.', 'Your We-Challenge is live. It shows in your neighborhood and in “Everywhere”.');
  })(MODES.ueberall);

  var M, people, challenges, group, state;
  // Me-Challenge je Ort: „Nur ich“ hat eigene Beispieldaten, sonst gilt ME
  function meData() { return M.me || ME; }
  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }
  function load(mode) {
    M = MODES[mode];
    people = M.people;
    challenges = clone(M.challenges);
    group = clone(M.group);
    state = {
      mode: mode,
      tab: 'nearby', // nearby = Startansicht des Orts (Feed bzw. Gruppe), pleasure = „Was Du so machst“
      focus: null, // gewähltes Szenario ohne eigene Ansicht, z. B. 'bild' (Ring auf der Kamera)
      detail: null,
      create: false,
      liked: {},
      status: {}, // id → accepted | reported | confirmed
      earned: 0,
      draft: newDraft(),
      created: 0,
      hinted: false,
    };
  }
  // Entwurf: kind 'me' läuft in drei Schritten (stage vorher → timer → nachher), kind 'we' in einem
  function newDraft(kind) {
    return {
      kind: kind || 'me', stage: 'vorher', photo: false, title: '', text: '', after: false, afterText: '',
      start: 0, reward: M.create.reward, deadline: '3 Tage',
    };
  }

  // Belohnung: Coins im Kiez, Edensteine in der Gruppe
  function rewardBadge(n, h) {
    return M.unit === 'euro'
      ? svg('coins', h || 20) + '<b>' + n + ',-</b>'
      : svg('diamond', (h || 20) - 2) + '<b class="p-eden">' + n + '</b>';
  }
  function rewardText(n) {
    return M.unit === 'euro' ? n + ' Coins' : n === 1 ? T('1 Edenstein', '1 Eden stone') : T('{n} Edensteine', '{n} Eden stones', { n: n });
  }

  // ---------- Aufbau ----------
  var hour = new Date().getHours();
  var greeting = hour < 11 ? T('Guten Morgen', 'Good morning') : hour < 18 ? T('Hallo', 'Hi') : T('Guten Abend', 'Good evening');
  var clock = new Date().toTimeString().slice(0, 5);

  var screen = $('.p-screen');
  screen.innerHTML =
    '<div class="p-status" aria-hidden="true"><span>' + clock + '</span><span class="p-island"></span><span class="p-battery"></span></div>' +
    '<div class="p-scroll">' +
    '  <div class="p-head"><span class="p-wordmark">' + svg('logo', 22) + '</span></div>' +
    '  <div class="p-greet"><h3>' + greeting + ', Mira</h3><p><span class="p-place"></span> · <span class="p-count"></span></p></div>' +
    '  <div class="p-compose-head"><button type="button" class="p-x" data-close aria-label="' + T('Schließen', 'Close') + '">' + svg('close', 12) + '</button><strong class="p-compose-line"></strong></div>' +
    '  <div class="p-seg" role="tablist" aria-label="Feed">' +
    '    <span class="p-seg-pill" aria-hidden="true"></span>' +
    '    <button role="tab" data-tab="ich"></button>' +
    '    <button role="tab" data-tab="groups"></button>' +
    '    <button role="tab" data-tab="nearby"></button>' +
    '    <button role="tab" data-tab="everywhere"></button>' +
    '  </div>' +
    '  <div class="p-content"></div>' +
    '</div>' +
    '<button class="p-camera" type="button" aria-label="' + T('Neu stellen', 'New post') + '">' + svg('cameraDark', 15) + '</button>' +
    '<nav class="p-tabbar" aria-label="' + T('App-Leiste', 'App bar') + '">' +
    '  <button type="button" data-bar="feed" aria-label="Feed">' + svg('feed', 18) + '</button>' +
    '  <button type="button" data-bar="pleasure" aria-label="' + T('Was Du so machst', 'What you’re up to') + '">' + svg('crown', 22) + '</button>' +
    '  <button type="button" data-bar="menu" aria-label="' + T('Menü', 'Menu') + '">' + svg('burger', 16) + '</button>' +
    '</nav>' +
    '<div class="p-scrim" hidden></div>' +
    '<section class="p-sheet" role="dialog" aria-modal="true" aria-label="Details" aria-hidden="true" tabindex="-1"></section>' +
    '<section class="p-create" role="dialog" aria-modal="true" aria-label="' + T('Neu stellen', 'New post') + '" aria-hidden="true" tabindex="-1"></section>' +
    '<div class="p-nudge" aria-live="polite"><p><span class="p-nudge-cat"></span><span class="p-nudge-text"></span></p></div>' +
    '<div class="p-burst" aria-hidden="true"></div>';

  var scroll = $('.p-scroll');
  var content = $('.p-content');
  var sheet = $('.p-sheet');
  var create = $('.p-create');
  var scrim = $('.p-scrim');
  var seg = $('.p-seg');

  // ---------- Bilder: Foto, wenn vorhanden, sonst Zeichnung ----------
  function image(key) {
    if (KC.fotos && KC.fotos.indexOf(key) >= 0) return '<img src="/prototyp/fotos/' + key + '.jpg" alt="" decoding="async">';
    return KC.art[key] || '';
  }
  function avatar(id, size) {
    var p = people[id];
    return '<span class="p-avatar" style="--c:' + p.color + ';--s:' + (size || 18) + 'px" aria-hidden="true">' + p.short.charAt(0) + '</span>';
  }
  function statusChip(id) {
    var s = state.status[id];
    if (!s) return '';
    var t = { requested: T('Angefragt', 'Requested'), accepted: T('Angenommen', 'Accepted'), reported: T('Erledigt gemeldet', 'Reported done'), confirmed: T('Bestätigt', 'Confirmed') }[s];
    return '<span class="p-chip p-chip-' + s + '">' + t + '</span>';
  }

  // ---------- Feed ----------
  // Wann gepostet, für „Wer hat gepostet“ nach dem ersten Tippen
  var AGO = [T('vor 2 Std.', '2 hrs ago'), T('vor 5 Std.', '5 hrs ago'), T('gestern', 'yesterday'), T('vor 3 Tagen', '3 days ago')];
  function ago(c) {
    var i = challenges.indexOf(c);
    return c.author === 'du' ? T('gerade eben', 'just now') : AGO[i % AGO.length];
  }
  // Ein großer, schwebender Edenstein je Karte, Form und Takt je Karte verschieden; nur bei aktiven Aufgaben
  function crystal(c) {
    var i = Math.abs(String(c.id).split('').reduce(function (h, ch) { return (h * 31 + ch.charCodeAt(0)) | 0; }, 7));
    var name = ['diamond', 'diamond2', 'diamond3'][i % 3];
    return '<span class="p-crystal" style="--d:' + (2.2 + (i % 7) * 0.35) + 's;--o:-' + (i % 11) * 0.3 + 's;--r:' + ((i % 9) - 4) * 2 + 'deg">' + svg(name, 46) + '</span>';
  }
  function bountyOf(c) {
    if (M.unit === 'euro') return rewardBadge(c.reward);
    var done = state.status[c.id] === 'confirmed';
    return (done ? '' : crystal(c)) + '<b class="p-eden' + (done ? ' is-done' : '') + '">' + c.reward + '</b>';
  }

  function actions(c, liked) {
    return (
      '<div class="p-actions">' +
      '<button type="button" class="p-like' + (liked ? ' is-on' : '') + '" data-like="' + c.id + '" aria-pressed="' + liked + '" aria-label="' + T('Gefällt mir', 'Like') + '">' +
      '<span class="p-heart">' + svg(liked ? 'heartOn' : 'heart', 17) + '</span><span>' + (c.likes + (liked ? 1 : 0)) + '</span></button>' +
      '<button type="button" ' + (c.kind !== 'we' ? 'data-soon="' + T('Kommentare', 'Comments') + '"' : 'data-open="' + c.id + '"') + ' aria-label="' + T('Kommentare', 'Comments') + '">' + svg('comment', 17) + '<span>' + c.comments + '</span></button>' +
      '<button type="button" data-soon="' + T('Teilen', 'Sharing') + '" aria-label="' + T('Teilen', 'Share') + '">' + svg('send', 17) + '</button>' +
      (c.author === 'du' ? '<button type="button" class="p-manage" data-soon="' + T('Verwalten', 'Managing posts') + '" aria-label="' + T('Verwalten', 'Manage') + '">' + svg('gear', 20) + '</button>' : '') +
      '</div>'
    );
  }

  // Me-Challenge wie in der App (BeforeAfterPost): Vorher oben 1/3, Nachher unten 2/3. Ein Tipp auf eine Hälfte
  // vergrößert sie auf 5/6, die Karte wächst um 25 %. Ein zweiter Tipp stellt zurück. Ohne Belohnung.
  function meCard(c, isNew) {
    var liked = !!state.liked[c.id];
    return (
      '<article class="p-post p-post-me' + (isNew ? ' p-new' : '') + '" data-id="' + c.id + '">' +
      '<div class="p-pair" data-focus="none">' +
      '<button type="button" class="p-half p-before" data-pair="before" aria-label="' + T('Vorher-Foto vergrößern', 'Enlarge before photo') + '">' + image(c.before) + '<span class="p-tag">' + T('Vorher', 'Before') + '</span></button>' +
      '<button type="button" class="p-half p-after" data-pair="after" aria-label="' + T('Nachher-Foto vergrößern', 'Enlarge after photo') + '">' + image(c.after) + '<span class="p-tag">' + T('Nachher', 'After') + '</span></button>' +
      '<span class="p-took">' + svg('clock', 10) + esc(c.took) + '</span>' +
      '<span class="p-info"><strong>' + esc(c.title) + '</strong><span class="p-meta">' +
      esc(people[c.author].name) + ' · Me-Challenge · ' + ago(c) + '</span></span>' +
      '</div>' +
      actions(c, liked) +
      '</article>'
    );
  }

  // Nur ein Bild: Foto mit Titel, ohne Belohnung und ohne Annehmen
  function bildCard(c, isNew) {
    var liked = !!state.liked[c.id];
    return (
      '<article class="p-post' + (isNew ? ' p-new' : '') + '" data-id="' + c.id + '">' +
      '<div class="p-card p-card-bild"><span class="p-img">' + image(c.img) + '</span>' +
      '<span class="p-info"><strong>' + esc(c.title) + '</strong><span class="p-meta">' +
      esc(people[c.author].name) + ' · ' + T('Bild', 'Photo') + ' · ' + ago(c) + '</span></span></div>' +
      actions(c, liked) +
      '</article>'
    );
  }

  // Persönliches Ziel (Nur ich): Fortschrittsbalken, Tage als Punkte, Serie. „Heute geschafft“ zählt hoch.
  function zielCard(c) {
    var dots = '';
    for (var i = 0; i < c.goal; i++) dots += '<i' + (i < c.done ? ' class="is-on"' : '') + '></i>';
    return (
      '<article class="p-post" data-id="' + c.id + '"><div class="p-ziel">' +
      '<span class="p-ziel-kopf"><strong>' + esc(c.title) + '</strong><span class="p-meta">Me-Challenge · ' + T('nur für Dich', 'only for you') + '</span></span>' +
      '<span class="p-ziel-zahl"><b>' + c.done + '</b>/' + c.goal + ' ' + T('Tage', 'days') + '<span class="p-ziel-serie">' + svg('crown', 12) + ' ' +
      T('{n} Tage in Folge', '{n} days in a row', { n: c.streak }) + '</span></span>' +
      '<span class="p-ziel-balken"><span style="width:' + Math.round((c.done / c.goal) * 100) + '%"></span></span>' +
      '<span class="p-ziel-tage" aria-hidden="true">' + dots + '</span>' +
      (c.today
        ? '<span class="p-done">' + svg('checkGreen', 12) + T(' Heute geschafft', ' Done today') + '</span>'
        : '<button type="button" class="p-btn p-btn-small" data-ziel="' + c.id + '">' + T('Heute geschafft', 'Done today') + '</button>') +
      '</div></article>'
    );
  }

  function card(c, isNew) {
    if (c.kind === 'ziel') return zielCard(c);
    if (c.kind === 'me') return meCard(c, isNew);
    if (c.kind === 'bild') return bildCard(c, isNew);
    var liked = !!state.liked[c.id];
    return (
      '<article class="p-post' + (isNew ? ' p-new' : '') + '" data-id="' + c.id + '">' +
      '<button type="button" class="p-card' + (c.img ? '' : ' p-card-text') + '" data-open="' + c.id + '" aria-label="' + T('{title} öffnen', 'Open {title}', { title: esc(c.title) }) + '">' +
      (c.img ? '<span class="p-img">' + image(c.img) + '</span>' : '') +
      '<span class="p-bounty' + (M.unit === 'euro' ? '' : ' p-bounty-eden') + '">' + bountyOf(c) + '</span>' +
      '<span class="p-who">' + avatar(c.author, 28) + '<span><b>' + esc(people[c.author].name) + '</b><i>' + ago(c) + '</i></span></span>' +
      // Ohne Foto wie in der App: keine Frist-Pill, die Frist steht in der Meta-Zeile, der Text unter den Aktionen (Daria, 28.10.2026)
      (c.img ? statusChip(c.id) || '<span class="p-chip p-chip-deadline">' + svg('clock', 10) + esc(cap(c.left)) + '</span>' : statusChip(c.id) || '') +
      '<span class="p-info"><strong>' + esc(c.title) + '</strong><span class="p-meta">' +
      esc(people[c.author].name) + ' · ' + esc(c.dist) + (c.img ? '' : ' · ' + esc(c.left)) + '</span></span>' +
      '</button>' +
      actions(c, liked) +
      (c.img || !c.text ? '' : '<p class="p-body">' + esc(c.text) + '</p>') +
      '</article>'
    );
  }

  // Eigene Me-Challenge, deren Timer läuft: oben im Feed wie in der App, Tippen führt zurück zum Timer
  function running() {
    var d = state.draft;
    if (d.kind !== 'me' || d.stage === 'vorher') return '';
    return '<div class="p-post"><button type="button" class="p-running" data-me-open><span class="p-thumb">' + image(meData().before) + '</span>' +
      '<span><strong>' + T('Du hast Dich selbst herausgefordert', 'You challenged yourself') + '</strong><i>' + esc(d.title) + (d.stage === 'timer' ? T(' · Timer läuft', ' · Timer running') : T(' · Nachher fehlt', ' · After photo missing')) +
      '</i></span></button></div>';
  }

  function renderNearby(newId) {
    content.innerHTML =
      '<div class="p-list">' + running() + challenges.map(function (c) { return card(c, c.id === newId); }).join('') + '</div>';
  }

  function renderPleasure() {
    var done = challenges.filter(function (c) { return state.status[c.id]; });
    var mine = challenges.filter(function (c) { return c.author === 'du'; });
    var rows = done
      .map(function (c) {
        return '<li><button type="button" data-open="' + c.id + '"><span class="p-thumb">' + (c.img ? image(c.img) : '') + '</span><span><strong>' +
          esc(c.title) + '</strong>' + statusChip(c.id) + '</span><b>' + rewardBadge(c.reward, 16) + '</b></button></li>';
      })
      .join('');
    var earned = M.unit === 'euro' ? state.earned + ',-' : String(state.earned);
    content.innerHTML =
      '<div class="p-pleasure">' +
      '<div class="p-metrics"><div><b>' + done.length + '</b><span>' + T('angenommen', 'accepted') + '</span></div><div><b>' + earned +
      '</b><span>' + (M.unit === 'euro' ? T('verdient', 'earned') : T('gesammelt', 'collected')) + '</span></div><div><b>' + mine.length + '</b><span>' + T('gestellt', 'posted') + '</span></div></div>' +
      (rows
        ? '<ul class="p-rows">' + rows + '</ul>'
        : '<p class="p-empty">' + (state.mode === 'ich' ? T('Nur Du siehst, was Du hier machst. Starte eine Me-Challenge mit der Kamera.', 'Only you see what you do here. Start a Me-Challenge with the camera.') : M.unit === 'euro' ? T('Nimm eine We-Challenge an. Hier siehst Du, was Du erledigst und verdienst.', 'Accept a We-Challenge. Here you see what you get done and earn.') : T('Nimm eine We-Challenge an. Hier siehst Du, was Du erledigst und sammelst.', 'Accept a We-Challenge. Here you see what you get done and collect.')) + '</p>' +
          '<button type="button" class="p-btn p-btn-secondary" data-tab-go="nearby">' + M.place + '</button>') +
      '</div>';
  }

  function memberRows() {
    var sorted = group.members.slice().sort(function (a, b) { return b.score - a.score; });
    return sorted
      .map(function (m, i) {
        return '<li data-member="' + m.id + '"' + (m.id === 'du' ? ' class="is-me"' : '') + '>' + avatar(m.id, 26) +
          '<span>' + people[m.id].short + (i === 0 ? ' <span class="p-crown">' + svg('crown', 14) + '</span>' : '') + '</span>' +
          '<b>' + svg('diamond', 15) + '<span class="p-score">' + m.score + '</span></b></li>';
      })
      .join('');
  }

  function renderGroups(newId) {
    content.innerHTML =
      '<div class="p-group">' +
      '<div class="p-group-head"><strong>' + group.name + '</strong><span>' + group.sub + '</span></div>' +
      '<div class="p-list">' + running() + challenges.map(function (c) { return card(c, c.id === newId); }).join('') + '</div>' +
      '<h4>' + T('Schnell erledigt', 'Quick tasks') + '</h4>' +
      group.tasks
        .map(function (t) {
          return '<div class="p-task' + (t.done ? ' is-done' : '') + '" data-task="' + t.id + '"><div><strong>' + esc(t.title) + '</strong><span>' +
            avatar(t.by) + people[t.by].short + ' · ' + svg('diamond', 13) + ' ' + t.eden + '</span></div>' +
            (t.done
              ? '<span class="p-done">' + svg('checkGreen', 12) + T(' Erledigt', ' Done') + '</span>'
              : '<button type="button" class="p-btn p-btn-small" data-task-do="' + t.id + '">' + T('Erledigt', 'Done') + '</button>') +
            '</div>';
        })
        .join('') +
      '</div>';
  }

  function placePill(animate) {
    var key = segKey();
    var btn = key && $('[data-tab="' + key + '"]', seg);
    var pill = $('.p-seg-pill', seg);
    // „Was Du so machst“ liegt nur in der Tab-Leiste, dann steht die Pille still
    pill.style.opacity = btn ? '' : '0';
    if (!btn) return;
    if (!animate) pill.style.transition = 'none';
    pill.style.transform = 'translateX(' + btn.offsetLeft + 'px)';
    pill.style.width = btn.offsetWidth + 'px';
    if (!animate) { pill.offsetWidth; pill.style.transition = ''; }
  }

  // Pille und Schalter links gehören zusammen: Kiez = Kiez, Hof Kastanienallee = Hof Kastanienallee
  function segKey() {
    if (!state.create && state.tab === 'pleasure') return null;
    return TAB_OF[state.mode];
  }
  var TAB_OF = { ich: 'ich', gruppe: 'groups', kiez: 'nearby', ueberall: 'everywhere' };
  var MODE_OF = { ich: 'ich', groups: 'gruppe', nearby: 'kiez', everywhere: 'ueberall' };
  var KIND_NAME = { me: 'Me-Challenge', we: 'We-Challenge', bild: T('Bild', 'Photo') };
  function syncSeg(animate) {
    var composing = state.create;
    screen.classList.toggle('is-composing', composing);
    var kind = KIND_NAME[state.draft.kind];
    $('.p-compose-line').textContent = kind + ' · ' + M.place;
    $$('[data-tab]', seg).forEach(function (b) {
      b.textContent = { ich: T('Nur ich', 'Just me'), groups: T('Gruppen', 'Groups'), nearby: T('Kiez', 'Neighborhood'), everywhere: T('Überall', 'Everywhere') }[b.dataset.tab];
      b.setAttribute('aria-selected', String(b.dataset.tab === segKey()));
    });
    placePill(animate);
  }
  function render(opts) {
    opts = opts || {};
    syncSeg(false);
    $$('[data-bar]').forEach(function (b) {
      var on = (b.dataset.bar === 'feed' && state.tab !== 'pleasure') || (b.dataset.bar === 'pleasure' && state.tab === 'pleasure');
      b.classList.toggle('is-on', on);
    });
    if (opts.animate) placePill(true);
    var open = challenges.filter(function (c) { return c.kind === 'we' && (!state.status[c.id] || state.status[c.id] === 'accepted'); }).length;
    $('.p-place').textContent = M.place;
    $('.p-count').textContent = M.countText(open);
    if (state.tab === 'pleasure') renderPleasure();
    else if (state.mode === 'gruppe') renderGroups(opts.newId);
    else renderNearby(opts.newId);
    if (opts.animate && !reduce) {
      content.classList.remove('p-swap');
      content.offsetWidth;
      content.classList.add('p-swap');
    }
    syncScenario();
  }

  function setTab(tab) {
    if (tab === state.tab) return;
    state.tab = tab;
    state.focus = null;
    render({ animate: true });
    scroll.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  // ---------- Kater-Hinweis ----------
  var nudge = $('.p-nudge');
  var nudgeTimer;
  // Der Kater sitzt außerhalb des Handys, in der Pill, und zeigt auf den Bereich, um den es geht (Daria, 28.10.2026)
  root.appendChild(nudge);
  function placeNudge() {
    var pr = root.getBoundingClientRect();
    var innen = pr.left < 270;
    nudge.classList.toggle('is-innen', innen);
    nudge.classList.toggle('is-top', innen && !!(state.detail || state.create));
    if (innen) { nudge.style.top = ''; return; }
    var scale = pr.height / root.offsetHeight || 1;
    var ziel = $('.p-ring', screen) || (state.create ? create : state.detail ? sheet : $('.p-tabbar', screen));
    var zr = ziel.getBoundingClientRect();
    var mitte = Math.max(zr.top, pr.top) + Math.min(zr.height, pr.bottom - Math.max(zr.top, pr.top)) / 2;
    var y = (mitte - pr.top) / scale;
    nudge.style.top = Math.max(40, Math.min(root.offsetHeight - 40, y)) + 'px';
  }
  function say(text, mood) {
    $('.p-nudge-cat', nudge).innerHTML = svg(mood === 'high' ? 'catHigh' : 'cat', 28);
    $('.p-nudge-text', nudge).textContent = text;
    nudge.classList.remove('is-on');
    clearTimeout(nudgeTimer);
    // Erst nach dem Ring-Update platzieren, damit der Kater auf den aktuellen Schritt zeigt
    setTimeout(function () {
      placeNudge();
      nudge.offsetWidth;
      nudge.classList.add('is-on');
      nudgeTimer = setTimeout(function () { nudge.classList.remove('is-on'); }, 3400);
    }, 80);
  }
  function hush() {
    clearTimeout(nudgeTimer);
    nudge.classList.remove('is-on');
  }

  // ---------- Coins- oder Kristall-Regen ----------
  function burst(fromEl) {
    if (reduce) return;
    var box = screen.getBoundingClientRect();
    var r = fromEl.getBoundingClientRect();
    var layer = $('.p-burst');
    var x0 = r.left + r.width / 2 - box.left;
    var y0 = r.top + r.height / 2 - box.top;
    var icon = M.unit === 'euro' ? 'coins' : 'diamond';
    for (var i = 0; i < 14; i++) {
      var s = document.createElement('span');
      s.innerHTML = svg(icon, 14 + Math.random() * 10);
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      var d = 70 + Math.random() * 90;
      s.style.left = x0 + 'px';
      s.style.top = y0 + 'px';
      s.style.setProperty('--x', Math.cos(a) * d + 'px');
      s.style.setProperty('--y', Math.sin(a) * d + 'px');
      s.style.setProperty('--r', (Math.random() - 0.5) * 120 + 'deg');
      s.style.animationDelay = Math.random() * 90 + 'ms';
      layer.appendChild(s);
      setTimeout(s.remove.bind(s), 1300);
    }
  }

  // ---------- Detail (Sheet) ----------
  var lastFocus;
  function openDetail(id) {
    if (!find(challenges, id)) return;
    state.detail = id;
    state.hinted = true;
    $$('.p-hint').forEach(function (el) { el.classList.remove('p-hint'); });
    renderDetail();
    lastFocus = document.activeElement;
    showLayer(sheet);
  }

  function renderDetail() {
    var c = find(challenges, state.detail);
    var s = state.status[c.id];
    var who = people[c.author].short;
    var action;
    if (c.author === 'du') action = '<button type="button" class="p-btn p-btn-secondary" data-soon="' + T('Teilen', 'Sharing') + '">' + T('We-Challenge teilen', 'Share We-Challenge') + '</button>';
    // Weiter als 5 km: nur auf Anfrage (Daria, 29.10.2026)
    else if (!s && c.far) action = '<p class="p-help">' + T('Du bist mehr als 5 km entfernt. Du kannst anfragen, {who} entscheidet.', 'You’re more than 5 km away. You can send a request, {who} decides.', { who: who }) + '</p>' +
      '<button type="button" class="p-btn" data-step="request">' + svg('hands', 20) + T('Anfrage senden', 'Send request') + '</button>';
    else if (s === 'requested') action = '<button type="button" class="p-btn p-btn-wait" disabled>' + T('Anfrage bei {who}', 'Request with {who}', { who: who }) + '</button>';
    else if (!s) action = '<button type="button" class="p-btn" data-step="accept">' + svg('hands', 20) + T('We-Challenge annehmen', 'Accept We-Challenge') + '</button>';
    else if (s === 'accepted') action = '<button type="button" class="p-btn" data-step="report">' + T('Erledigt melden', 'Report done') + '</button>';
    else if (s === 'reported') action = '<button type="button" class="p-btn p-btn-wait" disabled>' + T('{who} prüft …', '{who} is checking …', { who: who }) + '</button>';
    else action = '<button type="button" class="p-btn p-btn-ok" disabled>' + svg('check', 12) + ' ' + T('{reward} von {who}', '{reward} from {who}', { reward: rewardText(c.reward), who: who }) + '</button>';
    sheet.innerHTML =
      '<div class="p-grab" aria-hidden="true"></div>' +
      '<button type="button" class="p-close" data-close aria-label="' + T('Schließen', 'Close') + '">' + svg('close', 12) + '</button>' +
      (c.img ? '<div class="p-hero">' + image(c.img) + '</div>' : '') +
      '<div class="p-sheet-body">' +
      statusChip(c.id) +
      '<h3>' + esc(c.title) + '</h3>' +
      '<p class="p-author">' + avatar(c.author, 22) + esc(people[c.author].name) + '</p>' +
      (c.text ? '<p class="p-text">' + esc(c.text) + '</p>' : '') +
      '<div class="p-metrics p-metrics-row"><div><b class="p-bounty-big">' + rewardBadge(c.reward, 18) + '</b><span>' +
      (M.unit === 'euro' ? 'Coins' : T('Edensteine', 'Eden stones')) + '</span></div>' +
      '<div><b>' + esc(c.left.replace(/^noch /, '').replace(/ left$/, '')) + '</b><span>' + T('Frist', 'Deadline') + '</span></div><div><b>' + esc(c.dist) + '</b><span>' +
      (M.unit === 'euro' ? T('Weg', 'Distance') : T('Wo', 'Where')) + '</span></div></div>' +
      action +
      '</div>';
  }

  function step(kind) {
    var c = find(challenges, state.detail);
    var who = people[c.author].short;
    var mode = state.mode;
    if (kind === 'request') {
      state.status[c.id] = 'requested';
      renderDetail();
      say(T('Anfrage ist bei {who}. Du bekommst Bescheid.', 'Request sent to {who}. You’ll hear back.', { who: who }));
      // Im Prototyp sagt Mo nach kurzer Zeit zu
      setTimeout(function () {
        if (state.mode !== mode || state.status[c.id] !== 'requested') return;
        state.status[c.id] = 'accepted';
        if (state.detail === c.id) renderDetail();
        say(T('{who} hat zugesagt. Du bist dabei.', '{who} said yes. You’re in.', { who: who }), 'high');
        render();
      }, 2200);
    } else if (kind === 'accept') {
      state.status[c.id] = 'accepted';
      renderDetail();
      say(T('{who} weiß Bescheid. Melde Dich, wenn es erledigt ist.', '{who} knows. Report back when it’s done.', { who: who }));
    } else if (kind === 'report') {
      state.status[c.id] = 'reported';
      renderDetail();
      say(T('Foto ist dabei. {who} prüft jetzt.', 'Photo attached. {who} is checking now.', { who: who }));
      setTimeout(function () {
        if (state.mode !== mode || state.status[c.id] !== 'reported') return;
        state.status[c.id] = 'confirmed';
        state.earned += c.reward;
        var me = group && find(group.members, 'du');
        if (me) me.score += c.reward;
        if (state.detail === c.id) {
          renderDetail();
          burst($('.p-btn', sheet) || sheet);
        }
        say(M.unit === 'euro' ? T('{who} hat bestätigt. {reward} gehen an Dich.', '{who} confirmed. {reward} go to you.', { who: who, reward: rewardText(c.reward) }) : T('{who} hat bestätigt. {reward} für Dich.', '{who} confirmed. {reward} for you.', { who: who, reward: rewardText(c.reward) }), 'high');
        render();
      }, 1700);
    }
    render();
  }

  // ---------- Neu stellen: Me-Challenge (Vorher, Timer, Nachher) oder We-Challenge ----------
  // Art wählen wie im Erstellen-Blatt der App; nach „Vorher speichern“ steht die Art fest
  function kindSwitch(d) {
    return '<div class="p-choice p-kind" role="radiogroup" aria-label="' + T('Art', 'Type') + '">' +
      M.scenarios.filter(function (k) { return k[0] !== 'feed'; }).map(function (k) {
        return '<button type="button" role="radio" aria-checked="' + (d.kind === k[0]) + '" data-kind="' + k[0] + '">' + KIND_NAME[k[0]] + '</button>';
      }).join('') + '</div>';
  }
  function sugg(list) {
    return '<div class="p-sugg">' + list.map(function (s) { return '<button type="button" class="p-pill" data-sugg="' + esc(s) + '">' + esc(s) + '</button>'; }).join('') + '</div>';
  }
  function photoBox(has, key, tag, label) {
    return '<div class="p-photo' + (has ? ' has-photo' : '') + '">' +
      '<button type="button" class="p-photo-hit" data-photo aria-label="' + (has ? T('Foto ändern', 'Change photo') : T('Foto hinzufügen', 'Add photo')) + '">' +
      (has ? '<span class="p-img">' + image(key) + '</span>' : '<span class="p-photo-empty">' + svg('camera', 22) + '<span>' + label + '</span></span>') +
      '</button>' + (tag && has ? '<span class="p-tag">' + tag + '</span>' : '');
  }

  function renderCreate() {
    var d = state.draft;
    if (d.kind === 'me') return renderMe();
    if (d.kind === 'bild') return renderBild();
    var unit = M.unit === 'euro' ? ' €' : '';
    create.innerHTML =
      '<div class="p-create-body">' +
      kindSwitch(d) +
      photoBox(d.photo, M.create.photo, '', T('Foto aufnehmen oder auswählen', 'Take or choose a photo')) +
      '<div class="p-photo-title"><textarea rows="1" maxlength="90" placeholder="' + T('Titel eingeben', 'Enter title') + '" aria-label="' + T('Titel', 'Title') + '" data-title>' + esc(d.title) + '</textarea></div>' +
      '</div>' +
      sugg(M.create.suggestions) +
      '<label class="p-field"><span>' + T('Beschreibung', 'Description') + '</span><textarea rows="2" maxlength="500" data-text>' + esc(d.text) + '</textarea></label>' +
      '<div class="p-field"><span>' + (M.unit === 'euro' ? 'Coins' : T('Edensteine', 'Eden stones')) + '</span><div class="p-choice" role="radiogroup" aria-label="' + T('Belohnung', 'Reward') + '">' +
      M.create.rewards.map(function (n) { return '<button type="button" role="radio" aria-checked="' + (d.reward === n) + '" data-reward="' + n + '">' + n + unit + '</button>'; }).join('') +
      '</div></div>' +
      '<div class="p-field"><span>' + T('Frist', 'Deadline') + '</span><div class="p-choice" role="radiogroup" aria-label="' + T('Frist', 'Deadline') + '">' +
      ['Heute', '3 Tage', '1 Woche'].map(function (n) { return '<button type="button" role="radio" aria-checked="' + (d.deadline === n) + '" data-deadline="' + n + '">' + deadlineLabel(n) + '</button>'; }).join('') +
      '</div></div>' +
      '<button type="button" class="p-btn" data-publish' + (d.title.trim() ? '' : ' disabled') + '>' + T('Veröffentlichen', 'Publish') + '</button>' +
      '</div>';
    grow($('[data-text]', create));
    grow($('[data-title]', create));
  }

  // Nur ein Bild: Foto, Titel, Beschreibung, sofort posten
  function renderBild() {
    var d = state.draft;
    create.innerHTML =
      '<div class="p-create-body">' +
      kindSwitch(d) +
      photoBox(d.photo, M.bild.photo, '', T('Foto aufnehmen oder auswählen', 'Take or choose a photo')) +
      '<div class="p-photo-title"><textarea rows="1" maxlength="90" placeholder="' + T('Titel eingeben', 'Enter title') + '" aria-label="' + T('Titel', 'Title') + '" data-title>' + esc(d.title) + '</textarea></div>' +
      '</div>' +
      sugg(M.bild.suggestions) +
      '<label class="p-field"><span>' + T('Beschreibung', 'Description') + '</span><textarea rows="2" maxlength="500" data-text>' + esc(d.text) + '</textarea></label>' +
      '<p class="p-help">' + (state.mode === 'ich' ? T('Was Du hier postest, siehst nur Du.', 'Only you see what you post here.') : T('Ein Bild läuft ohne Coins und ohne Aufgabe.', 'A photo has no coins and no task.')) + '</p>' +
      '<button type="button" class="p-btn" data-publish' + (d.photo && d.title.trim() ? '' : ' disabled') + '>' + T('Bild posten', 'Post photo') + '</button>' +
      '</div>';
    grow($('[data-text]', create));
    grow($('[data-title]', create));
  }

  // Timer im Prototyp im Zeitraffer: 1 Sekunde = 10 Minuten. In der App läuft er echt, höchstens 48 h.
  var MAX_MIN = 48 * 60;
  var timerIv = null;
  function minutes(d) {
    return d.start ? Math.min(MAX_MIN, 5 + Math.floor((Date.now() - d.start) / 100)) : 0;
  }
  function took(min) {
    return Math.floor(min / 60) + ' h ' + String(min % 60).padStart(2, '0') + ' min';
  }
  function stopTimer() {
    clearInterval(timerIv);
    timerIv = null;
  }
  function tickTimer() {
    var d = state.draft;
    var el = $('[data-timer]', create);
    if (!state.create || d.stage !== 'timer' || !el) return stopTimer();
    var m = minutes(d);
    el.textContent = took(m);
    var ring = $('[data-ring]', create);
    if (ring) ring.style.strokeDashoffset = String(2 * Math.PI * 54 * (1 - m / MAX_MIN));
  }

  // Ist der nächste Knopf bereit, scrollt das Blatt zu ihm
  function showNext() {
    var btn = $('.p-create-body > .p-btn:not(:disabled)', create);
    if (btn && create.classList.contains('is-open')) create.scrollTo({ top: create.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }

  // Wie in der App (BeforeAfterForm): Schritte Vorher · Timer · Nachher und Beschreibung mit fester Marke
  function meSteps(at) {
    var names = [T('Vorher', 'Before'), 'Timer', T('Nachher', 'After')];
    return '<div class="p-steps" aria-label="' + T('Schritt {n} von 3', 'Step {n} of 3', { n: at + 1 }) + '">' + names.map(function (n, i) {
      return '<span class="p-step' + (i === at ? ' is-on' : i < at ? ' is-done' : '') + '"><i>' + (i + 1) + '</i>' + n + '</span>' + (i < 2 ? '<span class="p-step-bar"></span>' : '');
    }).join('') + '</div>';
  }
  function tagField(tag, attr, value, placeholder) {
    return '<label class="p-field"><span>' + T('Beschreibung', 'Description') + '</span><span class="p-tagbox"><b>' + tag + '</b><textarea rows="2" maxlength="240" ' + attr +
      ' placeholder="' + placeholder + '">' + esc(value) + '</textarea></span></label>';
  }

  function renderMe() {
    var d = state.draft;
    var body;
    if (d.stage === 'vorher') {
      body =
        kindSwitch(d) +
        '<p class="p-help">' + T('Halte fest, wie Du etwas reparierst, umbaust, verschönerst oder eine neue, nützliche Gewohnheit übst. Dokumentiere zuerst mit einem Foto den Stand „vorher“.', 'Capture how you repair, rebuild or beautify something, or practise a new, useful habit. First document the “before” state with a photo.') + '</p>' +
        meSteps(0) +
        photoBox(d.photo, meData().before, T('Vorher', 'Before'), T('Vorher-Foto aufnehmen', 'Take before photo')) +
        '<div class="p-photo-title"><textarea rows="1" maxlength="90" placeholder="' + T('Titel eingeben', 'Enter title') + '" aria-label="' + T('Titel', 'Title') + '" data-title>' + esc(d.title) + '</textarea></div>' +
        '</div>' +
        '<p class="p-help">' + T('So sieht es jetzt aus.', 'This is how it looks now.') + '</p>' +
        tagField('#vorher', 'data-text', d.text, T('Was ist die Aufgabe oder die Ausgangslage? Erkläre kurz, worin die Me-Challenge besteht.', 'What is the task or the starting point? Briefly explain what the Me-Challenge is about.')) +
        '<button type="button" class="p-btn" data-me-save' + (d.photo && d.title.trim() ? '' : ' disabled') + '>' + T('Vorher speichern', 'Save before') + '</button>';
    } else if (d.stage === 'timer') {
      var r = 2 * Math.PI * 54;
      var m = minutes(d);
      body =
        meSteps(1) +
        '<div class="p-mini"><span class="p-thumb">' + image(meData().before) + '</span><span><strong>' + esc(d.title) + '</strong>' +
        '<i>' + T('Vorher gespeichert um {uhr} Uhr', 'Before saved at {uhr}', { uhr: clockOf(d.start) }) + '</i></span></div>' +
        '<div class="p-timer"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="p-timer-track"/>' +
        '<circle cx="60" cy="60" r="54" class="p-timer-bar" data-ring stroke-dasharray="' + r + '" stroke-dashoffset="' + r * (1 - m / MAX_MIN) + '"/></svg>' +
        '<div><b data-timer>' + took(m) + '</b><span>' + T('von 48 h', 'of 48 h') + '</span></div></div>' +
        '<p class="p-help">' + T('Der Timer läuft auch im Hintergrund. Nach 48 h postet die App den Beitrag, auch ohne Nachher-Foto.', 'The timer keeps running in the background. After 48 h the app posts it, even without an after photo.') + '</p>' +
        '<button type="button" class="p-btn" data-me-after>' + svg('cameraDark', 14) + T('Nachher aufnehmen', 'Take after photo') + '</button>';
    } else {
      body =
        meSteps(2) +
        photoBox(d.after, meData().after, T('Nachher', 'After'), T('Nachher-Foto aufnehmen', 'Take after photo')) + '</div>' +
        '<p class="p-help">' + T('So sieht es jetzt aus. Die Überschrift „{title}“ gilt für Vorher und Nachher.', 'This is how it looks now. The title “{title}” applies to before and after.', { title: esc(d.title) }) + '</p>' +
        tagField('#nachher', 'data-after-text', d.afterText, T('Was hast Du gemacht?', 'What did you do?')) +
        '<button type="button" class="p-btn" data-me-post' + (d.after ? '' : ' disabled') + '>' + T('Me-Challenge posten', 'Post Me-Challenge') + '</button>';
    }
    create.innerHTML = '<div class="p-create-body p-me-' + d.stage + '">' + body + '</div>';
    $$('textarea', create).forEach(grow);
    if (d.stage === 'timer' && !timerIv) timerIv = setInterval(tickTimer, 100);
  }
  function deadlineLabel(n) {
    return { Heute: T('Heute', 'Today'), '3 Tage': T('3 Tage', '3 days'), '1 Woche': T('1 Woche', '1 week') }[n];
  }
  function clockOf(t) {
    return new Date(t).toTimeString().slice(0, 5);
  }

  function meSave() {
    var d = state.draft;
    if (!d.photo || !d.title.trim()) return;
    d.stage = 'timer';
    d.start = Date.now();
    create.scrollTop = 0;
    renderMe();
    syncScenario();
    say(T('Vorher ist gespeichert. Leg los!', 'Before is saved. Get going!'));
  }
  function meAfter() {
    var d = state.draft;
    d.took = took(minutes(d));
    stopTimer();
    d.stage = 'nachher';
    create.scrollTop = 0;
    renderMe();
    syncScenario();
  }
  function mePost() {
    var d = state.draft;
    if (!d.after) return;
    state.created += 1;
    var id = 'neu' + state.created;
    challenges.unshift({
      id: id, kind: 'me', title: d.title.trim(), text: d.afterText.trim() || d.text.trim(),
      author: 'du', before: meData().before, after: meData().after, took: d.took, comments: 0, likes: 0,
    });
    finishCreate(id);
    // Coin-Animation kommt später (Übergabe: Coin-Animation bei der Me-Challenge)
    say(meData().done, 'high');
  }

  function grow(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 2 + 'px';
  }

  function openCreate(kind) {
    state.create = true;
    if (kind && kind !== state.draft.kind && state.draft.stage === 'vorher') state.draft.kind = kind;
    scroll.scrollTo({ top: 0 });
    renderCreate();
    syncSeg(true);
    lastFocus = document.activeElement;
    showLayer(create);
    syncScenario();
  }
  function setKind(kind) {
    var d = state.draft;
    if (d.kind === kind || d.stage !== 'vorher') return;
    clearTimeout(autoTimer);
    autoTimer = null;
    // Neue Art, neuer Entwurf: Titel und Text der vorigen Art bleiben nicht stehen (Daria, 28.10.2026)
    state.draft = newDraft(kind);
    renderCreate();
    syncSeg(false);
    syncScenario();
    $('[data-kind="' + kind + '"]', create).focus({ preventScroll: true });
    autofill();
  }

  // ---------- Scrollen im Erstellen-Blatt füllt das Formular wie von selbst ----------
  var autoTimer = null;
  function autofill() {
    var d = state.draft;
    if (!state.create || autoTimer) return;
    var mode = state.mode;
    var queue;
    var button;
    if (d.kind === 'me' && d.stage === 'nachher') {
      if (d.afterText.trim()) return;
      d.after = true;
      renderMe();
      queue = [[$('[data-after-text]', create), 'afterText', meData().demoAfter]];
      button = '[data-me-post]';
    } else if (d.stage === 'vorher' && !d.title.trim()) {
      var demo = d.kind === 'me' ? meData().demo : d.kind === 'bild' ? M.bild.demo : M.create.demo;
      d.photo = true;
      renderCreate();
      queue = [[$('[data-title]', create), 'title', demo[0]], [$('[data-text]', create), 'text', demo[1]]];
      button = d.kind === 'me' ? '[data-me-save]' : '[data-publish]';
    } else return;
    var q = 0, i = 0;
    function tick() {
      if (!state.create || state.mode !== mode) { autoTimer = null; return; }
      var job = queue[q];
      if (!job) {
        autoTimer = null;
        var btn = $(button, create);
        if (!btn) return;
        btn.disabled = false;
        updateRing();
        // Fertig ausgefüllt: zum nächsten Schritt scrollen (Daria, 28.10.2026)
        create.scrollTo({ top: create.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
        if (!reduce) { btn.classList.remove('p-ready'); btn.offsetWidth; btn.classList.add('p-ready'); }
        return;
      }
      i += 1;
      d[job[1]] = job[2].slice(0, i);
      job[0].value = d[job[1]];
      grow(job[0]);
      if (job[1] === 'title') $(button, create).disabled = true;
      if (i >= job[2].length) { q += 1; i = 0; autoTimer = setTimeout(tick, 260); return; }
      autoTimer = setTimeout(tick, reduce ? 0 : job[1] === 'title' ? 55 : 22);
    }
    autoTimer = setTimeout(tick, reduce ? 0 : 450);
  }
  create.addEventListener('wheel', function (e) { if (e.deltaY > 0) autofill(); }, { passive: true });
  create.addEventListener('scroll', function () { if (create.scrollTop > 10) autofill(); }, { passive: true });
  window.addEventListener('scroll', function () {
    if (!state.create) return;
    var r = root.getBoundingClientRect();
    if (r.top < 0 && r.bottom > 0) autofill();
  }, { passive: true });
  // Wer selbst tippt, hält die Vorführung an
  create.addEventListener('keydown', function (e) {
    clearTimeout(autoTimer); autoTimer = null;
    // Titel bleibt einzeilig im Inhalt, bricht aber sichtbar um
    if (e.key === 'Enter' && e.target.matches('[data-title]')) e.preventDefault();
  });

  function publish() {
    var d = state.draft;
    if (d.kind === 'bild') {
      if (!d.photo || !d.title.trim()) return;
      state.created += 1;
      var bid = 'neu' + state.created;
      challenges.unshift({ id: bid, kind: 'bild', title: d.title.trim(), text: d.text.trim(), author: 'du', img: M.bild.photo, comments: 0, likes: 0 });
      finishCreate(bid);
      say(M.bild.published, 'high');
      return;
    }
    state.created += 1;
    var id = 'neu' + state.created;
    challenges.unshift({
      id: id,
      kind: 'we',
      title: d.title.trim(),
      text: d.text.trim(),
      author: 'du',
      reward: d.reward,
      dist: M.unit === 'euro' ? T('hier', 'here') : T('im Haus', 'in the building'),
      left: d.deadline === 'Heute' ? T('heute', 'today') : T('noch {frist}', '{frist} left', { frist: deadlineLabel(d.deadline) }),
      img: d.photo ? M.create.photo : null,
      comments: 0,
      likes: 0,
    });
    finishCreate(id);
    say(M.create.published, 'high');
  }
  function finishCreate(id) {
    stopTimer();
    state.draft = newDraft();
    hideLayer(create);
    state.create = false;
    syncSeg(true);
    state.tab = 'nearby';
    state.focus = null;
    state.hinted = true;
    render({ newId: id });
    scroll.scrollTo({ top: 0 });
    heartBurst();
  }
  // Herz-Animation nach dem Posten wie in der App (src/components/HeartBurst.tsx): Doppelherz springt in die Mitte,
  // kleine Herzen steigen auf. Mit „Bewegung reduzieren“ nur kurz ein- und ausblenden.
  function heartBurst() {
    var old = $('.p-burst');
    if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'p-burst' + (reduce ? ' p-burst-still' : '');
    el.setAttribute('aria-hidden', 'true');
    var html = '<span class="p-burst-big">' + svg('feedOn', 72) + '</span>';
    if (!reduce) {
      [[-52, 80, 20], [44, 160, 16], [-20, 260, 14], [62, 320, 12], [14, 420, 15]].forEach(function (s) {
        html += '<span class="p-burst-small" style="--x:' + s[0] + 'px;animation-delay:' + s[1] + 'ms">' + svg('feedOn', s[2]) + '</span>';
      });
    }
    el.innerHTML = html;
    screen.appendChild(el);
    setTimeout(function () { el.remove(); }, 1400);
  }

  // ---------- Ebenen ----------
  function showLayer(el) {
    el.setAttribute('aria-hidden', 'false');
    el.classList.add('is-open');
    el.style.transform = '';
    el.scrollTop = 0;
    if (el === create) { setTimeout(function () { el.focus({ preventScroll: true }); }, 30); return; }
    scrim.hidden = false;
    scrim.offsetWidth;
    scrim.classList.add('is-on');
    setTimeout(function () { el.focus({ preventScroll: true }); }, 30);
  }
  function hideLayer(el) {
    el.setAttribute('aria-hidden', 'true');
    el.classList.remove('is-open');
    el.style.transform = '';
    if (!$('.p-sheet.is-open, .p-create.is-open')) {
      scrim.classList.remove('is-on');
      setTimeout(function () { if (!scrim.classList.contains('is-on')) scrim.hidden = true; }, 400);
    }
  }
  function closeAll(restore) {
    if (state.detail) { hideLayer(sheet); state.detail = null; }
    if (state.create) {
      hideLayer(create);
      state.create = false;
      stopTimer();
      syncSeg(true);
      // Laufende Me-Challenge erscheint oben im Feed
      if (state.draft.stage !== 'vorher') render();
    }
    syncScenario();
    if (restore && lastFocus && root.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  // Sheet zum Schließen nach unten ziehen
  (function drag(el) {
    var startY = null;
    var dy = 0;
    el.addEventListener('pointerdown', function (e) {
      if (!el.classList.contains('is-open')) return;
      if (e.target.closest('button, input') || el.scrollTop > 0) return;
      startY = e.clientY;
      dy = 0;
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-drag');
    });
    el.addEventListener('pointermove', function (e) {
      if (startY === null) return;
      dy = Math.max(0, e.clientY - startY);
      el.style.transform = 'translateY(' + dy + 'px)';
    });
    function end() {
      if (startY === null) return;
      startY = null;
      el.classList.remove('is-drag');
      if (dy > 90) closeAll(true);
      else el.style.transform = '';
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  })(sheet);

  // ---------- Gruppe: Aufgabe erledigen, Rangliste neu ordnen ----------
  function doTask(id) {
    var t = find(group.tasks, id);
    if (!t || t.done) return;
    var board = $('.p-board');
    var before = {};
    if (board) $$('li', board).forEach(function (li) { before[li.dataset.member] = li.getBoundingClientRect().top; });
    var rankBefore = group.members.slice().sort(function (a, b) { return b.score - a.score; });
    t.done = true;
    var me = find(group.members, 'du');
    var from = me.score;
    me.score += t.eden;
    renderGroups();
    var nb = $('.p-board');
    // FLIP: alte Lage zuerst, dann mit „Schranke“ an den neuen Platz
    if (nb) $$('li', nb).forEach(function (li) {
      var dy = before[li.dataset.member] - li.getBoundingClientRect().top;
      if (!dy || reduce) return;
      li.style.transition = 'none';
      li.style.transform = 'translateY(' + dy + 'px)';
      li.offsetWidth;
      li.style.transition = '';
      li.style.transform = '';
    });
    var scoreEl = nb && $('[data-member="du"] .p-score', nb);
    if (scoreEl && !reduce) {
      var n = from;
      scoreEl.textContent = n;
      var iv = setInterval(function () {
        n += 1;
        scoreEl.textContent = n;
        if (n >= me.score) clearInterval(iv);
      }, 90);
    }
    var rankAfter = group.members.slice().sort(function (a, b) { return b.score - a.score; });
    var posBefore = rankBefore.indexOf(me);
    var posAfter = rankAfter.indexOf(me);
    var text = T('{reward} für Dich.', '{reward} for you.', { reward: rewardText(t.eden) });
    var mood = 'default';
    if (posAfter === 0 && posBefore !== 0) { text = T('{reward}. Du führst!', '{reward}. You’re in the lead!', { reward: rewardText(t.eden) }); mood = 'high'; }
    else if (posAfter < posBefore) { text = T('{reward}. Du überholst {name}.', '{reward}. You overtake {name}.', { reward: rewardText(t.eden), name: people[rankBefore[posAfter].id].short }); mood = 'high'; }
    say(text, mood);
  }

  // ---------- Ereignisse ----------
  var whoTimer;
  root.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || !root.contains(t)) return;
    var d = t.dataset;
    if (d.tab) {
      var target = MODE_OF[d.tab];
      if (target !== state.mode) return switchMode(target, true);
      return setTab('nearby');
    }
    if (d.tabGo) return setTab(d.tabGo);
    if (d.bar) {
      if (d.bar === 'menu') return say(T('Konto und Einstellungen gibt es in der App.', 'Account and settings are in the app.'));
      closeAll();
      return setTab(d.bar === 'pleasure' ? 'pleasure' : 'nearby');
    }
    // Karte: einmal tippen zeigt, wer gepostet hat; noch mal tippen öffnet sie (wie in der App)
    if (d.open && t.classList.contains('p-card') && !t.classList.contains('is-who')) {
      $$('.p-card.is-who').forEach(function (el) { el.classList.remove('is-who'); });
      t.classList.add('is-who');
      clearTimeout(whoTimer);
      whoTimer = setTimeout(function () { t.classList.remove('is-who'); }, 4000);
      return;
    }
    if (d.open) return openDetail(d.open);
    if (d.like) {
      state.liked[d.like] = !state.liked[d.like];
      var c = find(challenges, d.like);
      var on = state.liked[d.like];
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-pressed', String(on));
      t.innerHTML = '<span class="p-heart">' + svg(on ? 'heartOn' : 'heart', 17) + '</span><span>' + (c.likes + (on ? 1 : 0)) + '</span>';
      return;
    }
    if (d.pair) {
      // Vorher-Nachher-Karte: Hälfte vergrößern, noch mal tippen stellt zurück
      var pair = t.closest('.p-pair');
      pair.dataset.focus = pair.dataset.focus === 'none' ? d.pair : 'none';
      return;
    }
    if ('meOpen' in d) return openCreate('me');
    if (d.kind) return setKind(d.kind);
    if ('meSave' in d) return meSave();
    if ('meAfter' in d) return meAfter();
    if ('mePost' in d) return mePost();
    if (d.soon) return say(T('{was} gibt es in der App.', '{was} is in the app.', { was: d.soon }));
    if ('close' in d) return closeAll(true);
    if (d.step) return step(d.step);
    if (t.classList.contains('p-camera')) return openCreate();
    if ('photo' in d) {
      var dr = state.draft;
      if (dr.kind === 'me' && dr.stage === 'nachher') dr.after = !dr.after;
      else dr.photo = !dr.photo;
      renderCreate();
      $('[data-photo]', create).focus({ preventScroll: true });
      updateRing();
      showNext();
      return;
    }
    if (d.sugg) {
      state.draft.title = d.sugg;
      renderCreate();
      var next = $('[data-publish], [data-me-save]', create);
      if (next) next.focus({ preventScroll: true });
      updateRing();
      showNext();
      return;
    }
    if (d.reward) { state.draft.reward = +d.reward; renderCreate(); $('[data-reward="' + d.reward + '"]', create).focus(); return; }
    if (d.deadline) { state.draft.deadline = d.deadline; renderCreate(); $('[data-deadline="' + d.deadline + '"]', create).focus(); return; }
    if ('publish' in d) return publish();
    if (d.taskDo) return doTask(d.taskDo);
    if (d.ziel) {
      var z = find(challenges, d.ziel);
      if (!z || z.today) return;
      z.today = true;
      z.done += 1;
      z.streak += 1;
      render();
      burst($('.p-ziel .p-done') || t);
      say(z.streak % 7 === 0 ? T('Eine ganze Woche am Stück!', 'A whole week in a row!') : T('{n} Tage in Folge. Weiter so!', '{n} days in a row. Keep going!', { n: z.streak }), 'high');
      return;
    }
  });
  create.addEventListener('input', function (e) {
    var dr = state.draft;
    if (e.target.matches('[data-text]')) { dr.text = e.target.value; return grow(e.target); }
    if (e.target.matches('[data-after-text]')) { dr.afterText = e.target.value; return grow(e.target); }
    if (!e.target.matches('[data-title]')) return;
    dr.title = e.target.value.replace(/\n/g, ' ');
    grow(e.target);
    var btn = $('[data-publish], [data-me-save]', create);
    btn.disabled = !dr.title.trim() || (dr.kind !== 'we' && !dr.photo);
    updateRing();
  });
  scrim.addEventListener('click', function () { closeAll(true); });
  root.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && (state.detail || state.create)) { e.stopPropagation(); closeAll(true); }
  });

  // ---------- Rolle und Szenarien neben dem Telefon ----------
  var picker = document.getElementById('szenarien');
  var roles = document.getElementById('rolle');
  var headline = document.querySelector('.hero h1');
  var lede = document.querySelector('.hero .lede');
  var pickText = document.getElementById('szenario-text');
  function first() {
    return M.scenarios[0][0];
  }
  function current() {
    if (pending) return pending;
    if (state.create) return state.draft.kind;
    if (state.detail) return 'feed';
    if (state.focus) return state.focus;
    // Beim Laden ist nichts gewählt; nach einem Wechsel des Reiters steht Feed (Daria, 28.10.2026)
    return chosen ? 'feed' : null;
  }
  function moveMark(container, active) {
    var mark = container && container.querySelector('.szenario-mark');
    if (!mark) return;
    mark.style.opacity = active ? '' : '0';
    if (!active) return;
    mark.style.transform = 'translate(' + active.offsetLeft + 'px,' + active.offsetTop + 'px)';
    mark.style.width = active.offsetWidth + 'px';
    mark.style.height = active.offsetHeight + 'px';
  }
  // Überschrift Wort für Wort einblenden, nur wenn sich der Text ändert (Daria, 28.10.2026)
  function setHeadline(text) {
    if (headline.getAttribute('aria-label') === text) return;
    headline.setAttribute('aria-label', text);
    headline.innerHTML = text.split(' ').map(function (w, i) {
      return '<span class="h-wort" aria-hidden="true" style="--i:' + i + '">' + esc(w) + '</span>';
    }).join(' ');
  }
  function labelScenarios() {
    if (headline && M.headline) setHeadline(M.headline);
    if (!picker) return;
    $$('[data-szenario]', picker).forEach(function (b, i) {
      var l = M.scenarios[i];
      b.hidden = !l;
      if (!l) return;
      b.dataset.szenario = l[0];
      b.querySelector('b').textContent = l[1];
      b.querySelector('span').textContent = l[2];
      b.querySelector('i').textContent = l[3];
    });
  }
  function syncScenario() {
    if (picker) {
      var cur = current();
      var active;
      $$('[data-szenario]', picker).forEach(function (b) {
        var on = !b.hidden && b.dataset.szenario === cur;
        b.setAttribute('aria-pressed', String(on));
        if (on) active = b;
      });
      moveMark(picker, active);
    }
    // Telefon und Tablet: Die Leiste ist ausgeblendet; der Satz darunter beschreibt, was der Prototyp gerade zeigt.
    // Ohne Wahl zeigt der Prototyp den Feed. Ohne passendes Szenario (z. B. Rangliste) bleibt der Satz weg.
    if (pickText) {
      var shown = current() || 'feed';
      var line = M.scenarios.filter(function (k) { return k[0] === shown; })[0];
      if (line && pickText.textContent !== line[2]) pickText.textContent = line[2];
      pickText.style.display = line ? '' : 'none';
    }
    if (lede) {
      var t = (M.ledes && M.ledes[current()]) || LEDE;
      if (lede.textContent !== t) lede.textContent = t;
    }
    if (roles) {
      var r;
      $$('[data-rolle]', roles).forEach(function (b) {
        var on = b.dataset.rolle === state.mode;
        b.setAttribute('aria-checked', String(on));
        if (on) r = b;
      });
      moveMark(roles, r);
    }
    updateRing();
  }
  // ---------- Ringe: zum Szenario links leuchtet rechts der Knopf, mit dem es weitergeht ----------
  var preview = null; // Szenario unter der Maus links
  function openWe() {
    return challenges.filter(function (c) { return c.kind === 'we' && c.author !== 'du' && !state.status[c.id]; })[0] ||
      challenges.filter(function (c) { return c.kind === 'we' && c.author !== 'du'; })[0];
  }
  function firstOpenCard() {
    var c = openWe();
    return c && $('.p-post[data-id="' + c.id + '"] .p-card');
  }
  function ringTarget(name) {
    if (!preview || preview === current()) {
      // Nächster Schritt im laufenden Szenario
      if (state.create) {
        var dr = state.draft;
        // Erst das Foto, gleich für Me, We und Bild (Daria, 28.10.2026)
        if (dr.stage === 'vorher' && !dr.photo) return $('.p-photo', create);
        if (dr.kind === 'me' && dr.stage === 'nachher' && !dr.after) return $('.p-photo', create);
        return $('.p-create-body > .p-btn:not(:disabled)', create) || $('.p-photo-title', create);
      }
      if (state.detail) return $('.p-btn:not(:disabled)', sheet);
    }
    // In „Was Du so machst“ kein Ring: Wer gerade die Krone gewählt hat, soll nicht zurückgeschickt werden
    if (state.tab === 'pleasure') return null;
    // Me-Challenge: ein laufender Timer im Feed, sonst die Kamera
    if (name === 'me') return $('[data-me-open]') || $('[data-ziel]') || $('.p-camera');
    if (name === 'bild') return $('.p-camera');
    if (name === 'rangliste') return state.mode === 'gruppe' ? $('[data-task-do]') || $('.p-board') : $('.p-seg [data-tab="groups"]');
    if (name === 'feed') return null;
    return firstOpenCard();
  }
  function updateRing() {
    $$('.p-ring').forEach(function (el) { el.classList.remove('p-ring'); });
    var el = ringTarget(preview || current());
    if (el) el.classList.add('p-ring');
  }

  // Ist noch ein Blatt offen, schließt es erst ganz, dann öffnet nach einer kurzen Pause das neue (Daria, 28.10.2026)
  var goTimer = null;
  var chosen = false;
  var pending = null;
  function go(name) {
    chosen = true;
    clearTimeout(goTimer);
    if (state.detail || state.create) {
      // Die Markierung links springt gleich zum neuen Knopf und wartet dort, statt über Feed zu wandern
      pending = name;
      closeAll();
      goTimer = setTimeout(function () { pending = null; goNow(name); }, reduce ? 0 : 650);
      return;
    }
    goNow(name);
  }
  function goNow(name) {
    closeAll();
    state.focus = null;
    if (name === 'rangliste' && state.mode !== 'gruppe') switchMode('gruppe');
    if (state.tab !== 'nearby') { state.tab = 'nearby'; render({ animate: true }); }
    // Ein Tipp auf eine Karte links startet ihren Ablauf im Telefon von selbst (Daria, 28.10.2026)
    if (name === 'me') {
      var ziel = state.mode === 'ich' && find(challenges, 'klavier');
      if (ziel && !ziel.today) {
        // Nur ich: das eigene Ziel zählt den heutigen Tag
        scroll.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        syncScenario();
        setTimeout(function () { var b = $('[data-ziel]'); if (b && state.mode === 'ich') b.click(); }, reduce ? 0 : 700);
        return;
      }
      if (state.draft.stage === 'vorher') state.draft = newDraft('me');
      openCreate('me');
      autofill();
      return;
    }
    if (name === 'bild') {
      if (state.draft.stage === 'vorher') state.draft = newDraft('bild');
      openCreate('bild');
      autofill();
      return;
    }
    // Jeder Knopf links führt zum Posten (Daria, 28.10.2026)
    if (name === 'we') {
      if (state.draft.stage === 'vorher') state.draft = newDraft('we');
      openCreate('we');
      autofill();
      return;
    }
    // Feed: einfach die Beiträge der anderen ansehen
    if (name === 'feed') {
      scroll.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      syncScenario();
      return;
    }
    if (name === 'rangliste') {
      state.focus = 'rangliste';
      var board = $('.p-board-title');
      if (board) scroll.scrollTo({ top: board.offsetTop - 60, behavior: reduce ? 'auto' : 'smooth' });
    }
    syncScenario();
  }
  // fromPhone: Wechsel über die Pille im Telefon. Nur dann zieht ein angefangener Entwurf mit um.
  // Der Schalter neben dem Telefon startet beide Orte gleich im Feed (Daria, 26.10.2026).
  function switchMode(mode, fromPhone) {
    if (mode === state.mode) return;
    chosen = true;
    var composing = fromPhone && state.create;
    var draft = state.draft;
    if (!composing) closeAll();
    hush();
    load(mode);
    // Ein angefangener Entwurf zieht mit um, ein laufender Timer läuft weiter
    // Nur ich kennt keine We-Challenge: ein angefangener Entwurf wird zur Me-Challenge
    if (mode === 'ich' && draft.kind === 'we') { draft.kind = 'me'; draft.photo = false; }
    if (composing || draft.stage !== 'vorher') {
      draft.reward = M.create.reward;
      state.draft = draft;
    }
    if (composing) {
      state.create = true;
      renderCreate();
    }
    labelScenarios();
    scroll.scrollTo({ top: 0 });
    render({ animate: true });
    if (!reduce) {
      screen.classList.remove('p-flip');
      screen.offsetWidth;
      screen.classList.add('p-flip');
    }
    say(mode === 'gruppe' ? T('Du bist jetzt im Hof Kastanienallee.', 'You’re now in Hof Kastanienallee.') : mode === 'ueberall' ? T('Jetzt siehst Du Beiträge von überall.', 'Now you see posts from everywhere.') : mode === 'ich' ? T('Hier siehst nur Du, was Du postest.', 'Only you see what you post here.') : T('Du bist jetzt in Connewitz unterwegs.', 'You’re now out and about in Connewitz.'));
  }
  if (picker) {
    picker.addEventListener('pointerover', function (e) {
      var b = e.target.closest('[data-szenario]');
      var name = b ? b.dataset.szenario : null;
      if (name !== preview) { preview = name; updateRing(); }
    });
    picker.addEventListener('pointerleave', function () { preview = null; updateRing(); });
    picker.addEventListener('focusin', function (e) {
      var b = e.target.closest('[data-szenario]');
      if (b) { preview = b.dataset.szenario; updateRing(); }
    });
    picker.addEventListener('focusout', function () { preview = null; updateRing(); });
    picker.addEventListener('click', function (e) {
      var b = e.target.closest('[data-szenario]');
      if (b) go(b.dataset.szenario);
    });
  }
  if (roles) {
    roles.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rolle]');
      if (b) switchMode(b.dataset.rolle);
    });
    // Pfeiltasten wechseln wie bei Radio-Knöpfen
    roles.addEventListener('keydown', function (e) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
      e.preventDefault();
      var order = ['ich', 'gruppe', 'kiez', 'ueberall'];
      var step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
      if (document.documentElement.dir === 'rtl' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) step = -step;
      var next = order[(order.indexOf(state.mode) + step + order.length) % order.length];
      switchMode(next);
      $('[data-rolle="' + next + '"]', roles).focus();
    });
  }
  // ---------- Lila Punkt statt Mauszeiger über klickbaren Flächen ----------
  var area = document.getElementById('prototyp-bereich');
  if (area && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    var dot = document.createElement('span');
    dot.className = 'klick-punkt';
    dot.setAttribute('aria-hidden', 'true');
    dot.innerHTML = '<span></span>';
    document.body.appendChild(dot);
    area.classList.add('mit-punkt');
    var over = null;
    function clickable(el) {
      var b = el && el.closest('button');
      if (!b || !area.contains(b) || b.disabled) return null;
      if (['aria-pressed', 'aria-checked', 'aria-selected'].some(function (a) { return b.getAttribute(a) === 'true'; })) return null;
      return b;
    }
    area.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var b = clickable(e.target);
      dot.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
      if (b) dot.classList.toggle('is-grau', getComputedStyle(b).backgroundColor === 'rgb(126, 148, 255)');
      if (b !== over) {
        over = b;
        dot.classList.remove('is-on');
        if (b) { dot.offsetWidth; dot.classList.add('is-on'); }
      }
    });
    area.addEventListener('pointerleave', function () { over = null; dot.classList.remove('is-on'); });
    // Nach einem Klick ändert sich oft, ob der Knopf noch klickbar ist (z. B. gewählter Chip)
    area.addEventListener('click', function (e) {
      setTimeout(function () {
        var b = clickable(document.elementFromPoint(e.clientX, e.clientY));
        if (b !== over) { over = b; dot.classList.toggle('is-on', !!b); }
      }, 0);
    });
  }

  window.addEventListener('resize', function () { placePill(false); syncScenario(); });

  load('kiez');
  labelScenarios();
  render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placePill(false); syncScenario(); });
  root.classList.add('is-ready');
})();
