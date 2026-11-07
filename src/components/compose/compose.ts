import { useState } from 'react';

import type { ExtraPhoto, ImageSource, PhotoText } from '../../data/types';

/**
 * Erstellen über dem Feed (Daria, 22.10.2026): Der Feed-Kopf wird schmal, die Pille bleibt, das Blatt kommt von unten.
 * Nach dem Veröffentlichen schließt sich das Blatt, sobald der Feed wieder vorn ist.
 */
let done = false;
export const markComposeDone = () => {
  done = true;
};
/** true genau einmal nach einem Veröffentlichen */
export const takeComposeDone = () => {
  const was = done;
  done = false;
  return was;
};

/**
 * Foto, Titel und Text, die alle Formulare im Erstellen-Blatt teilen (Daria, 25.10.2026):
 * Wer zwischen „Im Kiez“ und „Gruppen“ oder zwischen den Beitragstypen wechselt, behält die Eingaben.
 * Edensteine und Frist bleiben im jeweiligen Formular.
 */
export type ComposeContent = {
  photo?: ImageSource;
  setPhoto: (photo?: ImageSource) => void;
  title: string;
  setTitle: (title: string) => void;
  text: string;
  setText: (text: string) => void;
  /**
   * Nur im Erstellen-Blatt über dem Feed (`useComposeSheetContent`): Blätter, Schrift, Zusatzfotos und Text auf dem Foto
   * überstehen auch den Wechsel zwischen Privat, Kiez, Überall und Gruppen (Daria, 07.11.2026).
   * Fehlt ein Feld, hält das Formular es selbst.
   */
  pages?: string[];
  setPages?: (pages: string[]) => void;
  sheetFont?: string;
  setSheetFont?: (font: string) => void;
  extras?: ExtraPhoto[];
  setExtras?: (update: (all: ExtraPhoto[]) => ExtraPhoto[]) => void;
  photoText?: PhotoText;
  setPhotoText?: (photoText?: PhotoText) => void;
};

export function useComposeContent(initial: { photo?: ImageSource; title?: string; text?: string } = {}): ComposeContent {
  const [photo, setPhoto] = useState<ImageSource | undefined>(initial.photo);
  const [title, setTitle] = useState(initial.title ?? '');
  const [text, setText] = useState(initial.text ?? '');
  return { photo, setPhoto, title, setTitle, text, setText };
}

/** Wie `useComposeContent`, dazu Blätter, Schrift, Zusatzfotos und Text auf dem Foto: alles, was das Blatt über dem Feed teilt. */
export function useComposeSheetContent(): ComposeContent {
  const base = useComposeContent();
  const [pages, setPages] = useState<string[]>(['']);
  const [sheetFont, setSheetFont] = useState('inter');
  const [extras, setExtras] = useState<ExtraPhoto[]>([]);
  const [photoText, setPhotoText] = useState<PhotoText | undefined>();
  return { ...base, pages, setPages, sheetFont, setSheetFont, extras, setExtras, photoText, setPhotoText };
}
