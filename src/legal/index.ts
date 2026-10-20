import texts from './texts.json';

/**
 * Rechtstexte für App und Download-Seite. Eine Quelle: `texts.json`.
 * Die Download-Seite baut ihre Seiten mit `scripts/build-download-site.mjs` aus derselben Datei.
 */
export type LegalDocKey = keyof typeof texts.documents;

export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDoc = { title: string; updated: string; sections: LegalSection[] };

export const legalDocKeys = Object.keys(texts.documents) as LegalDocKey[];

const fill = (value: string) =>
  value.replace(/\{(\w+)\}/g, (match, key: string) => (texts.operator as Record<string, string>)[key] ?? match);

export function isLegalDocKey(value: unknown): value is LegalDocKey {
  return typeof value === 'string' && value in texts.documents;
}

export function legalDoc(key: LegalDocKey): LegalDoc {
  const doc = texts.documents[key];
  return {
    title: doc.title,
    updated: doc.updated,
    sections: doc.sections.map((s) => ({ heading: s.heading, paragraphs: s.paragraphs.map(fill) })),
  };
}
