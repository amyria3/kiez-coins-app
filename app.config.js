// Ergänzt app.json. Die Web-App liegt unter kiezcoins.de/app/. Den Pfad setzt `npm run build:website`
// über EXPO_WEB_BASE_URL, nur für den Web-Build. So bleiben Expo Go und die Android-App unberührt.
// Derselbe Pfad steht in public/index.html und public/manifest.json.
//
// Web-App in einem Stück (12.11.2026): Expo Router teilt den Web-Build sonst in eine Datei pro Screen, die erst
// beim ersten Öffnen nachlädt. Nach jedem Deploy gibt es die Dateien der alten Version nicht mehr (404). Eine offene
// App stürzte dann beim ersten Öffnen eines neuen Screens ab und lud sich neu (ErrorScreen, „Neue Version wird
// geladen“), für Nutzer:innen ein zufälliges Neuladen. Ohne Nachladen läuft die alte Version einfach weiter.
// Nur im Web-Build gesetzt, damit sich der Fingerabdruck der Android-App nicht ändert (sonst neue APK).
//
// Sitemap aus (25.11.2026): Expo Router hängt sonst die Seite `/_sitemap` an, die jede Route der App auflistet,
// auch Moderation und Werkzeuge. Geschützt sind die Daten über Row Level Security, nicht über versteckte Pfade.
// Die Liste hilft Fremden trotzdem beim Suchen und gehört nicht in die öffentliche Web-App. Abgeschaltet in
// beiden Web-Builds: kiezcoins.de/app (EXPO_WEB_BASE_URL) und app.kiezcoins.de (KIEZ_WEB_APP_BUILD aus
// scripts/build-web-app.mjs). Im Dev-Server (`expo start`) bleibt sie da. Die Android-App bleibt unberührt
// (Fingerabdruck).
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_WEB_BASE_URL;
  const webBuild = Boolean(baseUrl) || process.env.KIEZ_WEB_APP_BUILD === '1';
  if (!webBuild) return config;
  const plugins = (config.plugins ?? []).map((plugin) => {
    const [name, props] = Array.isArray(plugin) ? plugin : [plugin, undefined];
    if (name !== 'expo-router') return plugin;
    return [name, { ...props, sitemap: false, ...(baseUrl ? { asyncRoutes: { web: false } } : {}) }];
  });
  if (!baseUrl) return { ...config, plugins };
  return { ...config, plugins, experiments: { ...config.experiments, baseUrl } };
};
