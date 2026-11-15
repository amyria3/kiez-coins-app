// kiezcoins.de/app: im Browser sofort weiter nach app.kiezcoins.de (mit ?von=… und #…).
// Als alte Web-App vom Home-Bildschirm gestartet: bleiben und erklären, wie man KiezCoins neu hinzufügt.
(function () {
  var standalone = navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  if (!standalone) {
    location.replace('https://app.kiezcoins.de/' + location.search + location.hash);
    return;
  }
  document.documentElement.className += ' standalone';
})();
