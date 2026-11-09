import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Avatar } from './AuthorRow';
import { Text } from './T';
import { financeLinkCode, loadFinanceStand, type FinanceStand } from '../data/remote';
import { useStore } from '../data/store';
import { t } from '../data/texts';
import type { User } from '../data/types';
import { color, font, isFashionable, radius, space, text } from '../theme/tokens';

/**
 * „Modell KiezCoins“ unten auf „Me“ (Daria, 08.11.2026; Überschrift seit 2026-11-09, vorher „So finanziert sich KiezCoins“): knapper Text, Balken 30/70 und die Community
 * als Punkte, der eigene als Avatar. Bleibt in der App; nur „Details auf der Website“ öffnet kiezcoins…/finanzierung.
 * Ersetzt die Karte „Finanzierung“ unter „Dein Konto“.
 */

// Knopf aus Darias Icon „Switch“, auf -1 … 1 normiert (wie website/finanzierung.html)
const KNOPF =
  'M -.708 -.591 L -.669 -.623 L -.666 -.625 C -.608 -.671 -.607 -.672 -.553 -.723 C -.534 -.737 -.457 -.794 -.291 -.861 C -.159 -.901 -.154 -.902 .057 -.934 L .082 -.937 L .082 -.937 C .111 -.939 .248 -.945 .404 -.897 C .414 -.894 .425 -.891 .435 -.886 C .446 -.883 .458 -.879 .468 -.874 C .481 -.869 .493 -.864 .505 -.858 C .509 -.856 .514 -.854 .518 -.853 C .542 -.843 .573 -.833 .664 -.757 C .815 -.633 .820 -.625 .871 -.549 L .879 -.537 L .907 -.498 L .913 -.485 C .940 -.434 .943 -.430 .965 -.368 L .986 -.295 C .987 -.288 1.000 -.068 .999 -.055 C .998 -.031 .997 -.012 .996 .003 C .994 .057 .994 .075 .971 .154 C .945 .245 .934 .266 .906 .318 L .906 .318 C .897 .336 .885 .358 .871 .386 C .804 .494 .770 .521 .731 .552 C .713 .567 .693 .583 .667 .609 C .612 .665 .585 .681 .550 .703 C .527 .717 .501 .733 .460 .764 C .378 .828 .356 .832 .317 .839 C .307 .841 .295 .843 .282 .847 C .045 .935 -.088 .945 -.324 .918 C -.385 .904 -.427 .897 -.460 .892 C -.529 .881 -.559 .876 -.636 .830 C -.655 .819 -.670 .812 -.681 .805 L -.681 .805 C -.713 .787 -.727 .780 -.774 .744 C -.815 .711 -.828 .693 -.835 .682 C -.838 .678 -.840 .675 -.842 .672 L -.843 .672 C -.848 .662 -.874 .620 -.900 .580 C -.996 .360 -1.000 .349 -.984 .061 C -.978 .022 -.975 -.005 -.972 -.025 C -.966 -.070 -.964 -.080 -.955 -.116 C -.953 -.127 -.949 -.138 -.945 -.149 C -.938 -.172 -.928 -.199 -.920 -.252 C -.912 -.302 -.905 -.316 -.892 -.342 C -.885 -.353 -.878 -.368 -.868 -.389 C -.858 -.411 -.852 -.428 -.847 -.443 C -.833 -.484 -.826 -.501 -.766 -.542 C -.759 -.548 -.756 -.550 -.739 -.565 L -.708 -.591 Z';

// Farben wie auf kiezcoins…/finanzierung, kein Grau (Daria, 08.11.2026): Aktive blasses Lila, nur Angemeldete gedecktes Grün
const PUNKT_AKTIV = '#C4C5FA';
const PUNKT_INAKTIV = isFashionable ? '#CFE2C6' : '#547E49';

/** Höchstens so viele Punkte; darüber steht ein Punkt für mehrere Personen */
const MAX_PUNKTE = 600;
const GOLD = Math.PI * (3 - Math.sqrt(5));
const zufall = (n: number) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// Website: auf dem Web dieselbe Adresse wie die App, sonst die Vercel-Adresse (kiezcoins.de zeigt noch nicht auf Vercel)
const siteUrl = () =>
  (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'https://kiezcoins.vercel.app') + '/finanzierung';

export function FinanceOverview() {
  const { mode, users, currentUserId } = useStore();
  const me = users.find((u) => u.id === currentUserId);
  const [stand, setStand] = useState<FinanceStand | null>(null);
  const [fehler, setFehler] = useState(false);
  const [breite, setBreite] = useState(0);

  useEffect(() => {
    let aktiv = true;
    // Ohne Konto (Demo) nur die Zahlen, angemeldet mit eigenem Punkt
    loadFinanceStand(mode === 'live').then(
      (s) => aktiv && (s ? setStand(s) : setFehler(true)),
      () => aktiv && setFehler(true),
    );
    return () => {
      aktiv = false;
    };
  }, [mode]);

  const openDetails = async () => {
    const code = mode === 'live' ? await financeLinkCode() : null;
    // Mit Avatar und Initialen, damit die Seite den eigenen Punkt als Avatar zeigt (Daria, 08.11.2026)
    const bild = me?.avatar && typeof me.avatar === 'object' && 'uri' in me.avatar ? me.avatar.uri : '';
    const kurz = (me?.name ?? '').split(/[\s*]+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('');
    const url = siteUrl() + (code ? `#ich=${code}${bild ? `&bild=${encodeURIComponent(bild)}` : ''}${kurz ? `&kurz=${encodeURIComponent(kurz)}` : ''}` : '');
    if (Platform.OS === 'web') window.location.assign(url);
    else Linking.openURL(url).catch(() => {});
  };

  const aktiv = stand?.aktiv ?? 0;
  const inaktiv = Math.max(0, (stand?.registriert ?? 0) - aktiv);

  return (
    <View style={styles.box}>
      <Text style={styles.title} accessibilityRole="header">
        Modell KiezCoins
      </Text>
      {/* Klarstellen, dass es noch keine Einnahmen gibt (Daria, 2026-11-09) */}
      <Text style={styles.body}>Noch verdient KiezCoins kein Geld. Sobald Einnahmen kommen, decken sie zuerst die Fixkosten. Vom Rest bekommt die Entwicklerin 30 %, die Community 70 %.</Text>

      <View style={styles.bar} accessible accessibilityLabel={t('Entwicklerin 30 %, Community 70 %')}>
        <View style={[styles.barPart, styles.barDev]} />
        <View style={[styles.barPart, styles.barCommunity]} />
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>Entwicklerin 30 %</Text>
        <Text style={styles.legendText}>Community 70 %</Text>
      </View>

      <View onLayout={(e) => setBreite(e.nativeEvent.layout.width)}>
        {stand && breite > 0 ? <Punkte breite={breite} aktiv={aktiv} inaktiv={inaktiv} stand={stand} me={me} /> : null}
      </View>
      {stand ? (
        <Text style={styles.caption}>
          {t('{aktiv} aktiv, {inaktiv} nur angemeldet', { aktiv, inaktiv })}
          {' · '}
          {proPunkt(aktiv + inaktiv) === 1 ? t('1 Punkt = 1 Person') : t('1 Punkt = {n} Personen', { n: proPunkt(aktiv + inaktiv) })}
        </Text>
      ) : fehler ? (
        <Text style={styles.caption}>Die Zahlen sind gerade nicht erreichbar.</Text>
      ) : null}

      <Pressable accessibilityRole="link" onPress={openDetails} hitSlop={8}>
        <Text style={styles.link}>Details auf der Website</Text>
      </Pressable>
    </View>
  );
}

const proPunkt = (n: number) => Math.max(1, Math.ceil(n / MAX_PUNKTE));

/** Scheibe aus Punkten: innen die Aktiven, außen die nur Angemeldeten; der eigene Punkt ist der eigene Avatar (Daria, 08.11.2026) */
function Punkte({ breite, aktiv, inaktiv, stand, me }: { breite: number; aktiv: number; inaktiv: number; stand: FinanceStand; me?: User }) {
  const teiler = proPunkt(aktiv + inaktiv);
  const nAktiv = Math.ceil(aktiv / teiler);
  const n = nAktiv + Math.ceil(inaktiv / teiler);
  const hoehe = Math.min(breite, 200);
  const punkte = useMemo(() => {
    const R = Math.min(Math.min(breite, hoehe) / 2 - 14, 9 * Math.sqrt(n / Math.PI) + 4);
    const abstand = R * Math.sqrt(Math.PI / Math.max(n, 1));
    const r = abstand * 0.4;
    return Array.from({ length: n }, (_, i) => {
      const rr = R * Math.sqrt((i + 0.5) / n) + (zufall(i * 4 + 1) - 0.5) * abstand * 0.45;
      const a = i * GOLD + (zufall(i * 4 + 2) - 0.5) * (abstand / Math.max(rr, abstand)) * 0.9;
      return {
        x: breite / 2 + rr * Math.cos(a),
        y: hoehe / 2 + rr * Math.sin(a),
        r: r * (0.92 + zufall(i * 4 + 6) * 0.16),
        dreh: zufall(i * 4 + 5) * 360,
        spiegel: zufall(i * 4 + 5) > 0.5 ? -1 : 1,
        aktiv: i < nAktiv,
      };
    });
  }, [breite, hoehe, n, nAktiv]);

  // Eigener Punkt: Rang innerhalb der eigenen Gruppe
  const eigener =
    stand.kategorie && stand.rang != null
      ? (stand.kategorie === 'aktiv' ? 0 : nAktiv) + Math.min(Math.floor(stand.rang / teiler), (stand.kategorie === 'aktiv' ? nAktiv : n - nAktiv) - 1)
      : -1;
  const du = eigener >= 0 ? punkte[eigener] : undefined;
  const duD = du ? Math.round(Math.max(du.r * 6, 26)) : 0;

  return (
    <View style={{ width: breite, height: hoehe }}>
      <Svg width={breite} height={hoehe} accessibilityLabel={t('{aktiv} aktiv, {inaktiv} nur angemeldet', { aktiv, inaktiv })}>
        {punkte.map((p, i) =>
          i === eigener ? null : (
            <Path
              key={i}
              d={KNOPF}
              fill={p.aktiv ? PUNKT_AKTIV : PUNKT_INAKTIV}
              transform={`translate(${p.x} ${p.y}) rotate(${p.dreh}) scale(${p.r * p.spiegel} ${p.r})`}
            />
          ),
        )}
      </Svg>
      {du && me ? (
        <View
          style={[styles.du, { left: du.x - duD / 2 - 2, top: du.y - duD / 2 - 2, borderRadius: duD / 2 + 2 }]}
          accessible
          accessibilityLabel={t('Du')}
        >
          <Avatar user={me} diameter={duD} badge={false} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: space[12], padding: space[16], borderRadius: radius.xl, backgroundColor: color.bg.surface, borderWidth: 1, borderColor: color.line.raised },
  title: { ...text.cardTitle, color: color.text.primary },
  body: { ...text.body, color: color.text.secondary },
  bar: { flexDirection: 'row', height: 10, borderRadius: radius.full, overflow: 'hidden', gap: 2 },
  barPart: { height: '100%' },
  barDev: { flex: 3, backgroundColor: color.text.primary },
  // Community in Lila (Daria, 08.11.2026)
  barCommunity: { flex: 7, backgroundColor: color.accent.primary },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendText: { ...text.caption, color: color.text.secondary },
  caption: { ...text.caption, color: color.text.secondary },
  link: { ...text.body, fontFamily: font.medium, color: color.text.primary, textDecorationLine: 'underline' },
  du: { position: 'absolute', padding: 2, backgroundColor: color.bg.surface },
});
