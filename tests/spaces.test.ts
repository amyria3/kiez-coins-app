import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { spaceOfRoute } from '../src/theme/spaces';

describe('Bereich jeder Seite (RouteSpace)', () => {
  it('Konto, Funktionen, Moderation, Texte: Functional', () => {
    for (const name of ['account/index', 'account/features', 'moderation', 'texts']) {
      assert.equal(spaceOfRoute(name), 'functional', name);
    }
    assert.equal(spaceOfRoute('account/friends'), 'public');
  });

  it('Alle Schaufenster-Seiten, auch Verwalten und Bearbeiten: Schaufenster', () => {
    for (const name of ['schaufenster/index', 'schaufenster/[id]/bearbeiten', 'schaufenster/[id]/index', 'schaufenster/[id]/post', 'schaufenster/[id]/termin', 'schaufenster/[id]/visitenkarte', 'schaufenster/[id]/druck', 'schaufenster/[id]/einstellungen', 'schaufenster/beitreten', 's/[slug]/visitenkarte']) {
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
