import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { cleanPaymentLinks, isPaymentUrl, paymentLinkProblem, PAYMENT_LINKS_MAX } from '../src/data/paymentLinks.mjs';

describe('Zahlungslinks im Schaufenster', () => {
  it('nimmt nur https-Links', () => {
    assert.equal(isPaymentUrl('https://buy.stripe.com/test_123'), true);
    assert.equal(isPaymentUrl('https://paypal.me/cafekiezliebe/24'), true);
    assert.equal(isPaymentUrl('http://paypal.me/x'), false);
    assert.equal(isPaymentUrl('javascript:alert(1)'), false);
    assert.equal(isPaymentUrl(''), false);
  });

  it('räumt die Liste auf', () => {
    const list = cleanPaymentLinks([
      { title: '  Frühstück für zwei ', amount: ' 24 € ', url: ' https://buy.stripe.com/abc ' },
      { title: 'Ohne Link', url: '' },
      { title: '', url: 'https://pay.sumup.com/b2c/x' },
      { title: 'Spende', url: 'https://paypal.me/verein' },
      null,
    ]);
    assert.deepEqual(list, [
      { title: 'Frühstück für zwei', amount: '24 €', url: 'https://buy.stripe.com/abc' },
      { title: 'Spende', url: 'https://paypal.me/verein' },
    ]);
    assert.deepEqual(cleanPaymentLinks('kaputt'), []);
    const many = Array.from({ length: 15 }, (_, i) => ({ title: `T${i}`, url: `https://paypal.me/x${i}` }));
    assert.equal(cleanPaymentLinks(many).length, PAYMENT_LINKS_MAX);
  });

  it('meldet Fehler im Formular, leere Zeilen nicht', () => {
    assert.equal(paymentLinkProblem({}), null);
    assert.equal(paymentLinkProblem({ title: 'Gutschein', url: 'buy.stripe.com/x' }), 'url');
    assert.equal(paymentLinkProblem({ url: 'https://buy.stripe.com/x' }), 'title');
    assert.equal(paymentLinkProblem({ title: 'Gutschein', url: 'https://buy.stripe.com/x' }), null);
  });
});
