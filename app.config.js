// Ergänzt app.json. Die Web-App liegt unter kiezcoins.de/app/. Den Pfad setzt `npm run build:website`
// über EXPO_WEB_BASE_URL, nur für den Web-Build. So bleiben Expo Go und die Android-App unberührt.
// Derselbe Pfad steht in public/index.html und public/manifest.json.
//
// Web-App in einem Stück (12.11.2026): Expo Router teilt den Web-Build sonst in eine Datei pro Screen, die erst
// beim ersten Öffnen nachlädt. Nach jedem Deploy gibt es die Dateien der alten Version nicht mehr (404). Eine offene
// App stürzte dann beim ersten Öffnen eines neuen Screens ab und lud sich neu (ErrorScreen, „Neue Version wird
// geladen“), für Nutzer:innen ein zufälliges Neuladen. Ohne Nachladen läuft die alte Version einfach weiter.
// Nur im Web-Build gesetzt, damit sich der Fingerabdruck der Android-App nicht ändert (sonst neue APK).
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_WEB_BASE_URL;
  if (!baseUrl) return config;
  const plugins = (config.plugins ?? []).map((plugin) => {
    const [name, props] = Array.isArray(plugin) ? plugin : [plugin, undefined];
    return name === 'expo-router' ? [name, { ...props, asyncRoutes: { web: false } }] : plugin;
  });
  return { ...config, plugins, experiments: { ...config.experiments, baseUrl } };
};
