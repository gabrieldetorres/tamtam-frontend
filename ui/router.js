/* ui/router.js - the screen registry and the bottom navigation bar */

import { $, root, onClick } from './kit.js';
import { esc } from '../business/format.js';
import { signOut } from '../data/auth.js';

const tabs = [
    ['pos', '🧋', 'Order'],
    ['products', '📋', 'Menu'],
    ['customers', '👤', 'Clients'],
    ['stock', '📦', 'Stock'],
    ['reports', '📊', 'Reports'],
    ['audit', '🔍', 'Log'],
];

const views = {};
let current = 'pos';

// each screen file registers itself: register('pos', async () => {...})
export const register = (name, fn) => { views[name] = fn; };

export async function go(name, arg) {
    current = name;

    root.innerHTML = `
        <main id="m"><p>Loading…</p></main>
        <nav>
            ${tabs.map(t => `
                <button class="${t[0] === name ? 'on' : ''}" data-click="nav" data-v="${t[0]}">
                    ${t[1]}<small>${t[2]}</small>
                </button>`).join('')}
            <button data-click="exit">🚪<small>Exit</small></button>
        </nav>`;

    try {
        await views[name](arg);
    } catch (err) {
        if (err?.status === 401) return;
        $('#m').innerHTML = `
            <h3>${esc(err?.message || 'Something went wrong.')}</h3>
            <button data-click="retry">Try again</button>`;
    }
}

onClick('nav', el => go(el.dataset.v));
onClick('retry', () => go(current));
onClick('exit', () => signOut());
