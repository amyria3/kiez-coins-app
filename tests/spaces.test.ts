import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { spaceOfRoute } from '../src/theme/spaces';

describe('Bereich jeder Seite (RouteSpace)', () => {
  it('Konto, Funktionen, Schaufenster verwalten, Moderation, Texte: Functional', () => {
    for (const name of ['account/index', 'account/features', 'schaufenster/index', 'schaufenster/[id]/bearbeiten', 'moderation', 'texts']) {
      assert.equal(spaceOfRoute(name), 'functional', name);
    }
    assert.equal(spaceOfRoute('account/friends'), 'public');
  });

  it('Öffentliches Schaufenster und seine Unterseiten: Schaufenster', () => {
    for (const name of ['schaufenster/[id]/index', 'schaufenster/[id]/post', 'schaufenster/[id]/termin', 'schaufenster/[id]/visitenkarte', 'schaufenster/beitreten']) {
      assert.equal(spaceOfRoute(name), 'showcase', name);
    }
  });

  it('Routine: Me & Myself', () => {
    for (const name of ['routine/index', 'routine/new', 'routine/[id]', 'routine/bearbeiten']) assert.equal(spaceOfRoute(name), 'me', name);
  });

  it('Seiten zu einem Post folgen dem Post', () => {
    assert.equal(spaceOfRoute('challenge/[id]/index', { private: true }), 'me');
    assert.equal(spaceOfRoute('challenge/[id]/edit', { groupId: 'g1' }), 'group');
    assert.equal(spaceOfRoute('before-after/[id]', {}), 'public');
  });

  it('Alles andere: Friendship', () => {
    for (const name of ['feed', 'chat/index', 'me', 'manage']) assert.equal(spaceOfRoute(name), 'public', name);
    assert.equal(spaceOfRoute('groups/[id]/index'), 'group');
  });
});
