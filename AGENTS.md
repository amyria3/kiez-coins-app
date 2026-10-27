This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
- Private chats (`public.messages`): never read them with a direct query. If Daria asks you to look into a chat, use `select * from public.chat_einsehen('<id a>', '<id b>', 'Claude', '<reason>');` so the read is logged in `chat_access_log`. Counting or checking structure without `body` is fine (Daria, 2026-10-27).

## Committing

- Claude may commit and push directly to `main` (Daria, 2026-10-23).
- Do not implement a feature that was only discussed and is not yet on `main` without Daria's explicit request (2026-10-23).

## Releases

- Web, iPhone and Android always run the same state (Daria, 2026-10-25). Every change on `main` must reach all platforms.
- Vercel rebuilds the web app on every push to `main`. iPhone testers use the web app until TestFlight exists.
- Android: the EAS workflow `.eas/workflows/android.yml` runs on every push to `main`. Same native fingerprint as an existing APK → it publishes an `expo-updates` update to channel `preview`. Changed fingerprint (native packages, `app.json`, icons, plugins) → it builds a new APK, uploads it to the Supabase bucket `downloads` and sets `download_settings.latest_version_code`. The app then shows `UpdateHint` with a download button.
- After a push with native changes, tell Daria that a new APK is being built and that testers will see the update hint.
- Raise `download_settings.min_version_code` only when older APKs no longer work with the database or the code; tell Daria first.

## UI work

Follow `kiez-coins/design/UX_UI_Regeln.md`, `kiez-coins/design/Icon_Regelwerk.md` and `kiez-coins/design/Designsystem.md` in Documentation. Every icon has exactly one meaning per look, and every meaning has exactly one icon.

## Documentation

- All docs (concept, decisions, app status, structure, database) live only in the private repo [amyria3/Documentation](https://github.com/amyria3/Documentation). Do not add docs to this repo, except to `Übergabe/`.
- Finished tasks and decisions go into Documentation. Unclear points, aborted processes and open tasks go into `Übergabe/` (`YYYY-MM-DD_offen_topic.md`) with everything another account needs to take over: status, next step, open questions for Daria, affected files, SQL script or migration path, code suggestions (Daria, 2026-10-24). Rules in `Übergabe/README.md`.
- No access to Documentation? Put finished results and decisions into `Übergabe/` as well, as described in `Übergabe/README.md`.
- Before you change anything in Documentation, check `Übergabe/` here for new files, move their content into Documentation and delete them here in the same piece of work.
- When you add a migration or a database function in `supabase/migrations`, update the database doc in Documentation (or leave a note in `Übergabe/`). Its daily check fails otherwise.
