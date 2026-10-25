# Gruppe beim Erstellen sichtbar

- Datum: 2026-10-25
- Status: offen, To-do von Daria
- Gehört in Documentation: `kiez-coins/konzept/Gruppen.md` und `kiez-coins/app/Offene_Punkte.md`

## To-do (Daria, 25.10.2026)

Erstellt die Person eine Challenge, sieht sie, in welcher Gruppe sie gerade ist.

## Stand

- Das Erstellen-Blatt über dem Feed (`src/components/compose/ComposeSheet.tsx`, `GroupBody`) zeigt im Reiter „Gruppen“ nur den Schalter We-Challenge / Me-Challenge und das Formular. Der Gruppenname fehlt.
- Die Gruppe kommt als `target` aus `src/app/feed.tsx` (gewählte Gruppe im Reiter „Gruppen“).
- Die Route `gruppen/[id]/aufgabe` (aus der Gruppenseite) zeigt den Namen schon als Untertitel: `<SubScreen title="Aufgabe erstellen" subtitle={group?.name}>`.
- Im Reiter „In der Nähe“ (`PublicBody`) fehlt ebenso ein Hinweis, dass der Beitrag öffentlich im Kiez erscheint.

## Offene Fragen an Daria

- Nur anzeigen oder auch im Blatt die Gruppe wechseln können?
- Wo steht der Name: über dem Schalter, als Zeile „In {Gruppenname}“, oder als Chip mit dem Gruppen-Icon?
- Bekommt der Kiez-Reiter dieselbe Zeile („Im Kiez“, „In der Nähe“)?

## Code-Vorschlag

In `GroupBody` die Gruppe aus `useStore().groups` holen und über dem `TypeSwitch` eine Zeile mit `noTranslate` für den Namen zeigen:

```tsx
const { groups } = useStore();
const group = groups.find((g) => g.id === groupId);
// …
<Text style={styles.where}>{t('In {name}', { name: group?.name ?? '' })}</Text>
```

Neue Texte danach mit `node scripts/i18n.mjs --missing` übersetzen (nicht `--prune`, siehe `2026-10-25_offen_konsistenz.md`).
