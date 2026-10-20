import type { ChallengeType } from './types';

/**
 * Challenge-Typen an- und abschalten. Ein abgeschalteter Typ verschwindet aus dem Feed und den
 * Top-Challenges; sein Reiter bleibt sichtbar, ist gedimmt und zeigt einen Hinweis, dass er geplant ist.
 */
export const challengeTypes: Record<ChallengeType, { active: boolean; label: string; plannedHint: string }> = {
  individual: {
    active: true,
    label: 'Challenge',
    plannedHint: '',
  },
  wave: {
    active: false,
    label: 'Wave',
    plannedHint: 'Wave Challenges sind in Planung: Gruppen und Vereine rufen bald den ganzen Kiez zu gemeinsamen Aktionen auf.',
  },
};

export const isTypeActive = (type: ChallengeType) => challengeTypes[type].active;
