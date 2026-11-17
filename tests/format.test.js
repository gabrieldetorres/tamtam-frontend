import test from 'node:test';
import assert from 'node:assert/strict';
import { M, esc, iso, addDays, newRef } from '../business/format.js';

test('money is shown with the peso sign and two decimals', () => {
    assert.equal(M('45'), '₱45.00');
    assert.equal(M(null), '₱0.00');
});

test('esc makes user text safe for HTML', () => {
    assert.equal(esc(`<img src=x onerror="a('b')">`), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;');
    assert.equal(esc(undefined), '');
});

test('iso gives a local YYYY-MM-DD date and addDays moves it', () => {
    assert.equal(iso(new Date(2026, 10, 16)), '2026-11-16');
    assert.equal(iso(addDays(new Date(2026, 10, 16), -6)), '2026-11-10');
});

test('every checkout gets a different reference', () => {
    assert.notEqual(newRef(), newRef());
});
