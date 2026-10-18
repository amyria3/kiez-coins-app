import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { sampleChallenges, sampleProfile, sampleUsers } from './sample';
import type { Challenge, ChallengeReport, Comment, FeedState, Payout, PayoutShare, Profile, User } from './types';

// Lokaler Zustand mit Beispieldaten. Wird später durch Supabase-Abfragen ersetzt;
// die Aktionen entsprechen den Statuswechseln aus den Figma-Annotationen.

type State = {
  users: User[];
  challenges: Challenge[];
  /** Wer gerade die App benutzt. Im Demo-Menü umschaltbar. */
  currentUserId: string;
  feedState: FeedState;
  profile: Profile;
};

type Action =
  | { type: 'accept'; id: string }
  | { type: 'giveBack'; id: string }
  | { type: 'report'; id: string; report: ChallengeReport }
  | { type: 'nameOperation'; id: string; name?: string }
  | { type: 'addComment'; id: string; body: string }
  | { type: 'sharePayout'; id: string; share: PayoutShare }
  | { type: 'revokeShare'; id: string }
  | { type: 'confirm'; id: string }
  | { type: 'undoConfirm'; id: string }
  | { type: 'unmarkPaid'; id: string }
  | { type: 'updateProfile'; patch: Partial<Profile> }
  | { type: 'signOut' }
  | { type: 'deleteAccount' }
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
      return updateChallenge(state, action.id, () => ({
        status: 'accepted',
        assigneeId: state.currentUserId,
        acceptedAt: new Date().toISOString(),
      }));
    case 'giveBack':
      return updateChallenge(state, action.id, () => ({
        status: 'open',
        assigneeId: undefined,
        acceptedAt: undefined,
        operationName: undefined,
        report: undefined,
        payoutShare: undefined,
      }));
    case 'nameOperation':
      return updateChallenge(state, action.id, () => ({ operationName: action.name?.trim() ?? '' }));
    case 'addComment': {
      const comment: Comment = {
        id: `comment-${Date.now()}`,
        authorId: state.currentUserId,
        body: action.body,
        createdAt: new Date().toISOString(),
      };
      return updateChallenge(state, action.id, (c) => ({ comments: [...c.comments, comment] }));
    }
    case 'sharePayout':
      return updateChallenge(state, action.id, () => ({ payoutShare: action.share }));
    case 'revokeShare':
      return updateChallenge(state, action.id, () => ({ payoutShare: undefined }));
    case 'undoConfirm':
      return updateChallenge(state, action.id, () => ({ status: 'reported' }));
    case 'unmarkPaid':
      return updateChallenge(state, action.id, () => ({ status: 'payment_open', paidMarkedAt: undefined }));
    case 'updateProfile':
      return { ...state, profile: { ...state.profile, ...action.patch } };
    case 'signOut':
      return { ...state, profile: sampleProfile };
    case 'deleteAccount':
      return { ...state, profile: sampleProfile };
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
  profile: sampleProfile,
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
