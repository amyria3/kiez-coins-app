import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Avatar } from './AuthorRow';
import { Text } from './T';
import { financeLinkCode, loadFinanceStand, type FinanceStand } from '../data/remote';
import { useStore } from '../data/store';
import { t } from '../data/texts';
import type { User } from '../data/types';
import { color, radius, space, text } from '../theme/tokens';

/**
 * „Modell KiezCoins“ unten auf „Me“ (Daria, 08.11.2026; Überschrift seit 2026-11-09, vorher „So finanziert sich KiezCoins“): knapper Text, Balken 30/70 und die Community
 * als Punkte, der eigene als Avatar. Bleibt in der App; nur „Details auf der Website“ öffnet kiezcoins…/finanzierung.
 * Ersetzt die Karte „Finanzierung“ unter „Dein Konto“.
 */

// Knopf aus Darias Icon „Switch“, auf -1 … 1 normiert (wie website/finanzierung.html)
const BUTTON =
  'M -.708 -.591 L -.669 -.623 L -.666 -.625 C -.608 -.671 -.607 -.672 -.553 -.723 C -.534 -.737 -.457 -.794 -.291 -.861 C -.159 -.901 -.154 -.902 .057 -.934 L .082 -.937 L .082 -.937 C .111 -.939 .248 -.945 .404 -.897 C .414 -.894 .425 -.891 .435 -.886 C .446 -.883 .458 -.879 .468 -.874 C .481 -.869 .493 -.864 .505 -.858 C .509 -.856 .514 -.854 .518 -.853 C .542 -.843 .573 -.833 .664 -.757 C .815 -.633 .820 -.625 .871 -.549 L .879 -.537 L .907 -.498 L .913 -.485 C .940 -.434 .943 -.430 .965 -.368 L .986 -.295 C .987 -.288 1.000 -.068 .999 -.055 C .998 -.031 .997 -.012 .996 .003 C .994 .057 .994 .075 .971 .154 C .945 .245 .934 .266 .906 .318 L .906 .318 C .897 .336 .885 .358 .871 .386 C .804 .494 .770 .521 .731 .552 C .713 .567 .693 .583 .667 .609 C .612 .665 .585 .681 .550 .703 C .527 .717 .501 .733 .460 .764 C .378 .828 .356 .832 .317 .839 C .307 .841 .295 .843 .282 .847 C .045 .935 -.088 .945 -.324 .918 C -.385 .904 -.427 .897 -.460 .892 C -.529 .881 -.559 .876 -.636 .830 C -.655 .819 -.670 .812 -.681 .805 L -.681 .805 C -.713 .787 -.727 .780 -.774 .744 C -.815 .711 -.828 .693 -.835 .682 C -.838 .678 -.840 .675 -.842 .672 L -.843 .672 C -.848 .662 -.874 .620 -.900 .580 C -.996 .360 -1.000 .349 -.984 .061 C -.978 .022 -.975 -.005 -.972 -.025 C -.966 -.070 -.964 -.080 -.955 -.116 C -.953 -.127 -.949 -.138 -.945 -.149 C -.938 -.172 -.928 -.199 -.920 -.252 C -.912 -.302 -.905 -.316 -.892 -.342 C -.885 -.353 -.878 -.368 -.868 -.389 C -.858 -.411 -.852 -.428 -.847 -.443 C -.833 -.484 -.826 -.501 -.766 -.542 C -.759 -.548 -.756 -.550 -.739 -.565 L -.708 -.591 Z';

// Farben wie auf kiezcoins…/finanzierung, kein Grau (Daria, 08.11.2026): Aktive blasses Lila, nur Angemeldete gedecktes Grün
// Aktive im normalen Lila wie auf der Finanzierungsseite (Daria, 2026-11-13)
const DOT_ACTIVE = color.accent.primary;
const DOT_INACTIVE = color.financeDotInactive;

/** Höchstens so viele Punkte; darüber steht ein Punkt für mehrere Personen */
const MAX_DOTS = 600;
const GOLD = Math.PI * (3 - Math.sqrt(5));
const random = (n: number) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// Website: auf dem Web dieselbe Adresse wie die App, sonst die Vercel-Adresse (kiezcoins.de zeigt noch nicht auf Vercel)
const siteUrl = () =>
  'https://kiezcoins.de/finanzierung';

export function FinanceOverview() {
  const { mode, users, currentUserId } = useStore();
  const me = users.find((u) => u.id === currentUserId);
  const [stand, setStand] = useState<FinanceStand | null>(null);
  const [error, setError] = useState(false);
  const [chartWidth, setWidth] = useState(0);

  useEffect(() => {
    let active = true;
    // Ohne Konto (Demo) nur die Zahlen, angemeldet mit eigenem Punkt
    loadFinanceStand(mode === 'live').then(
      (s) => active && (s ? setStand(s) : setError(true)),
      () => active && setError(true),
    );
    return () => {
      active = false;
    };
  }, [mode]);

  const openDetails = async () => {
    const code = mode === 'live' ? await financeLinkCode() : null;
    // Mit Avatar und Initialen, damit die Seite den eigenen Punkt als Avatar zeigt (Daria, 08.11.2026)
    const image = me?.avatar && typeof me.avatar === 'object' && 'uri' in me.avatar ? me.avatar.uri : '';
    const short = (me?.name ?? '').split(/[\s*]+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('');
    const url = siteUrl() + (code ? `#ich=${code}${image ? `&bild=${encodeURIComponent(image)}` : ''}${short ? `&kurz=${encodeURIComponent(short)}` : ''}` : '');
    if (Platform.OS === 'web') window.location.assign(url);
    else Linking.openURL(url).catch(() => {});
  };

  const active = stand?.aktiv ?? 0;
  const inactive = Math.max(0, (stand?.registriert ?? 0) - active);

  return (
    <View style={styles.box}>
      {/* Text von Daria (2026-11-09, „werden … decken“ 2026-11-10): Einnahmen decken zuerst die Fixkosten, künftige Gewinne 30 / 70 auf Team und Community */}
      <Text style={styles.body}>Einnahmen werden zuerst die Fixkosten decken. Die künftigen Gewinne verteilen sich auf das Team (30%) und die Community (70%).</Text>

      <View style={styles.bar} accessible accessibilityLabel={t('Team 30 %, Community 70 %')}>
        <View style={[styles.barPart, styles.barDev]} />
        <View style={[styles.barPart, styles.barCommunity]} />
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>Team 30 %</Text>
        <Text style={styles.legendText}>Community 70 %</Text>
      </View>

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {stand && chartWidth > 0 ? <Dots chartWidth={chartWidth} active={active} inactive={inactive} stand={stand} me={me} /> : null}
      </View>
      {stand ? (
        <Text style={styles.caption}>
          {t('{aktiv} aktiv, {inaktiv} nur angemeldet', { aktiv: active, inaktiv: inactive })}
          {' · '}
          {perDot(active + inactive) === 1 ? t('1 Punkt = 1 Person') : t('1 Punkt = {n} Personen', { n: perDot(active + inactive) })}
        </Text>
      ) : error ? (
        <Text style={styles.caption}>Die Zahlen sind gerade nicht erreichbar.</Text>
      ) : null}

      <Pressable accessibilityRole="link" onPress={openDetails} hitSlop={8}>
        <Text style={styles.link}>Details auf der Website</Text>
      </Pressable>
    </View>
  );
}

const perDot = (n: number) => Math.max(1, Math.ceil(n / MAX_DOTS));

/** Scheibe aus Punkten: innen die Aktiven, außen die nur Angemeldeten; der eigene Punkt ist der eigene Avatar (Daria, 08.11.2026) */
function Dots({ chartWidth, active, inactive, stand, me }: { chartWidth: number; active: number; inactive: number; stand: FinanceStand; me?: User }) {
  const divider = perDot(active + inactive);
  const nActive = Math.ceil(active / divider);
  const n = nActive + Math.ceil(inactive / divider);
  const chartHeight = Math.min(chartWidth, 200);
  const dots = useMemo(() => {
    const R = Math.min(Math.min(chartWidth, chartHeight) / 2 - 14, 9 * Math.sqrt(n / Math.PI) + 4);
    const spacing = R * Math.sqrt(Math.PI / Math.max(n, 1));
    const r = spacing * 0.4;
    return Array.from({ length: n }, (_, i) => {
      const rr = R * Math.sqrt((i + 0.5) / n) + (random(i * 4 + 1) - 0.5) * spacing * 0.45;
      const a = i * GOLD + (random(i * 4 + 2) - 0.5) * (spacing / Math.max(rr, spacing)) * 0.9;
      return {
        x: chartWidth / 2 + rr * Math.cos(a),
        y: chartHeight / 2 + rr * Math.sin(a),
        r: r * (0.92 + random(i * 4 + 6) * 0.16),
        dreh: random(i * 4 + 5) * 360,
        spiegel: random(i * 4 + 5) > 0.5 ? -1 : 1,
        aktiv: i < nActive,
      };
    });
  }, [chartWidth, chartHeight, n, nActive]);

  // Eigener Punkt: Rang innerhalb der eigenen Gruppe
  const own =
    stand.kategorie && stand.rang != null
      ? (stand.kategorie === 'aktiv' ? 0 : nActive) + Math.min(Math.floor(stand.rang / divider), (stand.kategorie === 'aktiv' ? nActive : n - nActive) - 1)
      : -1;
  const du = own >= 0 ? dots[own] : undefined;
  const duD = du ? Math.round(Math.max(du.r * 6, 26)) : 0;

  return (
    <View style={{ width: chartWidth, height: chartHeight }}>
      <Svg width={chartWidth} height={chartHeight} accessibilityLabel={t('{aktiv} aktiv, {inaktiv} nur angemeldet', { aktiv: active, inaktiv: inactive })}>
        {dots.map((p, i) =>
          i === own ? null : (
            <Path
              key={i}
              d={BUTTON}
              fill={p.aktiv ? DOT_ACTIVE : DOT_INACTIVE}
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
  // Ohne Karte: Die Überschrift „Modell KiezCoins“ steht wie bei den anderen Abschnitten darüber (Daria, 2026-11-10)
  box: { gap: space[12] },
  body: { ...text.body, color: color.text.secondary },
  bar: { flexDirection: 'row', height: 10, borderRadius: radius.full, overflow: 'hidden', gap: space[2] },
  barPart: { height: '100%' },
  barDev: { flex: 3, backgroundColor: color.text.primary },
  // Community in Lila (Daria, 08.11.2026)
  barCommunity: { flex: 7, backgroundColor: color.accent.primary },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendText: { ...text.caption, color: color.text.secondary },
  caption: { ...text.caption, color: color.text.secondary },
  link: { ...text.label, color: color.text.primary, textDecorationLine: 'underline' },
  du: { position: 'absolute', padding: space[2], backgroundColor: color.bg.screen },
});
