# Edensteine für We-Challenges im Kiez, neue Erklärtexte

Datum: 2026-10-27 · Status: Notiz für die Doku · Gehört nach: Documentation, Konzept (Belohnungen, Gruppen) und Datenbank-Doku.

## Entscheidung

Daria, 27.10.2026: Edensteine sind die ideelle Währung, ein Ersatz für Euro. Auch eine We-Challenge im Kiez darf sie als Belohnung haben (Konsistenz mit der Gruppenaufgabe). Eine Kiez-We-Challenge hat entweder eine Bounty in Euro oder 1 bis 10 Edensteine, nie beides.

## Was sich ändert

- Erstellen, Schritt 2 (`challenge/create/step-2`): „Belohnung (optional)“ mit „Keine“, „Coins (€)“ und „Edensteine“. Bei Edensteinen erscheint derselbe Zähler wie bei der Gruppenaufgabe (`src/components/compose/EdensteinStepper.tsx`), Vorgabe 3.
- Vorschau und Bearbeiten (`challenge/create/preview`, `challenge/[id]/edit`) zeigen und ändern die Edensteine. Gruppenaufgaben behalten ihre Edensteine wie bisher.
- Ohne Euro gibt es keinen Zahlungsschritt. `confirm_challenge` setzt den Status schon heute auf `confirmed`, wenn `bounty_amount` leer ist.
- Feed und Detailansicht zeigten Edensteine schon für jede Challenge, die welche hat.
- Erklärtexte im Erstellen-Blatt:
  - Me-Challenge: „Halte fest, wie Du etwas reparierst, umbaust, verschönerst oder eine neue, nützliche Gewohnheit übst. Dokumentiere zuerst mit einem Foto den Stand „vorher“.“
  - We-Challenge im Kiez: „Hier gibt es etwas zu tun! Dokumentiere die Ausgangslage und poste es im Kiez!“ Daneben ein Info-Icon. Ein Tipp darauf zeigt „Deine Nachbar:innen sehen den Post und nehmen die We-Challenge an.“ (`src/components/compose/HintWithInfo.tsx`).

## Datenbank

Migration `supabase/migrations/20261028000200_kiez_edensteine.sql`:

- Regel `challenges_group_reward`: neuer Fall Kiez, `type = 'individual'`, `edensteine` 1 bis 10, `bounty_amount` leer.
- `edit_open_challenge` und `edit_deleted_challenge` haben am Ende den Parameter `p_edensteine` (Vorgabe null). Bei Kiez-Challenges setzt er die Edensteine, bei Gruppenaufgaben bleiben sie unverändert.

## Offen

- Wo zählen Edensteine aus dem Kiez? In Gruppen rechnet die App sie aus den bestätigten Gruppenaufgaben (`src/data/groups.ts`, `leaderboard`). Für den Kiez fehlt noch ein Stand, zum Beispiel im Profil neben „verdient“ (`src/components/FashionProfile.tsx`, `src/app/reise.tsx`).

## Feldnamen (Daria, 27.10.2026)

- We-Challenge und Me-Challenge: Das Textfeld zum Vorher heißt überall „Beschreibung“. Platzhalter bei der Me-Challenge: „Was ist die Aufgabe oder die Ausgangslage? Erkläre, worin die Me-Challenge besteht.“
- Bild (Kiez und Gruppe): Das Textfeld heißt „Dein Text“.
