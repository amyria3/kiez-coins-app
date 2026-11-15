import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import type { User } from '../src/data/types';
import { parseInline, parseRich, toggleBullets, wrapSelection } from '../src/data/richText';
import { activeMention, insertMention, mentionSuggestions, splitMentions } from '../src/lib/mentions';

describe('Formatierbarer Text', () => {
  it('fett und kursiv', () => {
    assert.deepEqual(parseInline('Ein **fetter** und *kursiver* Text'), [
      { text: 'Ein ' },
      { text: 'fetter', bold: true },
      { text: ' und ' },
      { text: 'kursiver', italic: true },
      { text: ' Text' },
    ]);
  });
  it('Absätze und Aufzählungen', () => {
    const blocks = parseRich('Hallo\nWelt\n\n- eins\n- zwei');
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].kind, 'p');
    assert.equal(blocks[1].kind, 'ul');
    assert.equal(blocks[1].kind === 'ul' && blocks[1].items.length, 2);
  });
  it('Auswahl auszeichnen, ohne Auswahl ein Beispiel', () => {
    assert.equal(wrapSelection('Hallo Welt', { start: 6, end: 10 }, '**', 'fett'), 'Hallo **Welt**');
    assert.equal(wrapSelection('Hallo ', { start: 6, end: 6 }, '*', 'kursiv'), 'Hallo *kursiv*');
  });
  it('Aufzählung an und wieder aus', () => {
    const on = toggleBullets('eins\nzwei', { start: 0, end: 9 });
    assert.equal(on, '- eins\n- zwei');
    assert.equal(toggleBullets(on, { start: 0, end: on.length }), 'eins\nzwei');
  });
});

describe('@-Namen', () => {
  const users = [{ id: '1', name: 'Simon the Cat' }, { id: '2', name: 'Sina' }, { id: '3', name: 'Bob' }] as User[];
  it('laufende Erwähnung vor dem Cursor', () => {
    assert.deepEqual(activeMention('Hallo @Si', 9), { start: 6, query: 'Si' });
    assert.equal(activeMention('mail@si', 7), null);
    assert.equal(activeMention('@Si  weiter', 11), null);
  });
  it('Vorschläge nach Wortanfang', () => {
    assert.deepEqual(mentionSuggestions(users, 'si').map((u) => u.id), ['1', '2']);
    assert.deepEqual(mentionSuggestions(users, 'cat').map((u) => u.id), ['1']);
  });
  it('Name einsetzen, Cursor dahinter', () => {
    assert.deepEqual(insertMention('Hallo @Si', 6, 9, 'Sina'), { text: 'Hallo @Sina ', cursor: 12 });
  });
  it('lange Namen mit Leerzeichen gewinnen', () => {
    const parts = splitMentions('Danke @Simon the Cat!', users);
    assert.equal(parts.find((p) => p.user)?.user?.id, '1');
  });
});
