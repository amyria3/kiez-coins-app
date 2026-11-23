/**
 * vCard im Browser als Datei speichern (Web-App und app.kiezcoins.de/s/<kurzname>/visitenkarte). iPhone und Android
 * bieten danach „Neuer Kontakt“ an. Die Datei entsteht auf dem Gerät; KiezCoins speichert nichts davon.
 */
export function saveVcard(vcard: string, fileName: string): void {
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
