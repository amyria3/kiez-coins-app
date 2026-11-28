import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, PanResponder, Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Button } from '../../../components/Button';
import { Explanation, FieldGroup, Notice, QuestionHint } from '../../../components/Content';
import { CheckOption } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { Text } from '../../../components/T';
import { phXml } from '../../../components/icons/phosphor';
import { WEB_APP_URL } from '../../../data/groups';
import { loadShowcase, type Showcase } from '../../../data/showcase';
import { useStore } from '../../../data/store';
import { t } from '../../../data/texts';
import { CARD_H, CARD_W, cardData, downloadCard, drawBusinessCard, printCard, printLink, servicesPlain, type CardSides } from '../../../lib/businessCard';
import { useGoBack } from '../../../lib/goBack';
import { color, radius, space, text } from '../../../theme/tokens';

const web = Platform.OS === 'web';

/**
 * Route `schaufenster/[id]/druck`: die Druckbare Visitenkarte als PDF (2026-11-23), abgesetzt von der Digitalen
 * Visitenkarte mit ihren Weiterleitungsoptionen. Vorder- und Rückseite im Format 85 × 55 mm, Herunterladen als Bilder
 * und Drucken oder als PDF sichern, am Rechner und am Handy. Die Karte wird im Browser gezeichnet
 * (lib/businessCardCanvas.ts); in der Android-App öffnet der Knopf dieselbe Seite im Browser. Nur fürs Team.
 *
 * „Auf der Druckbaren Visitenkarte zeigen“ (Daria, 2026-11-23): Häkchen bei Services (vorne) und Links (hinten).
 * Vorausgewählt sind die ersten Einträge der Liste, so viele wie ganz auf die Karte passen. Die Reihenfolge der Links kommt
 * aus „Inhalte bearbeiten“; Links und Services lassen sich hier am Griff mit drei Strichen nur für die Karte
 * umsortieren (2026-11-28). Ist eine Seite voll, sind weitere Häkchen gesperrt, und eine Frage erklärt warum. Passt eine
 * Auswahl trotzdem nicht ganz (lange Einträge brauchen zwei Zeilen), sagt der Bildschirm, was fehlt.
 */
export default function PrintableBusinessCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack();
  const { currentUserId } = useStore();
  const [showcase, setShowcase] = useState<Showcase | null | undefined>(undefined);
  const [team, setTeam] = useState(false);
  const [sides, setSides] = useState<CardSides | null>(null);
  const [preview, setPreview] = useState<{ front: string; back: string } | null>(null);
  // Auswahl je Eintrag; null, bis die erste Zeichnung zeigt, wie viel passt
  const [linkOn, setLinkOn] = useState<boolean[] | null>(null);
  const [serviceOn, setServiceOn] = useState<boolean[] | null>(null);
  // Reihenfolge der Links und Services nur für die Druckbare Visitenkarte (Daria, 2026-11-28: „Reihenfolge hier anpassen“,
  // „auch Services sortieren“). Anfangs wie unter „Inhalte bearbeiten“; die Seite und die Digitale Visitenkarte bleiben,
  // wie sie sind. `linkOn`/`serviceOn` gelten je Eintrag in der Reihenfolge aus „Inhalte bearbeiten“, `*Order` sagt, an
  // welcher Stelle er auf der Karte steht.
  const [linkOrder, setLinkOrder] = useState<number[] | null>(null);
  const [serviceOrder, setServiceOrder] = useState<number[] | null>(null);
  const links = useMemo(() => showcase?.links ?? [], [showcase]);
  const services = useMemo(() => servicesPlain(showcase?.services), [showcase]);
  const order = linkOrder && linkOrder.length === links.length ? linkOrder : links.map((_, i) => i);
  const sOrder = serviceOrder && serviceOrder.length === services.length ? serviceOrder : services.map((_, i) => i);
  // Loslassen am Griff löst im Browser auch ein Antippen der Zeile aus; das soll das Häkchen nicht umschalten
  const droppedAt = useRef(0);
  const move = (list: number[], set: (v: number[]) => void) => (from: number, to: number) => {
    droppedAt.current = Date.now();
    if (from === to) return;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    set(next);
  };

  useFocusEffect(
    useCallback(() => {
      loadShowcase(id, currentUserId).then(
        (d) => {
          setShowcase(d?.showcase ?? null);
          setTeam(!!d?.access.team);
        },
        () => setShowcase(null),
      );
    }, [id, currentUserId]),
  );

  useEffect(() => {
    if (!showcase || !web) return;
    let off = false;
    const chosen = linkOn && serviceOn;
    const data = chosen
      ? { ...cardData(showcase), links: order.filter((i) => linkOn[i]).map((i) => links[i]), serviceLines: sOrder.filter((i) => serviceOn[i]).map((i) => services[i]) }
      : cardData(showcase);
    drawBusinessCard(data).then((s) => {
      if (off || !s) return;
      if (!chosen) {
        // Erste Zeichnung mit allem: vorausgewählt sind die ersten Einträge, so viele wie passen
        setLinkOn(links.map((_, i) => i < s.fit.links));
        setServiceOn(services.map((_, i) => i < s.fit.services));
        return;
      }
      setSides(s);
      setPreview({ front: s.front.toDataURL('image/png'), back: s.back.toDataURL('image/png') });
    });
    return () => {
      off = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `order` und `sOrder` sind aus den Reihenfolgen abgeleitet
  }, [showcase, links, services, linkOn, serviceOn, linkOrder, serviceOrder]);

  // Gewählt, aber nicht (ganz) auf der Karte
  const missingLinks = sides && linkOn ? linkOn.filter(Boolean).length - sides.fit.links : 0;
  const missingServices = sides && serviceOn ? serviceOn.filter(Boolean).length - sides.fit.services : 0;
  // Voll: so viele Häkchen wie Zeilen frei sind; dann lassen sich nur noch Häkchen wegnehmen
  const linksFull = !!sides && !!linkOn && linkOn.filter(Boolean).length >= sides.fit.linkRoom;
  const servicesFull = !!sides && !!serviceOn && serviceOn.filter(Boolean).length >= sides.fit.serviceRoom;
  const toggle = (list: boolean[] | null, set: (v: boolean[]) => void, i: number) =>
    list && Date.now() - droppedAt.current > 400 && set(list.map((v, j) => (j === i ? !v : v)));

  const title = 'Druckbare Visitenkarte';
  if (showcase === undefined) {
    return (
      <SubScreen title={title} navigation="back" onLeadingPress={goBack}>
        <ActivityIndicator color={color.text.secondary} />
      </SubScreen>
    );
  }
  if (showcase === null || !team) {
    return (
      <SubScreen title={title} navigation="back" onLeadingPress={goBack}>
        <Notice message="Die Druckbare Visitenkarte gibt es nur für das Team des Schaufensters." />
      </SubScreen>
    );
  }

  return (
    <SubScreen title={title} navigation="back" onLeadingPress={goBack}>
      <View style={styles.page}>
        <Explanation
          question="Was ist die Druckbare Visitenkarte?"
          answer="Eine Karte aus Papier im Format 85 × 55 mm wie eine Scheckkarte. Vorne stehen Name, Kiez und Deine Services. Hinten stehen der QR-Code zu Deiner Digitalen Visitenkarte, Adresse, Öffnungszeiten, E-Mail und Links. Ändern kannst Du die Angaben unter „Inhalte bearbeiten“."
        />
        {web ? (
          preview ? (
            <View style={styles.sides}>
              <Text style={styles.label}>Vorne</Text>
              <Image source={{ uri: preview.front }} style={styles.card} contentFit="contain" accessibilityLabel={t('Vorderseite der Druckbaren Visitenkarte')} />
              <Text style={styles.label}>Hinten</Text>
              <Image source={{ uri: preview.back }} style={styles.card} contentFit="contain" accessibilityLabel={t('Rückseite der Druckbaren Visitenkarte')} />
            </View>
          ) : (
            <ActivityIndicator color={color.text.secondary} />
          )
        ) : null}
        {web && linkOn && serviceOn && (links.length || services.length) ? (
          <FieldGroup label="Auf der Druckbaren Visitenkarte zeigen">
            {services.length ? (
              <View style={styles.choices}>
                <Text style={styles.label}>{t('Services, vorne')}</Text>
                <SortableList
                  count={sOrder.length}
                  itemKey={(pos) => `s${sOrder[pos]}`}
                  onMove={move(sOrder, setServiceOrder)}
                  renderItem={(pos, handle) => {
                    const i = sOrder[pos];
                    return (
                      <CheckOption
                        label={services[i].replace(/^· /, '')}
                        selected={serviceOn[i]}
                        disabled={servicesFull && !serviceOn[i]}
                        onPress={() => toggle(serviceOn, setServiceOn, i)}
                        trailing={handle}
                      />
                    );
                  }}
                  handleLabel={(pos) => t('Service {n} verschieben', { n: pos + 1 })}
                />
                {servicesFull && serviceOn.some((on) => !on) ? (
                  <QuestionHint
                    question="Warum kann ich nicht mehr Services auswählen?"
                    answer="Die Druckbare Visitenkarte ist nur 85 × 55 mm groß. Vorne unter Deinem Namen ist kein Platz mehr. Nimm einen Haken weg, dann kannst Du einen anderen Service wählen. Alle Services stehen auf Deiner Digitalen Visitenkarte."
                  />
                ) : null}
              </View>
            ) : null}
            {links.length ? (
              <View style={styles.choices}>
                <Text style={styles.label}>{t('Links, hinten')}</Text>
                <SortableList
                  count={order.length}
                  itemKey={(pos) => `l${order[pos]}`}
                  onMove={move(order, setLinkOrder)}
                  renderItem={(pos, handle) => {
                    const i = order[pos];
                    return (
                      <CheckOption
                        label={printLink(links[i])}
                        selected={linkOn[i]}
                        disabled={linksFull && !linkOn[i]}
                        onPress={() => toggle(linkOn, setLinkOn, i)}
                        trailing={handle}
                      />
                    );
                  }}
                  handleLabel={(pos) => t('Link {n} verschieben', { n: pos + 1 })}
                />
                {linksFull && linkOn.some((on) => !on) ? (
                  <QuestionHint
                    question="Warum kann ich nicht mehr Links auswählen?"
                    answer="Die Druckbare Visitenkarte ist nur 85 × 55 mm groß. Hinten neben dem QR-Code ist kein Platz mehr. Nimm einen Haken weg, dann kannst Du einen anderen Link wählen. Alle Links stehen auf Deiner Digitalen Visitenkarte, und die öffnet der QR-Code."
                  />
                ) : null}
              </View>
            ) : null}
            {missingLinks > 0 || missingServices > 0 ? (
              <Notice
                variant="warning"
                message={missingText(missingLinks, missingServices)}
              />
            ) : null}
          </FieldGroup>
        ) : null}
        {web ? (
          <View style={styles.buttons}>
            <Button label="Drucken oder als PDF" disabled={!sides} onPress={() => sides && printCard(sides, showcase.name)} />
            <Button label="Als Bilder herunterladen" variant="secondary" disabled={!sides} onPress={() => sides && downloadCard(sides, showcase.name)} />
            <Notice message="Für die Druckerei im Druckdialog „Als PDF sichern“ wählen: Das PDF hat zwei Seiten, vorne und hinten." />
          </View>
        ) : (
          <Button
            label="Im Browser öffnen"
            iconEnd="external"
            onPress={() => Linking.openURL(`${WEB_APP_URL}/schaufenster/${showcase.id}/druck`).catch(() => {})}
          />
        )}
      </View>
    </SubScreen>
  );
}

/**
 * Liste zum Umsortieren per Ziehen (Daria, 2026-11-28: „diese drei Striche, die anzeigen, dass man was schieben kann“).
 * Rechts in jeder Zeile (im Rahmen der Auswahl) ein Griff mit drei Strichen; die Zeile hängt am Finger oder an der Maus, die anderen rücken
 * beiseite, beim Loslassen steht sie an der neuen Stelle. Alle Zeilen sind gleich hoch (CheckOption).
 */
function SortableList({
  count,
  itemKey,
  renderItem,
  onMove,
  handleLabel,
}: {
  count: number;
  /** Fester Schlüssel je Eintrag, damit nach dem Umsortieren nichts an der falschen Zeile hängen bleibt */
  itemKey: (pos: number) => string;
  /** `handle`: der Griff, den die Zeile rechts in ihren Rahmen setzt */
  renderItem: (pos: number, handle: ReactNode) => ReactNode;
  onMove: (from: number, to: number) => void;
  handleLabel: (pos: number) => string;
}) {
  const [drag, setDrag] = useState<{ from: number; dy: number } | null>(null);
  // Höhe einer Zeile samt Abstand, gemessen an der ersten Zeile
  const step = useRef(64);
  const target = (from: number, dy: number) => Math.max(0, Math.min(count - 1, from + Math.round(dy / step.current)));
  const to = drag ? target(drag.from, drag.dy) : -1;
  const shift = (pos: number) => {
    if (!drag || pos === drag.from) return drag ? drag.dy : 0;
    if (drag.from < pos && pos <= to) return -step.current;
    if (to <= pos && pos < drag.from) return step.current;
    return 0;
  };
  return (
    <View style={styles.choices}>
      {Array.from({ length: count }, (_, pos) => (
        <View
          key={itemKey(pos)}
          onLayout={pos === 0 ? (e) => (step.current = e.nativeEvent.layout.height + space[8]) : undefined}
          style={[styles.linkRow, { transform: [{ translateY: shift(pos) }] }, drag?.from === pos && styles.dragging]}
        >
          <View style={styles.flex}>
            {renderItem(
              pos,
              count > 1 ? (
                <DragHandle
                  label={handleLabel(pos)}
                  onDrag={(dy) => setDrag({ from: pos, dy })}
                  onDrop={(dy) => {
                    setDrag(null);
                    onMove(pos, target(pos, dy));
                  }}
                />
              ) : null,
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Griff mit drei Strichen; meldet, wie weit er nach oben oder unten gezogen wird */
function DragHandle({ label, onDrag, onDrop }: { label: string; onDrag: (dy: number) => void; onDrop: (dy: number) => void }) {
  const latest = useRef({ onDrag, onDrop });
  latest.current = { onDrag, onDrop };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => latest.current.onDrag(0),
        onPanResponderMove: (_e, g) => latest.current.onDrag(g.dy),
        onPanResponderRelease: (_e, g) => latest.current.onDrop(g.dy),
        onPanResponderTerminate: (_e, g) => latest.current.onDrop(g.dy),
      }),
    [],
  );
  return (
    <View accessible accessibilityLabel={label} style={[styles.handle, web && HANDLE_WEB]} {...pan.panHandlers}>
      <SvgXml xml={phXml('list', color.text.primary)} width={22} height={22} accessible={false} />
    </View>
  );
}

/** „Nicht alles passt“ mit den Zahlen, die fehlen; Einzahl und Mehrzahl stehen im Text, damit die Übersetzung stimmt */
function missingText(links: number, services: number): string {
  const parts = [
    links === 1 ? t('1 Link') : links > 1 ? t('{count} Links', { count: String(links) }) : '',
    services === 1 ? t('1 Service') : services > 1 ? t('{count} Services', { count: String(services) }) : '',
  ].filter(Boolean);
  return t('Nicht alles passt auf die Karte, es fehlen: {what}. Wähle weniger aus oder kürze die Services.', { what: parts.join(', ') });
}

// Im Browser: Hand als Mauszeiger, und Ziehen am Handy scrollt nicht die Seite (Web-CSS, das StyleSheet nicht kennt)
const HANDLE_WEB = { cursor: 'grab', touchAction: 'none', userSelect: 'none' } as object;

const styles = StyleSheet.create({
  page: { gap: space[24] },
  sides: { gap: space[8] },
  label: { ...text.caption, color: color.text.secondary },
  card: { width: '100%', aspectRatio: CARD_W / CARD_H, borderRadius: radius.md, marginBottom: space[12] },
  buttons: { gap: space[12] },
  choices: { gap: space[8] },
  linkRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  dragging: { zIndex: 1, opacity: 0.9 },
  // Bis an den Rand der Zeile, damit die Fläche zum Greifen groß bleibt
  handle: { width: 40, height: 40, marginVertical: -space[8], marginRight: -space[8], alignItems: 'center', justifyContent: 'center' },
});
