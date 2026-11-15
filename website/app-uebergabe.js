// Umzug der Web-App von kiezcoins.de/app nach app.kiezcoins.de (Daria, 15.11.2026).
// Die alte Web-App hat Anmeldung und Einstellungen im Browser-Speicher von kiezcoins.de abgelegt. app.kiezcoins.de
// bettet diese Seite unsichtbar ein (public/start.js). Die Seite schickt den Speicher nur an app.kiezcoins.de.
// Hat die App alles übernommen, löscht die Seite die Daten hier. So liegt die Anmeldung nicht mehr unter kiezcoins.de.
(function () {
  var APP = 'https://app.kiezcoins.de';
  // Gehört der Website und bleibt hier
  var WEBSITE = { kc_website_sprache: true };
  if (window.parent === window) return;
  var daten = {};
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      daten[k] = localStorage.getItem(k);
    }
  } catch (e) {}
  window.addEventListener('message', function (e) {
    if (e.origin !== APP || e.source !== window.parent || !e.data || e.data.typ !== 'kiezcoins-uebergabe-fertig') return;
    try {
      Object.keys(daten).forEach(function (k) {
        if (!WEBSITE[k]) localStorage.removeItem(k);
      });
    } catch (err) {}
    window.parent.postMessage({ typ: 'kiezcoins-uebergabe-geloescht' }, APP);
  });
  window.parent.postMessage({ typ: 'kiezcoins-uebergabe', daten: daten }, APP);
})();
