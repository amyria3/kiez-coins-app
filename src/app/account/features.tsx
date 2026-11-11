import { Explanation, FieldGroup } from '../../components/Content';
import { CalendarSettings } from '../../components/CalendarSettings';
import { CrosspostSwitches } from '../../components/CrosspostSwitches';
import { FeatureSwitches } from '../../components/FeatureSwitches';
import { SubScreen } from '../../components/Screen';
import { useCrosspostEnabled } from '../../data/crosspost';
import { useCalendarAvailable } from '../../data/routine';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `account/features` (Dein Konto › Funktionen): Modi Privat, Gruppe und Kiez verbergen und einen
 * als Standard festlegen (Daria, 27.10.2026). Darunter die verbundenen Konten fürs Weiterposten (Daria, 09.11.2026)
 * und der Kalender (Daria, 2026-11-10, vorher unter Einstellungen).
 */
export default function FeaturesScreen() {
  const goBack = useGoBack();
  // Weiterposten: für alle erst nach Freigabe, für Moderatorinnen schon zum Testen (Daria, 05.11.2026)
  const crosspost = useCrosspostEnabled();
  // Feature `kalender`
  const calendar = useCalendarAvailable();
  return (
    <SubScreen title="Funktionen" navigation="back" onLeadingPress={goBack}>
      <Explanation
        question="Wozu sind die Schalter?"
        answer="Verbirg, was Du gerade nicht brauchst. Mit dem Schalter holst Du es Dir zurück, wann Du willst."
      />
      <FeatureSwitches>
        {/* Jede Plattform mit eigenem Schalter, die Einrichtung öffnet sich darunter (Daria, 2026-11-09) */}
        {crosspost ? (
          <FieldGroup heading label="Weiterposten">
            <CrosspostSwitches />
          </FieldGroup>
        ) : null}
        {calendar ? (
          <FieldGroup heading label="Kalender">
            <CalendarSettings />
          </FieldGroup>
        ) : null}
      </FeatureSwitches>
    </SubScreen>
  );
}
