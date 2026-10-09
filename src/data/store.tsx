import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { sampleChallenges, sampleUsers } from './sample';
import type { Challenge, ChallengeReport, FeedState, Payout, User } from './types';

// Lokaler Zustand mit Beispieldaten. Wird später durch Supabase-Abfragen ersetzt;
// die Aktionen entsprechen den Statuswechseln aus den Figma-Annotationen.

type State = {
  users: User[];
  challenges: Challenge[];
  /** Wer gerade die App benutzt. Im Demo-Menü umschaltbar. */
  currentUserId: string;
  feedState: FeedState;
};

type Action =
  | { type: 'accept'; id: string }
  | { type: 'giveBack'; id: string }
  | { type: 'report'; id: string; report: ChallengeReport }
  | { type: 'confirm'; id: string }
  | { type: 'reject'; id: string; reason: string }
  | { type: 'markPaid'; id: string }
  | { type: 'confirmReceived'; id: string }
  | { type: 'create'; challenge: Challenge }
  | { type: 'toggleLike'; id: string }
  | { type: 'savePayout'; payout: Payout }
  | { type: 'setCurrentUser'; userId: string }
  | { type: 'setFeedState'; feedState: FeedState };

function updateChallenge(state: State, id: string, patch: (c: Challenge) => Partial<Challenge>): State {
  return {
    ...state,
    challenges: state.challenges.map((c) => (c.id === id ? { ...c, ...patch(c) } : c)),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'accept':
      return updateChallenge(state, action.id, () => ({ status: 'accepted', assigneeId: state.currentUserId }));
    case 'giveBack':
      return updateChallenge(state, action.id, () => ({ status: 'open', assigneeId: undefined, report: undefined }));
    case 'report':
      return updateChallenge(state, action.id, () => ({ status: 'reported', report: action.report }));
    case 'confirm':
      return updateChallenge(state, action.id, (c) => ({ status: c.bountyAmount ? 'payment_open' : 'confirmed' }));
    case 'reject':
      return updateChallenge(state, action.id, () => ({ status: 'accepted', rejectionReason: action.reason }));
    case 'markPaid':
      return updateChallenge(state, action.id, () => ({ status: 'paid_marked', paidMarkedAt: new Date().toISOString() }));
    case 'confirmReceived':
      return updateChallenge(state, action.id, () => ({ status: 'paid' }));
    case 'create':
      return { ...state, challenges: [action.challenge, ...state.challenges] };
    case 'toggleLike':
      return updateChallenge(state, action.id, (c) => ({ likedByMe: !c.likedByMe }));
    case 'savePayout':
      return {
        ...state,
        users: state.users.map((u) => (u.id === state.currentUserId ? { ...u, payout: action.payout } : u)),
      };
    case 'setCurrentUser':
      return { ...state, currentUserId: action.userId };
    case 'setFeedState':
      return { ...state, feedState: action.feedState };
  }
}

const initialState: State = {
  users: sampleUsers,
  challenges: sampleChallenges,
  currentUserId: 'gardeners',
  feedState: 'filled',
};

type Store = State & { dispatch: (action: Action) => void };

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ ...state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore muss innerhalb von <StoreProvider> verwendet werden');
  return store;
}

export function useChallenge(id: string | undefined) {
  const { challenges, users } = useStore();
  const challenge = challenges.find((c) => c.id === id);
  const author = users.find((u) => u.id === challenge?.authorId);
  const assignee = users.find((u) => u.id === challenge?.assigneeId);
  return { challenge, author, assignee };
}

export function useCurrentUser(): User {
  const { users, currentUserId } = useStore();
  return users.find((u) => u.id === currentUserId)!;
}
