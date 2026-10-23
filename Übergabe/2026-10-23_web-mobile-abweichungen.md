# Abweichungen zwischen Web-Version (PWA) und Mobile-Version (iOS, Android)

- Datum: 2026-10-23
- Gehört nach Documentation: `kiez-coins/APP-STAND.md`, neuer Abschnitt „Web und Mobile“
- Grundlage: Code-Prüfung aller Stellen mit `Platform.OS`, `Platform.select` und plattformabhängigen Expo-Modulen (Stand Commit nach d1dce4f). Die native App lief dabei nicht auf einem Gerät.

## Diese Abweichungen sind gewollt

| Bereich | Web (PWA) | iOS und Android | Stelle |
|---|---|---|---|
| Breite | Die App ist höchstens 480 px breit und steht mittig. | Die App nutzt die volle Bildschirmbreite. | `src/theme/layout.ts` (`WEB_MAX_WIDTH`) |
| Dialoge | Ein eigener Dialog im App-Stil ersetzt `Alert.alert`. | Das System zeigt seinen eigenen Dialog. | `src/components/WebAlert.tsx` |
| Foto hinzufügen | Ohne „Foto entfernen“ öffnet sich gleich die Dateiauswahl. Die Option „Foto aufnehmen“ fehlt. | Ein Menü bietet „Foto aufnehmen“ und „Foto auswählen“. | `src/components/Form.tsx` (`pickPhoto`) |
| Ort finden | OpenStreetMap (Nominatim) wandelt die gerundete Position in eine Adresse um. | Das Gerät wandelt die Position selbst um (`Location.reverseGeocodeAsync`). | `src/data/location.ts` |
| Schreibrichtung (Arabisch, Hebräisch) | Die Richtung wechselt sofort. | Die Richtung wechselt erst nach einem Neustart der App. | `src/data/texts.ts` |
| Unschärfe in der Vorschau | CSS `backdrop-filter` mit SVG-Maske erzeugt die Unschärfe. | `BlurView` aus expo-blur erzeugt die Unschärfe. | `src/app/challenge/create/preview.tsx` |
| Liquid Glass | Den Effekt gibt es im Web nicht. | Nur iOS 26 kann ihn. `GLASS_CONTROLS = false` schaltet ihn gerade überall ab. | `src/components/Glass.tsx` |
| Tastatur | Der Browser schiebt den Inhalt selbst. | Auf iOS schiebt `KeyboardAvoidingView` den Inhalt hoch. Android verlässt sich auf das System. | `Screen.tsx`, `ComposeSheet.tsx`, `chat/[id].tsx` |
| Kommentarfeld einblenden | Das Feld scrollt sofort ins Bild. | Das Feld scrollt erst, wenn die Tastatur steht. | `src/components/Comments.tsx` |
| Mehrzeilige Felder | Das Feld misst seine Höhe selbst und wächst mit. | Das Feld wächst von allein. | `src/components/Form.tsx` |
| Schalter | Der Knopf bleibt im eingeschalteten Zustand weiß, sonst wäre er türkis. | Das System zeichnet den Schalter. | `src/components/Form.tsx` |
| Einblenden von Unterseiten | Die Unterseite gleitet von rechts herein und lässt sich nach rechts wegwischen (eigene Animation). | Der Stack-Navigator animiert. iOS nutzt die Wischgeste vom Rand. | `src/components/Screen.tsx` (`slideIn`) |
| Anmeldung erneuern | Supabase erneuert das Token immer. | Supabase erneuert das Token nur im Vordergrund. | `src/lib/supabase.ts` |

## Diese Abweichungen fallen auf und sind offen

1. **Teilen ohne Teilen-Menü.** Firefox und manche Desktop-Browser kennen `navigator.share` nicht. `Share.share` warf dort einen Fehler, und der Knopf tat nichts. Seit diesem Commit fängt die App den Fehler ab. Der Knopf bleibt dort trotzdem wirkungslos. Vorschlag: Link in die Zwischenablage kopieren und kurz „Link kopiert“ zeigen. Betrifft `ChallengePost.tsx`, `challenge/[id]/index.tsx` und `gruppen/[id]/index.tsx`.
2. **Langes Drücken auf ein Foto in Safari.** iOS-Safari öffnet beim langen Drücken auf ein Bild das eigene Menü („Sichern“, „Teilen“). Das kollidiert mit „lange drücken öffnet den Post“ (`ChallengePost.tsx`, `delayLongPress={350}`). Vorschlag: `-webkit-touch-callout: none` und `user-select: none` auf dem Foto im Web.
3. **Modale Seiten.** Auf iOS und Android fahren Bearbeiten, Melden und Ablehnen von unten herein (`presentation: 'modal'`). Im Web erscheinen sie wie normale Seiten ohne Bewegung von unten.
4. **Push-Nachrichten.** Die PWA kann keine Push-Nachrichten empfangen. Die native App kann es auch noch nicht, da expo-notifications fehlt. Der Schalter in `onboarding/push` speichert nur den Wunsch.
5. **Kamera-Pill im Feed.** Die Pill zeigt eine Kamera. Im Web öffnet sie nur die Dateiauswahl, da die Option „Foto aufnehmen“ fehlt. Auf iPhone-Safari bietet die Dateiauswahl die Kamera trotzdem an.
6. **App-Icon auf dem Home-Bildschirm.** iOS hält das alte Touch-Icon im Speicher. Ein neues Icon erscheint erst, nachdem die Verknüpfung gelöscht und neu angelegt wurde.

## Diese Bereiche verhalten sich gleich

Feed, Edensteine (LivingCrystal), Kater-Animation, Chats mit Echtzeit, Gruppen, Freundschaften, Texte-Editor und Moderation laufen auf allen Plattformen mit demselben Code und ohne Plattformweiche.

## So prüft eine Sitzung das nächste Mal

`grep -rn "Platform\.\(OS\|select\)" src` listet alle Weichen. Jede neue Weiche braucht eine Zeile in der ersten Tabelle.
