// Seite /betriebe (Daria, 18.11.2026): Wer eine Funktion wählt, sieht im Telefon ihren Ablauf Schritt für Schritt.
// Ein pulsierender lila Ring zeigt, wo man drückt (wie die Tour der App). Ein Tipp darauf führt zum nächsten Schritt.
// Die Schritte stehen je Funktion in <template id="ablauf-<id>"> (gebaut aus scripts/site/betriebe.mjs).
(function () {
  var liste = document.getElementById('b-liste');
  var bild = document.getElementById('b-bild');
  var hinweis = document.getElementById('b-hinweis');
  var zaehler = document.getElementById('b-zaehler');
  var nochmal = document.getElementById('b-nochmal');
  var telefon = document.getElementById('b-telefon');
  if (!liste || !bild) return;
  var texte = JSON.parse(document.getElementById('b-texte').textContent);
  var schritte = [];
  var jetzt = 0;

  function zeigen(i) {
    jetzt = i;
    var s = schritte[i];
    nochmal.hidden = true;
    if (!s) {
      bild.innerHTML = '<div class="b-screen b-bald"><p>' + texte.bald + '</p></div>';
      hinweis.textContent = texte.baldHinweis;
      zaehler.textContent = '';
      return;
    }
    bild.innerHTML = s.innerHTML;
    hinweis.textContent = s.dataset.hinweis;
    zaehler.textContent = texte.schritt.replace('{n}', i + 1).replace('{m}', schritte.length);
    var ziel = s.dataset.ziel && bild.querySelector('[data-tap="' + s.dataset.ziel + '"]');
    if (ziel) {
      ziel.classList.add('p-ring');
      ziel.setAttribute('role', 'button');
      ziel.setAttribute('tabindex', '0');
      ziel.setAttribute('aria-label', s.dataset.hinweis);
    } else {
      nochmal.hidden = false;
    }
  }

  function waehlen(id, scrollen) {
    var knopf = liste.querySelector('[data-funktion="' + id + '"]');
    if (!knopf) return;
    liste.querySelectorAll('[data-funktion]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === knopf)); });
    var vorlage = document.getElementById('ablauf-' + id);
    schritte = vorlage ? Array.prototype.slice.call(vorlage.content.children) : [];
    zeigen(0);
    // Auf dem Telefon steht das Beispiel unter der Liste: dorthin scrollen, wenn es nicht zu sehen ist
    if (scrollen) {
      var r = telefon.getBoundingClientRect();
      if (r.top < 0 || r.top > innerHeight * 0.5) {
        var ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
        telefon.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' });
      }
    }
  }

  liste.addEventListener('click', function (e) {
    var b = e.target.closest('[data-funktion]');
    if (!b) return;
    waehlen(b.dataset.funktion, true);
    if (history.replaceState) history.replaceState(null, '', '#' + b.dataset.funktion);
  });
  function weiter(e) {
    var ziel = e.target.closest('.p-ring');
    if (ziel) { zeigen(jetzt + 1); return; }
    // Daneben getippt: Der Ring blinkt kurz auf, damit klar ist, wohin es geht
    var ring = bild.querySelector('.p-ring');
    if (ring) { ring.classList.remove('b-wink'); void ring.offsetWidth; ring.classList.add('b-wink'); }
  }
  bild.addEventListener('click', weiter);
  bild.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('p-ring')) {
      e.preventDefault();
      zeigen(jetzt + 1);
      // Mit der Tastatur geht es am nächsten Ring weiter, am Ende bei „Noch einmal ansehen“
      (bild.querySelector('.p-ring') || nochmal).focus();
    }
  });
  nochmal.addEventListener('click', function () { zeigen(0); });

  var start = location.hash.slice(1);
  waehlen(liste.querySelector('[data-funktion="' + start + '"]') ? start : liste.querySelector('[data-funktion]').dataset.funktion, false);
})();
