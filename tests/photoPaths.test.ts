import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { bucketOf, isPrivateAudience, isPrivatePath, newPhotoPath, otherPhotoName } from '../src/data/photoPaths';

const ME = '0b6f9a2e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';

describe('Fotos in zwei Speichern', () => {
  it('erkennt private Fotos am Dateinamen', () => {
    assert.equal(isPrivatePath(`${ME}/p_1731700000000-abc123.jpg`), true);
    assert.equal(isPrivatePath(`${ME}/1731700000000-abc123.jpg`), false);
    assert.equal(bucketOf(`${ME}/p_1.jpg`), 'photos-private');
    assert.equal(bucketOf(`${ME}/1.jpg`), 'photos');
  });

  it('neue Dateinamen liegen im eigenen Ordner und passen zur Prüfung der Kommentarbilder', () => {
    for (const isPrivate of [true, false]) {
      const path = newPhotoPath(ME, isPrivate, 1731700000000);
      assert.match(path, /^[0-9a-f-]{36}\/[^/]+$/);
      assert.equal(path.startsWith(`${ME}/`), true);
      assert.equal(isPrivatePath(path), isPrivate);
    }
  });

  it('wechselt den Speicher hin und zurück', () => {
    const open = `${ME}/1731700000000-abc123.jpg`;
    assert.equal(otherPhotoName(open), `${ME}/p_1731700000000-abc123.jpg`);
    assert.equal(otherPhotoName(otherPhotoName(open)), open);
  });

  it('Privat und Gruppen sind privat, Kiez und Überall öffentlich', () => {
    assert.equal(isPrivateAudience({ private: true }), true);
    assert.equal(isPrivateAudience({ groupId: 'g1' }), true);
    assert.equal(isPrivateAudience({}), false);
  });
});
