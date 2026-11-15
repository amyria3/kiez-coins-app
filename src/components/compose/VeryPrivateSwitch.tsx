import { SwitchRow } from '../Form';

/**
 * Schalter „Sehr privat“ (Daria, 15.11.2026): steht dort, wo man den Post einstellt (Titel, Text), beim Erstellen und
 * beim Bearbeiten. An: Niemand kann den Post teilen, und Links zu den Fotos funktionieren nicht mehr.
 * Die Vorschau zeigt dazu die Marke `VeryPrivateBadge` (Badges.tsx). Neue Posts starten aus.
 */
export function VeryPrivateSwitch({ value, onChange }: { value: boolean; onChange: (on: boolean) => void }) {
  return (
    <SwitchRow
      label="Sehr privat"
      description="Niemand kann diesen Post teilen. Schon verschickte Links zu den Fotos funktionieren nicht mehr."
      value={value}
      onValueChange={onChange}
    />
  );
}
