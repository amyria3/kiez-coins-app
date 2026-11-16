/** Felder eines Treffers von Photon (OpenStreetMap), siehe placeSearch.ts */
export type PlaceProps = {
  name?: string;
  street?: string;
  housenumber?: string;
  district?: string;
  locality?: string;
  city?: string;
  postcode?: string;
  state?: string;
};

/**
 * Text für den Ort: Name, Straße mit Hausnummer, Ortsteil (nur ohne Straße), Postleitzahl und Stadt.
 * „Richard-Wagner-Hain, Zentrum-West, Leipzig“ oder „Auentee, Engelsdorfer Straße 156, 04316 Leipzig“
 */
export function placeLabel(p: PlaceProps): string {
  const street = [p.street, p.housenumber].filter(Boolean).join(' ');
  const city = [p.postcode, p.city ?? p.locality].filter(Boolean).join(' ');
  const seen = new Set<string>();
  return [p.name, street, street ? undefined : p.district, city || p.state]
    .filter((x): x is string => !!x && !seen.has(x) && !!seen.add(x))
    .join(', ');
}

/**
 * Zusammengesetzte Namen: In OpenStreetMap heißt der „Wagnerhain“ „Richard-Wagner-Hain“, Photon findet ihn nur
 * mit „Wagner Hain“. Endet die Eingabe auf ein typisches Ortswort, sucht die App zusätzlich mit Leerzeichen davor.
 */
const PLACE_WORD = /^(.{3,}?)(hain|park|platz|straße|strasse|weg|garten|see|teich|brücke|markt|allee|ring|ufer|berg|wald|wiese|hof|kirche|halle|haus|bad|tor|turm|bahnhof|schule)$/i;
export function queryVariants(query: string): string[] {
  const q = query.trim();
  const m = /\s/.test(q) ? null : q.match(PLACE_WORD);
  return m ? [q, `${m[1]} ${m[2]}`] : [q];
}
