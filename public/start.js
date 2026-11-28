// Start der Web-App: Safari-Ersatz für requestIdleCallback und Fehleranzeige statt schwarzem Bildschirm.
// Vorher inline in index.html; als eigene Datei, damit die Content-Security-Policy keine Inline-Skripte braucht
// (Sicherheitsprüfung, 2026-11-15).
// Volle Breite für die Digitale Visitenkarte für Gäste, bevor die App lädt (Daria, 2026-11-28). Danach hält
// useWideWeb in src/theme/layout.ts die Klasse; html.kc-breit #root in index.html hebt die 480 px auf.
if (/^\/s\/[^/]+\/visitenkarte\/?$/.test(location.pathname)) document.documentElement.classList.add('kc-breit');
// Safari kennt requestIdleCallback nicht. Expo Router ruft es an einer Stelle ohne Prüfung auf.
// Trigger Deployment
if (!window.requestIdleCallback) {
  window.requestIdleCallback = function (cb) {
    return setTimeout(function () { cb({ didTimeout: false, timeRemaining: function () { return 0; } }); }, 1);
  };
  window.cancelIdleCallback = function (id) { clearTimeout(id); };
}
// Startet die App nicht, zeigt die Seite den Fehler statt eines schwarzen Bildschirms (Daria, 23.10.2026).
(function () {
  var shown = false;
  function show(text) {
    var root = document.getElementById('root');
    if (shown || !root || root.innerText.trim()) return;
    shown = true;
    var box = document.createElement('div');
    box.setAttribute('style', 'position:fixed;inset:0;z-index:99;padding:64px 24px;background:#232326;color:#fff8ed;font:15px/1.4 -apple-system,system-ui,sans-serif;overflow:auto');
    box.innerHTML = '<p style="font-size:22px;font-weight:600;margin:0 0 12px">KiezCoins startet nicht</p>' +
      '<p style="margin:0 0 16px;color:#a7a39d">Schick uns den Fehlerbericht. So finden wir den Fehler schneller.</p>' +
      '<button type="button" data-send style="display:block;margin:0 0 12px;padding:12px 20px;border:0;border-radius:12px;background:#8f90fa;color:#232326;font:600 16px -apple-system,system-ui,sans-serif">Fehlerbericht senden</button>' +
      '<p data-status style="margin:0 0 12px"></p>' +
      '<a href="/?look=kiez" style="display:inline-block;margin:0 0 24px;padding:12px 20px;border-radius:12px;border:1px solid #555;color:#fff8ed;text-decoration:none">Neu laden</a>' +
      '<pre style="white-space:pre-wrap;word-break:break-all;font-size:12px;color:#ff7e8b;margin:0"></pre>';
    var start = window.__kiezStart || 'Skript nicht gestartet';
    box.querySelector('pre').textContent = String(text).slice(0, 1200) + '\n\nStart: ' + start + '\n' + navigator.userAgent;
    // Fehlerbericht an die Tabelle error_reports (Migration 20261025000200). URL und Publishable Key wie in src/lib/supabase.ts.
    var report = {
      message: String(text).split('\n')[0].slice(0, 1000) || 'Startfehler',
      stack: String(text).slice(0, 8000),
      screen: (location.pathname + location.search).slice(0, 300),
      platform: ('web, ' + navigator.userAgent).slice(0, 300),
      look: 'kiez',
      start_info: String(start).slice(0, 300)
    };
    var status = box.querySelector('[data-status]');
    var send = box.querySelector('[data-send]');
    send.addEventListener('click', function () {
      send.disabled = true;
      send.textContent = 'Wird gesendet …';
      fetch('https://aqxzxpxrshizlaqyjplw.supabase.co/rest/v1/error_reports', {
        method: 'POST',
        headers: { apikey: 'sb_publishable_WqrL7Y7Wm0l9cq4tHQpjAQ_iooAaNe0', 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(report)
      }).then(function (res) {
        if (!res.ok) throw new Error(res.status);
        send.remove();
        status.style.color = '#7EE798';
        status.textContent = 'Danke! Der Fehlerbericht ist bei uns angekommen.';
      }).catch(function () {
        send.remove();
        var body = encodeURIComponent(report.stack.slice(0, 1500) + '\n\nStart: ' + report.start_info + '\n' + report.platform);
        status.innerHTML = 'Der Bericht ist nicht angekommen. <a style="color:#8f90fa" href="mailto:kontakt@kiezcoins.de?subject=' + encodeURIComponent('Fehlerbericht KiezCoins') + '&body=' + body + '">Per E-Mail senden</a>';
      });
    });
    document.body.appendChild(box);
    // Startet die App doch noch, verschwindet der Hinweis wieder
    var watch = setInterval(function () {
      if (root.innerText.trim()) { clearInterval(watch); box.remove(); }
    }, 1000);
  }
  window.addEventListener('error', function (e) {
    // Bilder, die nicht laden, sind kein Startproblem. Nur Skripte zählen.
    if (e.target && e.target !== window && e.target.tagName !== 'SCRIPT') return;
    var msg = e.error && e.error.stack ? e.error.stack : (e.message || 'Skript nicht geladen: ' + ((e.target && e.target.src) || '?'));
    setTimeout(function () { show(msg); }, 1500);
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    setTimeout(function () { show(r && r.stack ? r.stack : String(r)); }, 1500);
  });
  // Nach 12 Sekunden immer noch leer: Hinweis ohne Fehlertext
  setTimeout(function () { show('Nach 8 Sekunden ist noch nichts zu sehen.'); }, 8000);
})();
// Umzug von kiezcoins.de/app nach app.kiezcoins.de (Daria, 15.11.2026): Anmeldung und Einstellungen einmalig übernehmen.
// kiezcoins.de/app-uebergabe (website/app-uebergabe.js) schickt den alten Browser-Speicher. Schlüssel, die es hier
// schon gibt, bleiben. Danach löscht die alte Seite ihre Kopie. Kam eine Anmeldung dazu, lädt die App einmal neu.
(function () {
  var ALT = 'https://kiezcoins.de';
  var MERKER = 'kc-umzug';
  if (location.hostname !== 'app.kiezcoins.de') return;
  try {
    if (localStorage.getItem(MERKER)) return;
  } catch (e) {
    return;
  }
  var frame = document.createElement('iframe');
  var anmeldung = false;
  var ende;
  function fertig() {
    clearTimeout(ende);
    window.removeEventListener('message', empfang);
    frame.remove();
    if (anmeldung) location.reload();
  }
  function empfang(e) {
    if (e.origin !== ALT || e.source !== frame.contentWindow || !e.data) return;
    if (e.data.typ === 'kiezcoins-uebergabe-geloescht') return fertig();
    if (e.data.typ !== 'kiezcoins-uebergabe') return;
    var daten = e.data.daten || {};
    try {
      Object.keys(daten).forEach(function (k) {
        if (typeof daten[k] !== 'string' || localStorage.getItem(k) !== null) return;
        localStorage.setItem(k, daten[k]);
        if (/^sb-.+-auth-token$/.test(k)) anmeldung = true;
      });
      localStorage.setItem(MERKER, new Date().toISOString());
    } catch (err) {
      return fertig();
    }
    frame.contentWindow.postMessage({ typ: 'kiezcoins-uebergabe-fertig' }, ALT);
    ende = setTimeout(fertig, 2000);
  }
  window.addEventListener('message', empfang);
  frame.hidden = true;
  frame.setAttribute('aria-hidden', 'true');
  frame.src = ALT + '/app-uebergabe';
  document.documentElement.appendChild(frame);
  // Antwortet die alte Seite nicht (offline, gesperrt), startet die App ohne Übernahme und versucht es beim nächsten Mal.
  ende = setTimeout(fertig, 5000);
})();

// Digitale Visitenkarte (app.kiezcoins.de/s/<kurzname>/visitenkarte, Daria, 2026-11-23): Die Daten kommen schon,
// während die App startet. src/data/showcase.ts (loadPublicShowcase) nimmt sie, statt erneut zu fragen.
(function () {
  var m = location.pathname.match(/^\/s\/([a-z0-9][a-z0-9-]{2,39})\/visitenkarte\/?$/);
  if (!m || !window.fetch) return;
  var key = 'sb_publishable_WqrL7Y7Wm0l9cq4tHQpjAQ_iooAaNe0';
  window.__kiezCard = {
    slug: m[1],
    data: fetch('https://aqxzxpxrshizlaqyjplw.supabase.co/rest/v1/rpc/public_showcase', {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_slug: m[1] }),
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; }),
  };
})();
