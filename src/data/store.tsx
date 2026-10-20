import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { Alert } from 'react-native';

import * as remote from './remote';
import { sampleChallenges, sampleGroups, sampleProfile, sampleUsers, topChallengeIds } from './sample';
import type { Challenge, ChallengeReport, Comment, FeedState, Group, Payout, PayoutShare, Profile, User } from './types';

// Zustand der App. Zwei Betriebsarten:
// * live: Daten aus Supabase. Jede Aktion ändert sofort den lokalen Stand (damit die App flüssig bleibt)
//   und wird dann in einer Warteschlange an Supabase geschickt. Danach wird die Challenge neu geladen.
//   Schlägt etwas fehl, zeigt die App eine Meldung und lädt alles neu.
// * demo: Beispieldaten aus sample.ts, nur auf dem Gerät. Im Demo-Menü einschaltbar.

export type DataMode = 'live' | 'demo';

type State = {
  mode: DataMode;
  users: User[];
  challenges: Challenge[];
  /** Wer gerade die App benutzt. Live: die Supabase-Konto-ID. Demo: im Demo-Menü umschaltbar. */
  currentUserId: string;
  feedState: FeedState;
  profile: Profile;
  /** false nach einer bestätigten Meldung „Bounty nicht gezahlt“ */
  canOfferBounties: boolean;
  /** Eigene Gruppen samt Mitgliedern */
  groups: Group[];
};

type Action =
  | { type: 'accept'; id: string }
  | { type: 'giveBack'; id: string }
  | { type: 'report'; id: string; report: ChallengeReport }
  | { type: 'nameOperation'; id: string; name?: string }
  | { type: 'addComment'; id: string; body: string; replyToId?: string }
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
  | { type: 'setFeedState'; feedState: FeedState }
  | { type: 'loaded'; userId: string; data: remote.LiveData }
  | { type: 'challengeLoaded'; id: string; challenge: Challenge | null; users: User[] }
  | { type: 'useSampleData' }
  | { type: 'edit'; id: string; edit: remote.ChallengeEdit }
  | { type: 'close'; id: string }
  | { type: 'deleteDraft'; id: string }
  | { type: 'purge'; id: string }
  | { type: 'delete'; id: string }
  | { type: 'restore'; id: string; deadline?: string }
  | { type: 'setGroups'; groups: Group[] };

function updateChallenge(state: State, id: string, patch: (c: Challenge) => Partial<Challenge>): State {
  return {
    ...state,
    challenges: state.challenges.map((c) => (c.id === id ? { ...c, ...patch(c) } : c)),
  };
}

const emptyLive = (profile: Profile): State => ({
  mode: 'live',
  users: [],
  challenges: [],
  currentUserId: '',
  feedState: 'loading',
  profile,
  canOfferBounties: true,
  groups: [],
});

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'edit':
      return updateChallenge(state, action.id, () => ({ ...action.edit }));
    case 'close':
      return updateChallenge(state, action.id, () => ({ status: 'closed', closedAt: new Date().toISOString() }));
    case 'deleteDraft':
    case 'purge':
      return { ...state, challenges: state.challenges.filter((c) => c.id !== action.id) };
    case 'delete':
      return updateChallenge(state, action.id, () => ({ status: 'deleted', deletedAt: new Date().toISOString() }));
    case 'restore':
      return updateChallenge(state, action.id, (c) => ({
        status: 'open',
        deletedAt: undefined,
        deadline: action.deadline ?? c.deadline,
      }));
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
        replyToId: action.replyToId,
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
    case 'deleteAccount':
      return emptyLive(sampleProfile);
    case 'report':
      return updateChallenge(state, action.id, () => ({
        status: 'reported',
        report: action.report,
        rejectionReason: undefined,
      }));
    case 'confirm':
      return updateChallenge(state, action.id, (c) => ({ status: c.bountyAmount ? 'payment_open' : 'confirmed' }));
    case 'reject':
      return updateChallenge(state, action.id, () => ({ status: 'accepted', rejectionReason: action.reason }));
    case 'markPaid':
      return updateChallenge(state, action.id, () => ({ status: 'paid_marked', paidMarkedAt: new Date().toISOString() }));
    case 'confirmReceived':
      return updateChallenge(state, action.id, () => ({ status: 'paid' }));
    case 'create':
      return { ...state, challenges: [action.challenge, ...state.challenges.filter((c) => c.id !== action.challenge.id)] };
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
    case 'setGroups':
      return { ...state, groups: action.groups };
    case 'loaded':
      return {
        ...state,
        mode: 'live',
        users: action.data.users,
        challenges: action.data.challenges,
        currentUserId: action.userId,
        canOfferBounties: action.data.canOfferBounties,
        groups: action.data.groups,
        feedState: 'filled',
      };
    case 'challengeLoaded': {
      const known = new Set(action.users.map((u) => u.id));
      const users = [...state.users.filter((u) => !known.has(u.id)), ...action.users];
      if (!action.challenge) {
        return { ...state, users, challenges: state.challenges.filter((c) => c.id !== action.id) };
      }
      return { ...updateChallenge(state, action.id, () => action.challenge!), users };
    }
    case 'useSampleData':
      return {
        ...state,
        mode: 'demo',
        users: sampleUsers,
        challenges: sampleChallenges,
        currentUserId: 'gardeners',
        feedState: 'filled',
        canOfferBounties: true,
        groups: sampleGroups,
      };
  }
}

/** Aktionen, die in Supabase gespeichert werden (live). Profiländerungen speichert auth.tsx. */
async function persist(action: Action, before: State): Promise<string | null> {
  const userId = before.currentUserId;
  switch (action.type) {
    case 'edit':
      await remote.editChallenge(action.id, action.edit);
      return action.id;
    case 'close':
      await remote.closeChallenge(action.id);
      return action.id;
    case 'purge':
      await remote.purgeChallenge(action.id);
      return null;
    case 'deleteDraft':
      await remote.deleteDraft(action.id);
      return null;
    case 'delete':
      await remote.deleteChallenge(action.id);
      return action.id;
    case 'restore':
      await remote.restoreChallenge(action.id, action.deadline);
      return action.id;
    case 'accept':
      await remote.challengeActions.accept(action.id);
      return action.id;
    case 'giveBack':
      await remote.challengeActions.giveBack(action.id);
      return action.id;
    case 'report': {
      const path = await remote.uploadPhoto(userId, action.report.photo);
      await remote.challengeActions.report(action.id, path, action.report.note);
      return action.id;
    }
    case 'nameOperation':
      await remote.nameOperation(userId, action.id, action.name?.trim() ?? '');
      return action.id;
    case 'addComment':
      await remote.addComment(action.id, action.body, action.replyToId);
      return action.id;
    case 'sharePayout':
      await remote.sharePayout(action.id, action.share);
      return action.id;
    case 'revokeShare':
      await remote.revokeShare(action.id);
      return action.id;
    case 'confirm':
      await remote.challengeActions.confirm(action.id);
      return action.id;
    case 'undoConfirm':
      await remote.challengeActions.undoConfirm(action.id);
      return action.id;
    case 'reject':
      await remote.challengeActions.reject(action.id, action.reason);
      return action.id;
    case 'markPaid':
      await remote.challengeActions.markPaid(action.id);
      return action.id;
    case 'unmarkPaid':
      await remote.challengeActions.unmarkPaid(action.id);
      return action.id;
    case 'confirmReceived':
      await remote.challengeActions.confirmReceived(action.id);
      return action.id;
    case 'toggleLike': {
      const liked = before.challenges.find((c) => c.id === action.id)?.likedByMe;
      await remote.setLike(action.id, userId, !liked);
      return null;
    }
    case 'savePayout':
      await remote.savePayout(userId, action.payout);
      return null;
    default:
      return null;
  }
}

type Store = State & {
  dispatch: (action: Action) => void;
  /** Alles aus Supabase neu laden (live). */
  load: (userId: string) => Promise<void>;
  /** Neue Challenge anlegen. Gibt die ID zurück oder wirft mit einer lesbaren Meldung. */
  createChallenge: (draft: remote.NewChallenge) => Promise<string>;
  /** Entwurf anlegen (ohne id) oder aktualisieren. Gibt den Entwurf zurück oder wirft mit einer lesbaren Meldung. */
  saveDraft: (id: string | undefined, draft: remote.DraftInput) => Promise<Challenge>;
  /** Entwurf speichern und veröffentlichen. Wirft mit einer lesbaren Meldung. */
  publishDraft: (id: string, draft: remote.DraftInput, deadline: string) => Promise<string>;
  /** Gruppen: gründen, beitreten, verlassen, Mitglied entfernen, Rolle übertragen, Aufgabe erstellen. Werfen lesbar. */
  groupApi: GroupApi;
};

type GroupApi = {
  create: (name: string) => Promise<string>;
  join: (code: string) => Promise<string>;
  leave: (groupId: string) => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  transferFounder: (groupId: string, userId: string) => Promise<void>;
  createTask: (task: remote.NewGroupTask) => Promise<string>;
};

/** Beispielcode für Demo-Gruppen */
const demoCode = () =>
  Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, localDispatch] = useReducer(reducer, sampleProfile, emptyLive);
  const stateRef = useRef(state);
  stateRef.current = state;
  /** Warteschlange, damit z. B. „Erledigt melden“ vor „Zahlungsdaten freigeben“ ankommt. */
  const queue = useRef<Promise<void>>(Promise.resolve());

  const load = useCallback(async (userId: string) => {
    try {
      const data = await remote.loadLiveData(userId);
      localDispatch({ type: 'loaded', userId, data });
    } catch (error) {
      const offline = /fetch|network/i.test((error as Error)?.message ?? '');
      localDispatch({ type: 'setFeedState', feedState: offline ? 'offline' : 'error' });
    }
  }, []);

  const dispatch = useCallback(
    (action: Action) => {
      const before = stateRef.current;
      localDispatch(action);
      if (before.mode !== 'live' || !before.currentUserId) return;
      queue.current = queue.current.then(async () => {
        try {
          const changedId = await persist(action, before);
          if (changedId) {
            const { challenge, users } = await remote.loadChallenge(changedId, before.currentUserId);
            localDispatch({ type: 'challengeLoaded', id: changedId, challenge, users });
          }
        } catch (error) {
          Alert.alert('Hat nicht geklappt', remote.errorText(error));
          await load(before.currentUserId);
        }
      });
    },
    [load],
  );

  const createChallenge = useCallback(async (draft: remote.NewChallenge) => {
    const s = stateRef.current;
    if (s.mode === 'demo') {
      const challenge: Challenge = {
        id: `challenge-${Date.now()}`,
        type: 'individual',
        title: draft.title,
        text: draft.text,
        authorId: s.currentUserId,
        location: draft.location,
        bountyAmount: draft.bountyAmount,
        status: 'open',
        image: draft.photo,
        extraImages: draft.extras,
        likedByMe: false,
        comments: [],
        createdAt: new Date().toISOString(),
        deadline: draft.deadline,
        coords: draft.coords,
      };
      localDispatch({ type: 'create', challenge });
      return challenge.id;
    }
    try {
      const challenge = await remote.createChallenge(s.currentUserId, draft);
      localDispatch({ type: 'create', challenge });
      return challenge.id;
    } catch (error) {
      throw new Error(remote.errorText(error));
    }
  }, []);

  const saveDraft = useCallback(async (id: string | undefined, draft: remote.DraftInput) => {
    const s = stateRef.current;
    if (s.mode === 'demo') {
      const existing = s.challenges.find((c) => c.id === id);
      const challenge: Challenge = {
        id: id ?? `draft-${Date.now()}`,
        type: 'individual',
        title: draft.title.trim(),
        text: draft.text.trim(),
        authorId: s.currentUserId,
        location: draft.location.trim(),
        bountyAmount: draft.bountyAmount,
        status: 'draft',
        image: draft.photo ?? existing?.image,
        extraImages: draft.extras ?? existing?.extraImages,
        likedByMe: false,
        comments: [],
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        deadline: '',
        coords: draft.coords ?? existing?.coords,
      };
      localDispatch(existing ? { type: 'challengeLoaded', id: challenge.id, challenge, users: [] } : { type: 'create', challenge });
      return challenge;
    }
    try {
      const challenge = await remote.saveDraft(s.currentUserId, id, draft);
      localDispatch(id ? { type: 'challengeLoaded', id, challenge, users: [] } : { type: 'create', challenge });
      return challenge;
    } catch (error) {
      throw new Error(remote.errorText(error));
    }
  }, []);

  const publishDraft = useCallback(
    async (id: string, draft: remote.DraftInput, deadline: string) => {
      await saveDraft(id, draft);
      const s = stateRef.current;
      if (s.mode === 'demo') {
        const existing = s.challenges.find((c) => c.id === id);
        const challenge: Challenge = {
          id,
          type: 'individual',
          title: draft.title.trim(),
          text: draft.text.trim(),
          authorId: s.currentUserId,
          location: draft.location.trim(),
          bountyAmount: draft.bountyAmount,
          status: 'open',
          image: draft.photo ?? existing?.image,
          extraImages: draft.extras ?? existing?.extraImages,
          likedByMe: false,
          comments: [],
          createdAt: new Date().toISOString(),
          deadline,
          coords: draft.coords ?? existing?.coords,
        };
        localDispatch({ type: 'challengeLoaded', id, challenge, users: [] });
        return id;
      }
      try {
        await remote.publishDraft(id, deadline);
        const { challenge, users } = await remote.loadChallenge(id, s.currentUserId);
        localDispatch({ type: 'challengeLoaded', id, challenge, users });
        return id;
      } catch (error) {
        throw new Error(remote.errorText(error));
      }
    },
    [saveDraft],
  );

  const groupApi = useMemo<GroupApi>(() => {
    // Live: Funktion in Supabase, danach alles neu laden. Demo: nur lokal.
    const live = async <T,>(run: () => Promise<T>): Promise<T> => {
      try {
        const result = await run();
        await load(stateRef.current.currentUserId);
        return result;
      } catch (error) {
        throw new Error(remote.errorText(error));
      }
    };
    const setGroups = (change: (groups: Group[]) => Group[]) =>
      localDispatch({ type: 'setGroups', groups: change(stateRef.current.groups) });
    const isDemo = () => stateRef.current.mode === 'demo';
    const me = () => stateRef.current.currentUserId;
    return {
      create: async (name) => {
        if (!isDemo()) return live(() => remote.groupActions.create(name));
        const group: Group = {
          id: `group-${Date.now()}`,
          name: name.trim(),
          founderId: me(),
          inviteCode: demoCode(),
          createdAt: new Date().toISOString(),
          members: [{ userId: me(), role: 'founder', joinedAt: new Date().toISOString() }],
        };
        setGroups((groups) => [...groups, group]);
        return group.id;
      },
      join: async (code) => {
        if (!isDemo()) return live(() => remote.groupActions.join(code));
        const group = stateRef.current.groups.find((g) => g.inviteCode === code.trim().toUpperCase());
        if (!group) throw new Error('Diesen Code gibt es nicht. Prüf ihn noch einmal.');
        return group.id;
      },
      leave: async (groupId) => {
        if (!isDemo()) return live(() => remote.groupActions.leave(groupId));
        setGroups((groups) => groups.filter((g) => g.id !== groupId));
      },
      removeMember: async (groupId, userId) => {
        if (!isDemo()) return live(() => remote.groupActions.removeMember(groupId, userId));
        setGroups((groups) =>
          groups.map((g) => (g.id === groupId ? { ...g, members: g.members.filter((m) => m.userId !== userId) } : g)),
        );
      },
      transferFounder: async (groupId, userId) => {
        if (!isDemo()) return live(() => remote.groupActions.transferFounder(groupId, userId));
        setGroups((groups) =>
          groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  founderId: userId,
                  members: g.members.map((m) => ({ ...m, role: m.userId === userId ? 'founder' : 'member' })),
                }
              : g,
          ),
        );
      },
      createTask: async (task) => {
        const s = stateRef.current;
        if (!isDemo()) {
          try {
            const challenge = await remote.createGroupTask(s.currentUserId, task);
            localDispatch({ type: 'create', challenge });
            return challenge.id;
          } catch (error) {
            throw new Error(remote.errorText(error));
          }
        }
        const challenge: Challenge = {
          id: `task-${Date.now()}`,
          type: 'individual',
          groupId: task.groupId,
          edensteine: task.edensteine,
          title: task.title.trim(),
          text: task.text.trim(),
          authorId: s.currentUserId,
          location: '',
          status: 'open',
          image: task.photo,
          likedByMe: false,
          comments: [],
          createdAt: new Date().toISOString(),
          deadline: task.deadline,
        };
        localDispatch({ type: 'create', challenge });
        return challenge.id;
      },
    };
  }, [load]);

  const value = useMemo(
    () => ({ ...state, dispatch, load, createChallenge, saveDraft, publishDraft, groupApi }),
    [state, dispatch, load, createChallenge, saveDraft, publishDraft, groupApi],
  );
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

const unknownUser: User = { id: '', name: 'Unbekannt', firstName: 'Unbekannt' };

export function useCurrentUser(): User {
  const { users, currentUserId } = useStore();
  return users.find((u) => u.id === currentUserId) ?? { ...unknownUser, id: currentUserId };
}

const COMPLETED = new Set(['confirmed', 'payment_open', 'paid_marked', 'paid']);

/**
 * Leiste oben im Feed. Demo: feste Auswahl aus den Beispieldaten.
 * Live: zuerst Challenges, bei denen Du etwas tun musst, dann offene mit der kürzesten Restzeit.
 */
export function topChallenges(state: Pick<State, 'mode' | 'challenges' | 'currentUserId'>, max = 3): Challenge[] {
  const { challenges, currentUserId: me } = state;
  if (state.mode === 'demo') {
    return topChallengeIds.map((id) => challenges.find((c) => c.id === id)).filter((c): c is Challenge => !!c);
  }
  const mine = challenges.filter(
    (c) =>
      (c.authorId === me && (c.status === 'reported' || c.status === 'payment_open')) ||
      (c.assigneeId === me && (c.status === 'accepted' || c.status === 'paid_marked')),
  );
  const now = Date.now();
  const open = challenges
    .filter((c) => !c.groupId && c.status === 'open' && Date.parse(c.deadline) > now && !mine.includes(c))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  return [...mine, ...open].filter((c) => !COMPLETED.has(c.status)).slice(0, max);
}
