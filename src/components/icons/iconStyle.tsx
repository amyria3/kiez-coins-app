import { createContext, useContext, type ReactNode } from 'react';

// Test (Daria, 24.10.2026): Font Awesome in einem anderen Stil. „regular“ ist der Stand im Instagram-Look
// (Kontur, wo es sie gibt), „solid“ zeigt alles gefüllt. Nur die Test-Screens unter /icontest setzen „solid“.
import { faComment } from '@fortawesome/free-solid-svg-icons/faComment';
import { faComments } from '@fortawesome/free-solid-svg-icons/faComments';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons/faPaperPlane';
import { faCamera } from '@fortawesome/free-solid-svg-icons/faCamera';
import { faHouse } from '@fortawesome/free-solid-svg-icons/faHouse';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faFlag } from '@fortawesome/free-solid-svg-icons/faFlag';
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy';
import { faEye } from '@fortawesome/free-solid-svg-icons/faEye';
import { faThumbsUp } from '@fortawesome/free-solid-svg-icons/faThumbsUp';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons/faCircleCheck';
import { faGem } from '@fortawesome/free-solid-svg-icons/faGem';

export type IconStyle = 'regular' | 'solid';

type FaDef = { iconName?: string; icon: [number, number, string[], string, string | string[]] };

/** Gefüllte Fassung der Kontur-Icons, nach Name. Das Herz fehlt mit Absicht: leer heißt „gefällt mir nicht“. */
const SOLID: Record<string, FaDef> = Object.fromEntries(
  [faComment, faComments, faPaperPlane, faCamera, faHouse, faClock, faFlag, faCopy, faEye, faThumbsUp, faCircleCheck, faGem].map(
    (d) => [d.iconName, d as FaDef],
  ),
);

/** Icon im gewählten Stil; ohne gefüllte Fassung bleibt es, wie es ist */
export function inStyle<T extends FaDef>(def: T, style: IconStyle): T | FaDef {
  return style === 'solid' && def.iconName ? (SOLID[def.iconName] ?? def) : def;
}

const IconStyleContext = createContext<IconStyle>('regular');

export function IconStyleProvider({ value, children }: { value: IconStyle; children: ReactNode }) {
  return <IconStyleContext.Provider value={value}>{children}</IconStyleContext.Provider>;
}

export const useIconStyle = () => useContext(IconStyleContext);
