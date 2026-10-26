// Klickbarer Prototyp der App auf kiezcoins.de. Läuft ohne Server und ohne Konto, alle Daten sind Beispiele.
// Zwei Orte: „Kiez“ (Nachbarschaft, We-Challenges mit Coins) und „Gruppe Luxor“ (Aufgaben mit Edensteinen).
// Drei Hauptfunktionen (Daria, 25.10.2026): Me-Challenge (Standard, ohne Coins), We-Challenge, Kiez und Gruppe.
// Icons, Kater, Kartenbilder und die Liste der Fotos kommen aus `prototyp/daten.js` (erzeugt von
// scripts/build-download-site.mjs aus denselben SVGs wie die App). Bewegung „Schranke“ wie in src/theme/tokens.ts.
(function () {
  'use strict';
  var KC = window.KC;
  var root = document.getElementById('prototyp');
  if (!KC || !root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  // Eigene Me-Challenge im Prototyp, in beiden Orten gleich (Vorher hohes Gras, Nachher gepflegte Beete)
  var ME = {
    before: 'rasen',
    after: 'garten',
    suggestions: ['Gemeinschaftsgarten pflegen', 'Müll im Park sammeln', 'Fahrradkeller aufräumen'],
    demo: ['Gemeinschaftsgarten pflegen', 'Das Gras steht kniehoch, die Beete sind voller Unkraut.'],
    demoAfter: 'Gemäht und gejätet. Die Beete sind bereit für den Winter.',
    done: '1 gute Tat für den Kiez!',
  };

  // ---------- Beispieldaten je Ort ----------
  // kind: 'me' = Me-Challenge (Vorher-Nachher, ohne Belohnung), 'we' = We-Challenge (Coins bzw. Edensteine)
  var MODES = {
    kiez: {
      unit: 'euro',
      place: 'Connewitz',
      countText: function (n) { return n === 1 ? '1 We-Challenge in Deiner Nähe' : n + ' We-Challenges in Deiner Nähe'; },
      headline: 'Kleine Challenges für Deinen Kiez.',
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
          author: 'lena', before: 'muell', after: 'igel', took: '1 h 40 min', comments: 3, likes: 24,
        },
        {
          id: 'fahrrad', kind: 'we',
          title: 'Platten am Kinderrad flicken',
          text: 'Am Rad meiner Tochter ist hinten der Schlauch platt. Flickzeug habe ich, aber ich bekomme den Reifen nicht von der Felge. Sie braucht das Rad Montag für den Schulweg.',
          author: 'mo', reward: 8, dist: '450 m', left: 'noch 3 Tage', img: 'fahrrad', comments: 1, likes: 6,
        },
        {
          id: 'hund', kind: 'we',
          title: 'Mittags mit Bruno Gassi gehen',
          text: 'Mittwoch und Donnerstag gegen 13 Uhr, eine Runde von 45 Minuten. Ich bin bis abends im Büro. Bruno ist ruhig und läuft gut an der Leine.',
          author: 'peter', reward: 5, dist: '200 m', left: 'noch 2 Tage', img: 'hund', comments: 2, likes: 9,
        },
      ],
      group: null,
      create: {
        suggestions: ['Tonnen rausstellen', 'Igelhaus aufbauen', 'Fahrradkeller aufräumen'],
        demo: ['Tonnen rausstellen', 'Die Mülltonnen müssen Dienstag früh an die Straße und Mittwoch wieder rein. Ich bin verreist.'],
        rewards: [5, 10, 15, 20],
        reward: 10,
        photo: 'tonnen',
        published: 'Deine We-Challenge ist online. Die Nachbarschaft sieht sie jetzt.',
      },
      // Reihenfolge = Reihenfolge der Knöpfe neben dem Telefon: [Schlüssel, Titel, Text, Kurzform fürs Handy]
      scenarios: [
        ['me', 'Me-Challenge', 'Du forderst Dich selbst heraus: Vorher-Foto, loslegen, Nachher-Foto. Eine gute Tat für den Kiez, ganz ohne Coins.', 'Me-Challenge'],
        ['we', 'We-Challenge', 'Eine Aufgabe für den Kiez, mit Coins als Belohnung. Annehmen, erledigen, Coins bekommen.', 'We-Challenge'],
      ],
    },
    gruppe: {
      unit: 'eden',
      place: 'Gruppe Luxor',
      countText: function (n) { return n === 1 ? '1 offene Aufgabe' : n + ' offene Aufgaben'; },
      headline: 'Kleine Challenges für Deine Gruppe.',
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
        name: 'Gruppe Luxor',
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
        suggestions: ['Wäscheleine spannen', 'Treppenhaus wischen', 'Hof fegen'],
        demo: ['Wäscheleine im Hof spannen', 'Die alte Leine ist gerissen. Neue Leine und Haken liegen im Keller, es fehlt jemand mit Leiter.'],
        rewards: [1, 3, 5, 10],
        reward: 3,
        photo: 'waesche',
        published: 'Deine We-Challenge ist da. Die Gruppe Luxor sieht sie jetzt.',
      },
      scenarios: [
        ['me', 'Me-Challenge', 'Auch in der Gruppe: Vorher, Nachher, fertig. Alle in Luxor sehen Deine gute Tat.', 'Me-Challenge'],
        ['we', 'We-Challenge', 'Aufgaben nur für Eure Gruppe, belohnt mit Edensteinen.', 'We-Challenge'],
        ['rangliste', 'Rangliste', 'Du magst es kompetitiv? Schalte die Rangliste für Eure Gruppe ein oder aus. May the best win!', 'Rangliste'],
      ],
    },
  };

  var M, people, challenges, group, state;
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
      focus: null, // 'rangliste', solange die Rangliste im Blick ist
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
    return M.unit === 'euro' ? n + ' Coins' : n === 1 ? '1 Edenstein' : n + ' Edensteine';
  }

  // ---------- Aufbau ----------
  var hour = new Date().getHours();
  var greeting = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend';
  var clock = new Date().toTimeString().slice(0, 5);

  var screen = $('.p-screen');
  screen.innerHTML =
    '<div class="p-status" aria-hidden="true"><span>' + clock + '</span><span class="p-island"></span><span class="p-battery"></span></div>' +
    '<div class="p-scroll">' +
    '  <div class="p-head"><span class="p-wordmark">' + svg('logo', 22) + '</span></div>' +
    '  <div class="p-greet"><h3>' + greeting + ', Mira</h3><p><span class="p-place"></span> · <span class="p-count"></span></p></div>' +
    '  <div class="p-compose-head"><button type="button" class="p-x" data-close aria-label="Schließen">' + svg('close', 12) + '</button><strong class="p-compose-line"></strong></div>' +
    '  <div class="p-seg" role="tablist" aria-label="Feed">' +
    '    <span class="p-seg-pill" aria-hidden="true"></span>' +
    '    <button role="tab" data-tab="nearby"></button>' +
    '    <button role="tab" data-tab="groups"></button>' +
    '  </div>' +
    '  <div class="p-content"></div>' +
    '</div>' +
    '<button class="p-camera" type="button" aria-label="Neu stellen">' + svg('cameraDark', 15) + '</button>' +
    '<nav class="p-tabbar" aria-label="App-Leiste">' +
    '  <button type="button" data-bar="feed" aria-label="Feed">' + svg('pin', 18) + '</button>' +
    '  <button type="button" data-bar="pleasure" aria-label="Was Du so machst">' + svg('crown', 22) + '</button>' +
    '  <button type="button" data-bar="menu" aria-label="Menü">' + svg('burger', 16) + '</button>' +
    '</nav>' +
    '<div class="p-scrim" hidden></div>' +
    '<section class="p-sheet" role="dialog" aria-modal="true" aria-label="Details" aria-hidden="true" tabindex="-1"></section>' +
    '<section class="p-create" role="dialog" aria-modal="true" aria-label="Neu stellen" aria-hidden="true" tabindex="-1"></section>' +
    '<div class="p-nudge" aria-live="polite"><span class="p-nudge-cat"></span><p></p></div>' +
    '<div class="p-burst" aria-hidden="true"></div>';

  var scroll = $('.p-scroll');
  var content = $('.p-content');
  var sheet = $('.p-sheet');
  var create = $('.p-create');
  var scrim = $('.p-scrim');
  var seg = $('.p-seg');

  // ---------- Bilder: Foto, wenn vorhanden, sonst Zeichnung ----------
  function image(key) {
    if (KC.fotos && KC.fotos.indexOf(key) >= 0) return '<img src="prototyp/fotos/' + key + '.jpg" alt="" decoding="async">';
    return KC.art[key] || '';
  }
  function avatar(id, size) {
    var p = people[id];
    return '<span class="p-avatar" style="--c:' + p.color + ';--s:' + (size || 18) + 'px" aria-hidden="true">' + p.short.charAt(0) + '</span>';
  }
  function statusChip(id) {
    var s = state.status[id];
    if (!s) return '';
    var t = { accepted: 'Angenommen', reported: 'Erledigt gemeldet', confirmed: 'Bestätigt' }[s];
    return '<span class="p-chip p-chip-' + s + '">' + t + '</span>';
  }

  // ---------- Feed ----------
  // Wann gepostet, für „Wer hat gepostet“ nach dem ersten Tippen
  var AGO = ['vor 2 Std.', 'vor 5 Std.', 'gestern', 'vor 3 Tagen'];
  function ago(c) {
    var i = challenges.indexOf(c);
    return c.author === 'du' ? 'gerade eben' : AGO[i % AGO.length];
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
      '<button type="button" class="p-like' + (liked ? ' is-on' : '') + '" data-like="' + c.id + '" aria-pressed="' + liked + '" aria-label="Gefällt mir">' +
      '<span class="p-heart">' + svg(liked ? 'heartOn' : 'heart', 17) + '</span><span>' + (c.likes + (liked ? 1 : 0)) + '</span></button>' +
      '<button type="button" ' + (c.kind === 'me' ? 'data-soon="Kommentare"' : 'data-open="' + c.id + '"') + ' aria-label="Kommentare">' + svg('comment', 17) + '<span>' + c.comments + '</span></button>' +
      '<button type="button" data-soon="Teilen" aria-label="Teilen">' + svg('send', 17) + '</button>' +
      (c.author === 'du' ? '<button type="button" class="p-manage" data-soon="Verwalten" aria-label="Verwalten">' + svg('gear', 20) + '</button>' : '') +
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
      '<button type="button" class="p-half p-before" data-pair="before" aria-label="Vorher-Foto vergrößern">' + image(c.before) + '<span class="p-tag">Vorher</span></button>' +
      '<button type="button" class="p-half p-after" data-pair="after" aria-label="Nachher-Foto vergrößern">' + image(c.after) + '<span class="p-tag">Nachher</span></button>' +
      '<span class="p-took">' + svg('clock', 10) + esc(c.took) + '</span>' +
      '<span class="p-info"><strong>' + esc(c.title) + '</strong><span class="p-meta">' +
      esc(people[c.author].name) + ' · Me-Challenge · ' + ago(c) + '</span></span>' +
      '</div>' +
      actions(c, liked) +
      '</article>'
    );
  }

  function card(c, isNew) {
    if (c.kind === 'me') return meCard(c, isNew);
    var liked = !!state.liked[c.id];
    return (
      '<article class="p-post' + (isNew ? ' p-new' : '') + '" data-id="' + c.id + '">' +
      '<button type="button" class="p-card' + (c.img ? '' : ' p-card-text') + '" data-open="' + c.id + '" aria-label="' + esc(c.title) + ' öffnen">' +
      (c.img ? '<span class="p-img">' + image(c.img) + '</span>' : '') +
      '<span class="p-bounty' + (M.unit === 'euro' ? '' : ' p-bounty-eden') + '">' + bountyOf(c) + '</span>' +
      '<span class="p-who">' + avatar(c.author, 28) + '<span><b>' + esc(people[c.author].name) + '</b><i>' + ago(c) + '</i></span></span>' +
      (statusChip(c.id) || '<span class="p-chip p-chip-deadline">' + svg('clock', 10) + esc(cap(c.left)) + '</span>') +
      '<span class="p-info"><strong>' + esc(c.title) + '</strong><span class="p-meta">' +
      esc(people[c.author].name) + ' · ' + esc(c.dist) + '</span></span>' +
      '</button>' +
      actions(c, liked) +
      '</article>'
    );
  }

  // Eigene Me-Challenge, deren Timer läuft: oben im Feed wie in der App, Tippen führt zurück zum Timer
  function running() {
    var d = state.draft;
    if (d.kind !== 'me' || d.stage === 'vorher') return '';
    return '<div class="p-post"><button type="button" class="p-running" data-me-open><span class="p-thumb">' + image(ME.before) + '</span>' +
      '<span><strong>Du hast Dich selbst herausgefordert</strong><i>' + esc(d.title) + (d.stage === 'timer' ? ' · Timer läuft' : ' · Nachher fehlt') +
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
      '<div class="p-metrics"><div><b>' + done.length + '</b><span>angenommen</span></div><div><b>' + earned +
      '</b><span>' + (M.unit === 'euro' ? 'verdient' : 'gesammelt') + '</span></div><div><b>' + mine.length + '</b><span>gestellt</span></div></div>' +
      (rows
        ? '<ul class="p-rows">' + rows + '</ul>'
        : '<p class="p-empty">Nimm eine We-Challenge an. Hier siehst Du, was Du erledigst und ' + (M.unit === 'euro' ? 'verdienst' : 'sammelst') + '.</p>' +
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
      '<h4 class="p-board-title">Rangliste</h4>' +
      '<ol class="p-board">' + memberRows() + '</ol>' +
      '<h4>Schnell erledigt</h4>' +
      group.tasks
        .map(function (t) {
          return '<div class="p-task' + (t.done ? ' is-done' : '') + '" data-task="' + t.id + '"><div><strong>' + esc(t.title) + '</strong><span>' +
            avatar(t.by) + people[t.by].short + ' · ' + svg('diamond', 13) + ' ' + t.eden + '</span></div>' +
            (t.done
              ? '<span class="p-done">' + svg('checkGreen', 12) + ' Erledigt</span>'
              : '<button type="button" class="p-btn p-btn-small" data-task-do="' + t.id + '">Erledigt</button>') +
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

  // Pille und Schalter links gehören zusammen: Kiez = Kiez, Gruppe Luxor = Gruppe Luxor
  function segKey() {
    if (!state.create && state.tab === 'pleasure') return null;
    return state.mode === 'kiez' ? 'nearby' : 'groups';
  }
  function syncSeg(animate) {
    var composing = state.create;
    screen.classList.toggle('is-composing', composing);
    var kind = state.draft.kind === 'me' ? 'Me-Challenge' : 'We-Challenge';
    $('.p-compose-line').textContent = kind + ' · ' + M.place;
    $$('[data-tab]', seg).forEach(function (b) {
      b.textContent = b.dataset.tab === 'nearby' ? 'Kiez' : 'Gruppe Luxor';
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
    else if (state.mode === 'kiez') renderNearby(opts.newId);
    else renderGroups(opts.newId);
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
  function say(text, mood) {
    $('.p-nudge-cat', nudge).innerHTML = svg(mood === 'high' ? 'catHigh' : 'cat', 30);
    $('p', nudge).textContent = text;
    // Über einem offenen Sheet sitzt der Kater oben, damit er keine Knöpfe verdeckt
    nudge.classList.toggle('is-top', !!(state.detail || state.create));
    nudge.classList.remove('is-on');
    nudge.offsetWidth;
    nudge.classList.add('is-on');
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(function () { nudge.classList.remove('is-on'); }, 3400);
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
    if (c.author === 'du') action = '<button type="button" class="p-btn p-btn-secondary" data-soon="Teilen">We-Challenge teilen</button>';
    else if (!s) action = '<button type="button" class="p-btn" data-step="accept">' + svg('hands', 20) + 'We-Challenge annehmen</button>';
    else if (s === 'accepted') action = '<button type="button" class="p-btn" data-step="report">Erledigt melden</button>';
    else if (s === 'reported') action = '<button type="button" class="p-btn p-btn-wait" disabled>' + who + ' prüft …</button>';
    else action = '<button type="button" class="p-btn p-btn-ok" disabled>' + svg('check', 12) + ' ' + rewardText(c.reward) + ' von ' + who + '</button>';
    sheet.innerHTML =
      '<div class="p-grab" aria-hidden="true"></div>' +
      '<button type="button" class="p-close" data-close aria-label="Schließen">' + svg('close', 12) + '</button>' +
      (c.img ? '<div class="p-hero">' + image(c.img) + '</div>' : '') +
      '<div class="p-sheet-body">' +
      statusChip(c.id) +
      '<h3>' + esc(c.title) + '</h3>' +
      '<p class="p-author">' + avatar(c.author, 22) + esc(people[c.author].name) + '</p>' +
      (c.text ? '<p class="p-text">' + esc(c.text) + '</p>' : '') +
      '<div class="p-metrics p-metrics-row"><div><b class="p-bounty-big">' + rewardBadge(c.reward, 18) + '</b><span>' +
      (M.unit === 'euro' ? 'Coins' : 'Edensteine') + '</span></div>' +
      '<div><b>' + esc(c.left.replace('noch ', '')) + '</b><span>Frist</span></div><div><b>' + esc(c.dist) + '</b><span>' +
      (M.unit === 'euro' ? 'Weg' : 'Wo') + '</span></div></div>' +
      action +
      '</div>';
  }

  function step(kind) {
    var c = find(challenges, state.detail);
    var who = people[c.author].short;
    var mode = state.mode;
    if (kind === 'accept') {
      state.status[c.id] = 'accepted';
      renderDetail();
      say(who + ' weiß Bescheid. Melde Dich, wenn es erledigt ist.');
    } else if (kind === 'report') {
      state.status[c.id] = 'reported';
      renderDetail();
      say('Foto ist dabei. ' + who + ' prüft jetzt.');
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
        say(who + ' hat bestätigt. ' + rewardText(c.reward) + (M.unit === 'euro' ? ' gehen an Dich.' : ' für Dich.'), 'high');
        render();
      }, 1700);
    }
    render();
  }

  // ---------- Neu stellen: Me-Challenge (Vorher, Timer, Nachher) oder We-Challenge ----------
  // Art wählen wie im Erstellen-Blatt der App; nach „Vorher speichern“ steht die Art fest
  function kindSwitch(d) {
    return '<div class="p-choice p-kind" role="radiogroup" aria-label="Art">' +
      [['me', 'Me-Challenge'], ['we', 'We-Challenge']].map(function (k) {
        return '<button type="button" role="radio" aria-checked="' + (d.kind === k[0]) + '" data-kind="' + k[0] + '">' + k[1] + '</button>';
      }).join('') + '</div>';
  }
  function sugg(list) {
    return '<div class="p-sugg">' + list.map(function (s) { return '<button type="button" class="p-pill" data-sugg="' + esc(s) + '">' + esc(s) + '</button>'; }).join('') + '</div>';
  }
  function photoBox(has, key, tag, label) {
    return '<div class="p-photo' + (has ? ' has-photo' : '') + '">' +
      '<button type="button" class="p-photo-hit" data-photo aria-label="' + (has ? 'Foto ändern' : 'Foto hinzufügen') + '">' +
      (has ? '<span class="p-img">' + image(key) + '</span>' : '<span class="p-photo-empty">' + svg('camera', 22) + '<span>' + label + '</span></span>') +
      '</button>' + (tag && has ? '<span class="p-tag">' + tag + '</span>' : '');
  }

  function renderCreate() {
    var d = state.draft;
    if (d.kind === 'me') return renderMe();
    var unit = M.unit === 'euro' ? ' €' : '';
    create.innerHTML =
      '<div class="p-create-body">' +
      kindSwitch(d) +
      photoBox(d.photo, M.create.photo, '', 'Foto aufnehmen oder auswählen') +
      '<div class="p-photo-title"><input type="text" maxlength="60" placeholder="Titel eingeben" aria-label="Titel" value="' + esc(d.title) + '" data-title></div>' +
      '</div>' +
      sugg(M.create.suggestions) +
      '<label class="p-field"><span>Beschreibung</span><textarea rows="2" maxlength="500" data-text>' + esc(d.text) + '</textarea></label>' +
      '<div class="p-field"><span>' + (M.unit === 'euro' ? 'Coins' : 'Edensteine') + '</span><div class="p-choice" role="radiogroup" aria-label="Belohnung">' +
      M.create.rewards.map(function (n) { return '<button type="button" role="radio" aria-checked="' + (d.reward === n) + '" data-reward="' + n + '">' + n + unit + '</button>'; }).join('') +
      '</div></div>' +
      '<div class="p-field"><span>Frist</span><div class="p-choice" role="radiogroup" aria-label="Frist">' +
      ['Heute', '3 Tage', '1 Woche'].map(function (n) { return '<button type="button" role="radio" aria-checked="' + (d.deadline === n) + '" data-deadline="' + n + '">' + n + '</button>'; }).join('') +
      '</div></div>' +
      '<button type="button" class="p-btn" data-publish' + (d.title.trim() ? '' : ' disabled') + '>Veröffentlichen</button>' +
      '</div>';
    grow($('[data-text]', create));
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

  function renderMe() {
    var d = state.draft;
    var body;
    if (d.stage === 'vorher') {
      body =
        kindSwitch(d) +
        photoBox(d.photo, ME.before, 'Vorher', 'Vorher-Foto aufnehmen') +
        '<div class="p-photo-title"><input type="text" maxlength="60" placeholder="Titel eingeben" aria-label="Titel" value="' + esc(d.title) + '" data-title></div>' +
        '</div>' +
        sugg(ME.suggestions) +
        '<label class="p-field"><span>Erklärung zum Vorher</span><textarea rows="2" maxlength="240" data-text>' + esc(d.text) + '</textarea></label>' +
        '<p class="p-help">Me-Challenges laufen ohne Coins. Du forderst Dich selbst heraus.</p>' +
        '<button type="button" class="p-btn" data-me-save' + (d.photo && d.title.trim() ? '' : ' disabled') + '>Vorher speichern</button>';
    } else if (d.stage === 'timer') {
      var r = 2 * Math.PI * 54;
      var m = minutes(d);
      body =
        '<div class="p-mini"><span class="p-thumb">' + image(ME.before) + '</span><span><strong>' + esc(d.title) + '</strong>' +
        '<i>Vorher gespeichert um ' + clockOf(d.start) + ' Uhr</i></span></div>' +
        '<div class="p-timer"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="p-timer-track"/>' +
        '<circle cx="60" cy="60" r="54" class="p-timer-bar" data-ring stroke-dasharray="' + r + '" stroke-dashoffset="' + r * (1 - m / MAX_MIN) + '"/></svg>' +
        '<div><b data-timer>' + took(m) + '</b><span>von 48 h</span></div></div>' +
        '<p class="p-help">Der Timer läuft auch im Hintergrund. Nach 48 h postet die App den Beitrag, auch ohne Nachher-Foto.</p>' +
        '<button type="button" class="p-btn" data-me-after>' + svg('cameraDark', 14) + 'Nachher aufnehmen</button>';
    } else {
      body =
        photoBox(d.after, ME.after, 'Nachher', 'Nachher-Foto aufnehmen') + '</div>' +
        '<p class="p-help">So sieht es jetzt aus. Die Überschrift „' + esc(d.title) + '“ gilt für Vorher und Nachher.</p>' +
        '<label class="p-field"><span>Erklärung zum Nachher</span><textarea rows="2" maxlength="240" data-after-text>' + esc(d.afterText) + '</textarea></label>' +
        '<button type="button" class="p-btn" data-me-post' + (d.after ? '' : ' disabled') + '>Me-Challenge posten</button>';
    }
    create.innerHTML = '<div class="p-create-body p-me-' + d.stage + '">' + body + '</div>';
    grow($('textarea', create));
    if (d.stage === 'timer' && !timerIv) timerIv = setInterval(tickTimer, 100);
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
    say('Vorher ist gespeichert. Leg los!');
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
      author: 'du', before: ME.before, after: ME.after, took: d.took, comments: 0, likes: 0,
    });
    finishCreate(id);
    // Coin-Animation kommt später (Übergabe: Coin-Animation bei der Me-Challenge)
    say(ME.done, 'high');
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
    d.kind = kind;
    d.photo = false;
    renderCreate();
    syncSeg(false);
    syncScenario();
    $('[data-kind="' + kind + '"]', create).focus({ preventScroll: true });
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
      queue = [[$('[data-after-text]', create), 'afterText', ME.demoAfter]];
      button = '[data-me-post]';
    } else if (d.stage === 'vorher' && !d.title.trim()) {
      var demo = d.kind === 'me' ? ME.demo : M.create.demo;
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
        if (!reduce) { btn.classList.remove('p-ready'); btn.offsetWidth; btn.classList.add('p-ready'); }
        return;
      }
      i += 1;
      d[job[1]] = job[2].slice(0, i);
      job[0].value = d[job[1]];
      if (job[1] !== 'title') grow(job[0]);
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
  create.addEventListener('keydown', function () { clearTimeout(autoTimer); autoTimer = null; });

  function publish() {
    var d = state.draft;
    state.created += 1;
    var id = 'neu' + state.created;
    challenges.unshift({
      id: id,
      kind: 'we',
      title: d.title.trim(),
      text: d.text.trim(),
      author: 'du',
      reward: d.reward,
      dist: M.unit === 'euro' ? 'hier' : 'im Haus',
      left: d.deadline === 'Heute' ? 'heute' : 'noch ' + d.deadline,
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
    $$('li', board).forEach(function (li) { before[li.dataset.member] = li.getBoundingClientRect().top; });
    var rankBefore = group.members.slice().sort(function (a, b) { return b.score - a.score; });
    t.done = true;
    var me = find(group.members, 'du');
    var from = me.score;
    me.score += t.eden;
    renderGroups();
    var nb = $('.p-board');
    // FLIP: alte Lage zuerst, dann mit „Schranke“ an den neuen Platz
    $$('li', nb).forEach(function (li) {
      var dy = before[li.dataset.member] - li.getBoundingClientRect().top;
      if (!dy || reduce) return;
      li.style.transition = 'none';
      li.style.transform = 'translateY(' + dy + 'px)';
      li.offsetWidth;
      li.style.transition = '';
      li.style.transform = '';
    });
    var scoreEl = $('[data-member="du"] .p-score', nb);
    if (!reduce) {
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
    var text = rewardText(t.eden) + ' für Dich.';
    var mood = 'default';
    if (posAfter === 0 && posBefore !== 0) { text = rewardText(t.eden) + '. Du führst!'; mood = 'high'; }
    else if (posAfter < posBefore) { text = rewardText(t.eden) + '. Du überholst ' + people[rankBefore[posAfter].id].short + '.'; mood = 'high'; }
    say(text, mood);
  }

  // ---------- Ereignisse ----------
  var whoTimer;
  root.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || !root.contains(t)) return;
    var d = t.dataset;
    if (d.tab) {
      var target = d.tab === 'nearby' ? 'kiez' : 'gruppe';
      if (target !== state.mode) return switchMode(target);
      return setTab('nearby');
    }
    if (d.tabGo) return setTab(d.tabGo);
    if (d.bar) {
      if (d.bar === 'menu') return say('Konto und Einstellungen gibt es in der App.');
      closeAll();
      return setTab(d.bar === 'pleasure' ? 'pleasure' : 'nearby');
    }
    // Karte: einmal tippen zeigt, wer gepostet hat; nochmal tippen öffnet sie (wie in der App)
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
      // Vorher-Nachher-Karte: Hälfte vergrößern, nochmal tippen stellt zurück
      var pair = t.closest('.p-pair');
      pair.dataset.focus = pair.dataset.focus === 'none' ? d.pair : 'none';
      return;
    }
    if ('meOpen' in d) return openCreate('me');
    if (d.kind) return setKind(d.kind);
    if ('meSave' in d) return meSave();
    if ('meAfter' in d) return meAfter();
    if ('mePost' in d) return mePost();
    if (d.soon) return say(d.soon + ' gibt es in der App.');
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
  });
  create.addEventListener('input', function (e) {
    var dr = state.draft;
    if (e.target.matches('[data-text]')) { dr.text = e.target.value; return grow(e.target); }
    if (e.target.matches('[data-after-text]')) { dr.afterText = e.target.value; return grow(e.target); }
    if (!e.target.matches('[data-title]')) return;
    dr.title = e.target.value;
    var btn = $('[data-publish], [data-me-save]', create);
    btn.disabled = !dr.title.trim() || (dr.kind === 'me' && !dr.photo);
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
  var pickText = document.getElementById('szenario-text');
  function first() {
    return M.scenarios[0][0];
  }
  function current() {
    if (state.create) return state.draft.kind;
    if (state.detail) return 'we';
    if (state.focus === 'rangliste') return 'rangliste';
    return first();
  }
  function moveMark(container, active) {
    var mark = container && container.querySelector('.szenario-mark');
    if (!mark || !active) return;
    mark.style.transform = 'translate(' + active.offsetLeft + 'px,' + active.offsetTop + 'px)';
    mark.style.width = active.offsetWidth + 'px';
    mark.style.height = active.offsetHeight + 'px';
  }
  function labelScenarios() {
    if (headline && M.headline) headline.textContent = M.headline;
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
        var on = b.dataset.szenario === cur;
        b.setAttribute('aria-pressed', String(on));
        if (on) active = b;
      });
      moveMark(picker, active);
      // Auf dem Handy stehen nur Kurzformen in der Leiste; der Satz zum gewählten Szenario steht darunter
      if (pickText && active) pickText.textContent = active.querySelector('span').textContent;
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
        if (dr.kind === 'me' && dr.stage === 'vorher' && !dr.photo) return $('.p-photo', create);
        if (dr.kind === 'me' && dr.stage === 'nachher' && !dr.after) return $('.p-photo', create);
        return $('.p-create-body > .p-btn:not(:disabled)', create) || $('.p-photo-title', create);
      }
      if (state.detail) return $('.p-btn:not(:disabled)', sheet);
    }
    // In „Was Du so machst“ kein Ring: Wer gerade die Krone gewählt hat, soll nicht zurückgeschickt werden
    if (state.tab === 'pleasure') return null;
    // Me-Challenge: ein laufender Timer im Feed, sonst die Kamera
    if (name === 'me') return $('[data-me-open]') || $('.p-camera');
    if (name === 'rangliste') return state.mode === 'gruppe' ? $('[data-task-do]') || $('.p-board') : $('.p-seg [data-tab="groups"]');
    return firstOpenCard();
  }
  function updateRing() {
    $$('.p-ring').forEach(function (el) { el.classList.remove('p-ring'); });
    var el = ringTarget(preview || current());
    if (el) el.classList.add('p-ring');
  }

  function go(name) {
    closeAll();
    state.focus = null;
    if (name === 'rangliste' && state.mode !== 'gruppe') switchMode('gruppe');
    if (state.tab !== 'nearby') { state.tab = 'nearby'; render({ animate: true }); }
    if (name === 'me') return openCreate('me');
    if (name === 'we') {
      var open = openWe();
      if (open) openDetail(open.id);
      return syncScenario();
    }
    if (name === 'rangliste') {
      state.focus = 'rangliste';
      var board = $('.p-board-title');
      if (board) scroll.scrollTo({ top: board.offsetTop - 60, behavior: reduce ? 'auto' : 'smooth' });
    }
    syncScenario();
  }
  function switchMode(mode) {
    if (mode === state.mode) return;
    var composing = state.create;
    var draft = state.draft;
    if (!composing) closeAll();
    hush();
    load(mode);
    // Ein angefangener Entwurf zieht mit um, ein laufender Timer läuft weiter
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
    say(mode === 'gruppe' ? 'Du bist jetzt in der Gruppe Luxor.' : 'Du bist jetzt in Connewitz unterwegs.');
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
      var next = state.mode === 'kiez' ? 'gruppe' : 'kiez';
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
