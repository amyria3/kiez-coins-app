// Ergänzt app.json. Die Web-App liegt unter kiezcoins.de/app/. Den Pfad setzt `npm run build:website`
// über EXPO_WEB_BASE_URL, nur für den Web-Build. So bleiben Expo Go und die Android-App unberührt.
// Derselbe Pfad steht in public/index.html und public/manifest.json.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_WEB_BASE_URL;
  if (!baseUrl) return config;
  return { ...config, experiments: { ...config.experiments, baseUrl } };
};
