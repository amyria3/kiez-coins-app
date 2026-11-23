import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { printLink } from '../src/lib/printLink';

describe('Links auf der druckbaren Visitenkarte', () => {
  it('lässt weg, was man nicht abtippen muss', () => {
    assert.equal(printLink('https://www.arkadieff.art/'), 'arkadieff.art');
    assert.equal(printLink('https://arkadieff.webflow.io/'), 'arkadieff.webflow.io');
    assert.equal(printLink('http://example.org/shop?utm_source=x#oben'), 'example.org/shop');
    assert.equal(printLink(' https://www.linkedin.com/in/maria-arkadieff-4994033b0/ '), 'linkedin.com/in/maria-arkadieff-4994033b0');
  });
});
