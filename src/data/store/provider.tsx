import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { Alert } from 'react-native';
import { attachRoutinePost } from '../reminders';
import { attachShowcasePost } from '../showcase';

import * as remote from '../remote';
import { sampleProfile } from '../sample';
import { clearStartCache, saveCachedFeed } from '../startCache';
import { setGender } from '../texts';
import { type Challenge, type Group, type User } from '../types';
import { Action, emptyLive, persist, reducer, State } from './reducer';

type Store = State & {
  /** Ergebnis: true, wenn die Änderung gespeichert ist (Demo: sofort), false bei Fehler */
  dispatch: (action: Action) => Promise<boolean>;
  /** Alles aus Supabase neu laden (live). */
  load: (userId: string) => Promise<void>;
  /** Neue Challenge anlegen. Gibt die ID zurück oder wirft mit einer lesbaren Meldung. */
  createChallenge: (draft: remote.NewChallenge) => Promise<string>;
  /** Entwurf anlegen (ohne id) oder aktualisieren. Gibt den Entwurf zurück oder wirft mit einer lesbaren Meldung. */
  saveDraft: (id: string | undefined, draft: remote.DraftInput) => Promise<Challenge>;
  /** Entwurf speichern und veröffentlichen. Wirft mit einer lesbaren Meldung. */
  publishDraft: (id: string, draft: remote.DraftInput, deadline: string) => Promise<string>;
  /** Gruppen: gründen, beitreten, verlassen, Mitglied entfernen, Rolle übertragen, Rangliste schalten, Aufgabe erstellen. Werfen lesbar. */
  groupApi: GroupApi;
  /** Blockierung aufheben. Live: lädt danach alles neu, damit die Inhalte der Person zurückkommen. */
  unblock: (userId: string) => Promise<void>;
  /** Vorher-Nachher: Entwurf anlegen, Timer starten, ändern, posten. Werfen lesbar. */
  beforeAfter: BeforeAfterApi;
};

type BeforeAfterApi = {
  /** Gibt die id des Entwurfs zurück */
  start: (input: remote.NewBeforeAfter) => Promise<string>;
  startTimer: (id: string) => Promise<void>;
  /** Timer stoppen: Die Challenge ist wieder ein Entwurf, der noch nicht gestartet ist. */
  stopTimer: (id: string) => Promise<void>;
  update: (id: string, edit: remote.BeforeAfterEdit) => Promise<void>;
  /** Speichert `edit` (falls übergeben) und postet */
  finish: (id: string, edit?: remote.BeforeAfterEdit) => Promise<void>;
};

/** Text des fertigen Beitrags, wie ihn die Datenbank beim Posten zusammensetzt */
export function beforeAfterBody(c: Pick<Challenge, 'beforeText' | 'afterText' | 'imageAfter'>): string {
  const lines = [`#vorher${c.beforeText ? ` ${c.beforeText}` : ''}`];
  if (c.imageAfter || c.afterText) lines.push(`#nachher${c.afterText ? ` ${c.afterText}` : ''}`);
  return lines.join('\n').slice(0, 500);
}

type GroupApi = {
  create: (name: string) => Promise<string>;
  join: (code: string) => Promise<string>;
  leave: (groupId: string) => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  transferFounder: (groupId: string, userId: string) => Promise<void>;
  /** Rangliste ein- oder ausschalten (nur Gründerin) */
  setLeaderboard: (groupId: string, show: boolean) => Promise<void>;
  setMotto: (groupId: string, motto: string) => Promise<void>;
  createTask: (task: remote.NewGroupTask) => Promise<string>;
};

/** Beispielcode für Demo-Gruppen */
const demoCode = () =>
  Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');

const StoreContext = createContext<Store | null>(null);

/** Aktionen, die keine Feed-Daten ändern oder selbst frische Daten bringen. Alle anderen zählen als Änderung. */
const PASSIVE_ACTIONS = new Set<Action['type']>(['loaded', 'setFeedState', 'challengeLoaded', 'updateProfile', 'setCurrentUser', 'useSampleData']);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, sampleProfile, (p0) => reducer(emptyLive(p0), { type: 'useSampleData' }));
  /** Zählt Änderungen an Feed-Daten. Ein laufendes Laden erkennt daran, dass sein Stand inzwischen veraltet ist. */
  const changes = useRef(0);
  /** Steigt beim Abmelden. Ergebnisse, die davor begonnen haben, gelten nicht mehr (auch nicht für den Startspeicher). */
  const generation = useRef(0);
  const localDispatch = useCallback((action: Action) => {
    if (action.type === 'signOut' || action.type === 'deleteAccount') generation.current += 1;
    else if (!PASSIVE_ACTIONS.has(action.type)) changes.current += 1;
    rawDispatch(action);
  }, []);
  const stateRef = useRef(state);
  stateRef.current = state;
  // Geschlecht aus dem Profil steuert die Texte an Dich (src/data/texts.ts)
  const profileGender = state.profile.gender;
  useEffect(() => {
    if (profileGender) setGender(profileGender);
  }, [profileGender]);
  /** Warteschlange, damit z. B. „Erledigt melden“ vor „Zahlungsdaten freigeben“ ankommt. */
  const queue = useRef<Promise<void>>(Promise.resolve());

  // Veraltete Ergebnisse verwerfen (Prüfung 12.11.2026): Ein Laden, das länger dauert als ein neueres, das über ein
  // Abmelden hinweg läuft oder während dessen etwas geändert wurde (Herz, Blockieren, neuer Post), würde sonst einen
  // älteren Stand über den neueren legen. Im letzten Fall lädt die App nach, sobald die Änderungen gespeichert sind.
  const loadSeq = useRef(0);
  const loadRef = useRef<(userId: string) => Promise<void>>(async () => {});
  const load = useCallback(async (userId: string) => {
    const mine = ++loadSeq.current;
    const gen = generation.current;
    const changesBefore = changes.current;
    const current = () => mine === loadSeq.current && gen === generation.current;
    try {
      const data = await remote.loadLiveData(userId);
      if (!current()) return;
      if (changes.current !== changesBefore) {
        void queue.current.then(() => (current() ? loadRef.current(userId) : undefined));
        return;
      }
      localDispatch({ type: 'loaded', userId, data });
      saveCachedFeed(userId, data);
    } catch (error) {
      if (!current()) return;
      const offline = /fetch|network/i.test((error as Error)?.message ?? '');
      localDispatch({ type: 'setFeedState', feedState: offline ? 'offline' : 'error', error: offline ? undefined : remote.errorDetail(error) });
    }
  }, [localDispatch]);
  loadRef.current = load;

  const dispatch = useCallback(
    (action: Action) => {
      const before = stateRef.current;
      localDispatch(action);
      if (action.type === 'signOut' || action.type === 'deleteAccount') clearStartCache();
      if (before.mode !== 'live' || !before.currentUserId) return Promise.resolve(true);
      const gen = generation.current;
      const done = queue.current.then(async () => {
        try {
          const changedId = await persist(action, before);
          if (changedId) {
            const { challenge, users } = await remote.loadChallenge(changedId, before.currentUserId);
            localDispatch({ type: 'challengeLoaded', id: changedId, challenge, users });
          }
          return true;
        } catch (error) {
          // Inzwischen abgemeldet: nichts mehr anzeigen und nicht die Daten der vorigen Person zurückholen
          if (gen !== generation.current) return false;
          Alert.alert('Hat nicht geklappt', remote.errorText(error));
          await load(before.currentUserId);
          return false;
        }
      });
      queue.current = done.then(() => undefined);
      return done;
    },
    [load, localDispatch],
  );

  const createChallenge = useCallback(async (draft: remote.NewChallenge) => {
    const s = stateRef.current;
    if (s.mode === 'demo') {
      const challenge: Challenge = {
        id: `challenge-${Date.now()}`,
        type: draft.type ?? 'individual',
        title: draft.title,
        text: draft.text,
        authorId: s.currentUserId,
        location: draft.location,
        bountyAmount: draft.bountyAmount,
        edensteine: draft.edensteine,
        maxParticipants: draft.participation?.max,
        joinMode: draft.participation?.mode,
        status: 'open',
        image: draft.photo,
        extraImages: draft.extras,
        likedByMe: false,
        comments: [],
        createdAt: new Date().toISOString(),
        deadline: draft.deadline,
        coords: draft.coords,
        private: draft.private,
        localOnly: draft.localOnly,
        photoText: draft.photoText ?? undefined,
        pages: draft.pages?.length ? remote.cleanPages(draft.pages) : undefined,
        sheetFont: draft.sheetFont,
      };
      localDispatch({ type: 'create', challenge });
      return challenge.id;
    }
    try {
      const challenge = await remote.createChallenge(s.currentUserId, draft);
      localDispatch({ type: 'create', challenge });
      // Post aus einer Erinnerung: Markierung setzen (data/reminders.ts)
      void attachRoutinePost(challenge.id);
      // Post aus einem Schaufenster (data/showcase.ts)
      void attachShowcasePost(challenge.id);
      return challenge.id;
    } catch (error) {
      throw new remote.ShownError(remote.errorText(error));
    }
  }, [localDispatch]);

  const saveDraft = useCallback(async (id: string | undefined, draft: remote.DraftInput) => {
    const s = stateRef.current;
    if (s.mode === 'demo') {
      const existing = s.challenges.find((c) => c.id === id);
      const challenge: Challenge = {
        id: id ?? `draft-${Date.now()}`,
        type: draft.type ?? 'individual',
        title: draft.title.trim(),
        text: draft.text.trim(),
        authorId: s.currentUserId,
        location: draft.location.trim(),
        bountyAmount: draft.bountyAmount,
        edensteine: draft.edensteine,
        maxParticipants: draft.participation?.max ?? existing?.maxParticipants,
        joinMode: draft.participation?.mode ?? existing?.joinMode,
        status: 'draft',
        image: draft.photo ?? existing?.image,
        extraImages: draft.extras ?? existing?.extraImages,
        likedByMe: false,
        comments: [],
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        deadline: '',
        coords: draft.coords ?? existing?.coords,
        private: existing ? existing.private : draft.private,
        groupId: existing ? existing.groupId : draft.groupId,
        photoText: draft.photoText === undefined ? existing?.photoText : (draft.photoText ?? undefined),
        pages: draft.pages?.length ? remote.cleanPages(draft.pages) : existing?.pages,
        sheetFont: draft.sheetFont ?? existing?.sheetFont,
      };
      localDispatch(existing ? { type: 'challengeLoaded', id: challenge.id, challenge, users: [] } : { type: 'create', challenge });
      return challenge;
    }
    try {
      const challenge = await remote.saveDraft(s.currentUserId, id, draft);
      localDispatch(id ? { type: 'challengeLoaded', id, challenge, users: [] } : { type: 'create', challenge });
      return challenge;
    } catch (error) {
      throw new remote.ShownError(remote.errorText(error));
    }
  }, [localDispatch]);

  const publishDraft = useCallback(
    async (id: string, draft: remote.DraftInput, deadline: string) => {
      await saveDraft(id, draft);
      const s = stateRef.current;
      if (s.mode === 'demo') {
        const existing = s.challenges.find((c) => c.id === id);
        const challenge: Challenge = {
          id,
          type: draft.type ?? 'individual',
          title: draft.title.trim(),
          text: draft.text.trim(),
          authorId: s.currentUserId,
          location: draft.location.trim(),
          bountyAmount: draft.bountyAmount,
          edensteine: draft.edensteine,
          maxParticipants: draft.participation?.max ?? existing?.maxParticipants,
          joinMode: draft.participation?.mode ?? existing?.joinMode,
          status: 'open',
          image: draft.photo ?? existing?.image,
          extraImages: draft.extras ?? existing?.extraImages,
          likedByMe: false,
          comments: [],
          createdAt: new Date().toISOString(),
          deadline,
          coords: draft.coords ?? existing?.coords,
          private: existing?.private,
          groupId: existing?.groupId,
          photoText: draft.photoText === undefined ? existing?.photoText : (draft.photoText ?? undefined),
          pages: draft.pages?.length ? remote.cleanPages(draft.pages) : existing?.pages,
        sheetFont: draft.sheetFont ?? existing?.sheetFont,
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
        throw new remote.ShownError(remote.errorText(error));
      }
    },
    [saveDraft, localDispatch],
  );

  const groupApi = useMemo<GroupApi>(() => {
    // Live: Funktion in Supabase, danach alles neu laden. Demo: nur lokal.
    const live = async <T,>(run: () => Promise<T>): Promise<T> => {
      try {
        const result = await run();
        await load(stateRef.current.currentUserId);
        return result;
      } catch (error) {
        throw new remote.ShownError(remote.errorText(error));
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
          showLeaderboard: true,
          createdAt: new Date().toISOString(),
          members: [{ userId: me(), role: 'founder', joinedAt: new Date().toISOString() }],
        };
        setGroups((groups) => [...groups, group]);
        return group.id;
      },
      join: async (code) => {
        if (!isDemo()) return live(() => remote.groupActions.join(code));
        const group = stateRef.current.groups.find((g) => g.inviteCode === code.trim().toUpperCase());
        if (!group) throw new Error('Diesen Passcode gibt es nicht. Prüfe ihn noch einmal.');
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
      setLeaderboard: async (groupId, show) => {
        if (!isDemo()) return live(() => remote.groupActions.setLeaderboard(groupId, show));
        setGroups((groups) => groups.map((g) => (g.id === groupId ? { ...g, showLeaderboard: show } : g)));
      },
      setMotto: async (groupId, motto) => {
        if (!isDemo()) return live(() => remote.groupActions.setMotto(groupId, motto));
        setGroups((groups) => groups.map((g) => (g.id === groupId ? { ...g, motto: motto.trim() || undefined } : g)));
      },
      createTask: async (task) => {
        const s = stateRef.current;
        if (!isDemo()) {
          try {
            const challenge = await remote.createGroupTask(s.currentUserId, task);
            localDispatch({ type: 'create', challenge });
            return challenge.id;
          } catch (error) {
            throw new remote.ShownError(remote.errorText(error));
          }
        }
        const challenge: Challenge = {
          id: `task-${Date.now()}`,
          type: task.type ?? 'individual',
          groupId: task.groupId,
          edensteine: task.type === 'photo' ? undefined : task.edensteine,
          maxParticipants: task.type === 'photo' ? undefined : task.participation?.max,
          joinMode: task.type === 'photo' ? undefined : task.participation?.mode,
          extraImages: task.type === 'photo' ? task.extras : undefined,
          title: task.title.trim(),
          text: task.text.trim(),
          authorId: s.currentUserId,
          location: task.location?.trim() ?? '',
          coords: task.coords,
          status: 'open',
          image: task.photo,
          pages: task.type === 'photo' && task.pages?.length ? remote.cleanPages(task.pages) : undefined,
          sheetFont: task.sheetFont,
          likedByMe: false,
          comments: [],
          createdAt: new Date().toISOString(),
          deadline: task.deadline,
        };
        localDispatch({ type: 'create', challenge });
        return challenge.id;
      },
    };
  }, [load, localDispatch]);

  const unblock = useCallback(
    async (userId: string) => {
      const s = stateRef.current;
      if (s.mode === 'demo') {
        // Demo: die Beispieldaten kommen zurück
        localDispatch({ type: 'useSampleData' });
        localDispatch({ type: 'setCurrentUser', userId: s.currentUserId });
        return;
      }
      try {
        await remote.unblockUser(userId);
      } catch (error) {
        throw new remote.ShownError(remote.errorText(error));
      }
      await load(s.currentUserId);
    },
    [load, localDispatch],
  );

  const beforeAfter = useMemo<BeforeAfterApi>(() => {
    const isDemo = () => stateRef.current.mode === 'demo';
    const find = (id: string) => stateRef.current.challenges.find((c) => c.id === id);
    const put = (challenge: Challenge) => localDispatch({ type: 'challengeLoaded', id: challenge.id, challenge, users: [] });
    // Live: Funktion in Supabase, danach den Beitrag neu laden
    const live = async (id: string, run: () => Promise<unknown>) => {
      const s = stateRef.current;
      try {
        await run();
        const { challenge, users } = await remote.loadChallenge(id, s.currentUserId);
        localDispatch({ type: 'challengeLoaded', id, challenge, users });
      } catch (error) {
        throw new remote.ShownError(remote.errorText(error));
      }
    };
    const editDemo = (c: Challenge, edit: remote.BeforeAfterEdit): Challenge => ({
      ...c,
      title: edit.title === undefined ? c.title : edit.title.trim().slice(0, 60),
      beforeText: edit.beforeText === undefined ? c.beforeText : edit.beforeText.trim() || undefined,
      afterText: edit.afterText === undefined ? c.afterText : edit.afterText.trim() || undefined,
      imageBefore: edit.beforePhoto ?? c.imageBefore,
      imageAfter: edit.afterPhoto ?? c.imageAfter,
      image: edit.beforePhoto ?? c.imageBefore,
    });
    return {
      start: async (input) => {
        const s = stateRef.current;
        if (!isDemo()) {
          try {
            const challenge = await remote.startBeforeAfter(s.currentUserId, input);
            localDispatch({ type: 'create', challenge });
            void attachRoutinePost(challenge.id);
            void attachShowcasePost(challenge.id);
            return challenge.id;
          } catch (error) {
            throw new remote.ShownError(remote.errorText(error));
          }
        }
        const challenge: Challenge = {
          id: `vorher-nachher-${Date.now()}`,
          type: 'before_after',
          title: input.title.trim().slice(0, 60),
          beforeText: input.beforeText.trim() || undefined,
          authorId: s.currentUserId,
          groupId: input.groupId,
          private: !input.groupId && input.private ? true : undefined,
          localOnly: !input.groupId && !input.private && input.localOnly ? true : undefined,
          location: '',
          // Gleich offen, die App schließt nach 7 Tagen ab (Daria, 2026-11-09)
          status: 'open',
          text: beforeAfterBody({ beforeText: input.beforeText.trim() || undefined }),
          image: input.photo,
          imageBefore: input.photo,
          likedByMe: false,
          comments: [],
          createdAt: new Date().toISOString(),
          deadline: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
        };
        localDispatch({ type: 'create', challenge });
        return challenge.id;
      },
      startTimer: async (id) => {
        if (!isDemo()) return live(id, () => remote.startBeforeAfterTimer(id));
        const c = find(id);
        if (c && !c.timerStartedAt) {
          const start = new Date();
          put({ ...c, timerStartedAt: start.toISOString(), ...(c.status === 'open' ? { deadline: new Date(start.getTime() + remote.BEFORE_AFTER_MAX_MS).toISOString() } : null) });
        }
      },
      stopTimer: async (id) => {
        if (!isDemo()) return live(id, () => remote.stopBeforeAfterTimer(id));
        const c = find(id);
        if (c)
          put({
            ...c,
            timerStartedAt: undefined,
            ...(c.status === 'open' ? { deadline: new Date(Math.max(Date.parse(c.createdAt) + 7 * 24 * 3600_000, Date.now())).toISOString() } : null),
          });
      },
      update: async (id, edit) => {
        if (!isDemo()) return live(id, () => remote.updateBeforeAfter(stateRef.current.currentUserId, id, edit));
        const c = find(id);
        if (c) put(editDemo(c, edit));
      },
      finish: async (id, edit) => {
        if (!isDemo()) {
          return live(id, async () => {
            if (edit) await remote.updateBeforeAfter(stateRef.current.currentUserId, id, edit);
            await remote.finishBeforeAfter(id);
          });
        }
        const found = find(id);
        if (!found) return;
        const c = edit ? editDemo(found, edit) : found;
        const now = Date.now();
        const end = c.timerStartedAt ? Math.min(now, Date.parse(c.timerStartedAt) + remote.BEFORE_AFTER_MAX_MS) : now;
        put({
          ...c,
          status: 'open',
          title: c.title.trim() || 'Me-Challenge',
          text: beforeAfterBody(c),
          image: c.imageAfter ?? c.imageBefore,
          finishedAt: new Date(end).toISOString(),
          // Offene Me-Challenge behält ihre Zeit, ein alter Entwurf bekommt die des Postens
          createdAt: c.status === 'draft' ? new Date(now).toISOString() : c.createdAt,
          deadline: new Date(now).toISOString(),
        });
      },
    };
  }, [localDispatch]);

  const value = useMemo(
    () => ({ ...state, dispatch, load, createChallenge, saveDraft, publishDraft, groupApi, unblock, beforeAfter }),
    [state, dispatch, load, createChallenge, saveDraft, publishDraft, groupApi, unblock, beforeAfter],
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

