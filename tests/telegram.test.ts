import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  alreadyGone,
  chatMemberChange,
  startCode,
  TELEGRAM_CAPTION_MAX,
  telegramLink,
  telegramText,
} from '../supabase/functions/weiterposten/telegram';

describe('Telegram beim Weiterposten', () => {
  const link = 'https://kiezcoins.de/c/abc?von=telegram';

  it('Titel, Text und Link', () => {
    assert.equal(telegramText('Flohmarkt', 'Samstag im Hof', link, TELEGRAM_CAPTION_MAX), `Flohmarkt\n\nSamstag im Hof\n\n${link}`);
    assert.equal(telegramText('', '', link, TELEGRAM_CAPTION_MAX), link);
  });

  it('kürzt den Text und behält den Link vollständig', () => {
    const text = telegramText('Titel', 'x'.repeat(2000), link, TELEGRAM_CAPTION_MAX);
    assert.equal(text.length, TELEGRAM_CAPTION_MAX);
    assert.ok(text.endsWith(`…\n\n${link}`));
  });

  it('Link: öffentlicher Kanal, sonst der Chat mit dem Bot', () => {
    const own = { ref: { chat: 42, message: 7 }, username: null };
    const channel = { ref: { chat: -100, message: 9 }, username: 'hofladen' };
    assert.equal(telegramLink([own, channel], 'KiezCoinsBot'), 'https://t.me/hofladen/9');
    assert.equal(telegramLink([own], 'KiezCoinsBot'), 'https://t.me/KiezCoinsBot');
  });

  it('liest den Code aus /start', () => {
    assert.equal(startCode('/start 0f3a9c'), '0f3a9c');
    assert.equal(startCode('/start@KiezCoinsBot abc_D-1'), 'abc_D-1');
    assert.equal(startCode('/start'), null);
    assert.equal(startCode('/start a b'), null);
    assert.equal(startCode(undefined), null);
  });

  it('Rolle des Bots in Kanälen und Gruppen', () => {
    assert.equal(chatMemberChange('channel', { status: 'administrator', can_post_messages: true }), 'add');
    assert.equal(chatMemberChange('channel', { status: 'administrator', can_post_messages: false }), 'remove');
    assert.equal(chatMemberChange('channel', { status: 'left' }), 'remove');
    assert.equal(chatMemberChange('supergroup', { status: 'member' }), 'add');
    assert.equal(chatMemberChange('group', { status: 'kicked' }), 'remove');
    assert.equal(chatMemberChange('private', { status: 'member' }), 'ignore');
  });

  it('schon gelöschte Nachrichten zählen als gelöscht', () => {
    assert.ok(alreadyGone("telegram 400 Bad Request: message to delete not found"));
    assert.ok(!alreadyGone('telegram 429 Too Many Requests'));
  });
});
