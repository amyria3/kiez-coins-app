import { WEB_APP_URL } from './groups';
import { t } from './texts';

// Freundschaftseinladung per Link, QR-Code oder Code (Migration 20261024000200).
// Der Code hat 7 Zeichen. Gruppencodes haben 6, so verwechselt die App die beiden nicht.

export const FRIEND_CODE_LENGTH = 7;

/** Link, der die Einladung öffnet. Der QR-Code enthält denselben Link. */
export const friendInviteLink = (code: string) => `${WEB_APP_URL}/freunde/einladen?code=${encodeURIComponent(code)}`;

/** Text zum Teilen. Link und Code stehen je auf eigener Zeile wie bei den Gruppen. */
export const friendInviteMessage = (code: string) =>
  [
    t('Ahoi! Lass uns bei KiezCoins befreundet sein. Mit diesem Link bist Du dabei:'),
    friendInviteLink(code),
    '',
    t('Oder gib in der App unter „Freundschaften“ diesen Code ein:'),
    code,
  ].join('\n');

/** Findet einen Freundschaftscode in Link, Nachricht oder Eingabe. null, wenn keiner erkennbar ist. */
export function parseFriendCode(input: string): string | null {
  const fromLink = input.match(/[?&]code=([A-Za-z2-9]{7})\b/);
  if (fromLink) return fromLink[1].toUpperCase();
  const plain = input.replace(/\s+/g, '');
  if (/^[A-Za-z2-9]{7}$/.test(plain)) return plain.toUpperCase();
  const token = input.match(/(?:^|\s)([A-Z2-9]{7})(?=\s|$)/);
  return token ? token[1] : null;
}
