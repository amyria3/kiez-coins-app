// ESLint für Expo (https://docs.expo.dev/guides/using-eslint). Aufruf: npx expo lint
// eslint-config-expo 58 läuft mit ESLint 9; mit ESLint 10 bricht eslint-plugin-react ab (Stand 31.10.2026).
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['dist/*', 'website/*', 'public/*', 'scripts/site/*', 'scripts/prototyp-vorher-nachher/*', 'supabase/functions/*', 'Übergabe/*']),
  expoConfig,
  {
    // Diese Regeln gelten für den React Compiler, den die App nicht nutzt. Sie melden vor allem
    // `useRef(new Animated.Value(…)).current`, das in React Native üblich ist.
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
    },
  },
  {
    // Typografie gebunden (Daria, 2026-11-13): Schriftgröße, Zeilenhöhe und Schrift kommen aus den Rollen in `text`
    // (src/theme/tokens.ts). Erlaubt bleibt die Hervorhebung über `font.*`, etwa fett im Fließtext.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/theme/tokens.ts'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: "Property[key.name=/^(fontSize|lineHeight)$/][value.type='Literal']",
          message: 'Schriftgröße und Zeilenhöhe über eine Rolle aus `text` setzen (src/theme/tokens.ts).',
        },
        {
          selector: "Property[key.name='fontFamily'][value.type='Literal']",
          message: 'Schrift über `text.*` oder `font.*` setzen, nicht als Name.',
        },
      ],
    },
  },
]);
