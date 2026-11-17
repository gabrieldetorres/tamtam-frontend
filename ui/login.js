/* ui/login.js - login, forgot password, set a new password.
   There is no "create account": the admin is created by hand in Supabase. */

import { $, root, say, onClick, onSubmit } from './kit.js';
import { esc } from '../business/format.js';
import { signIn, sendReset, setPassword, signOutEverywhere } from '../data/auth.js';
import { go } from './router.js';

export function login() {
    root.innerHTML = `
        <form class="box" data-submit="login" novalidate>
            <h1>🧋 ${esc(window.APP_CONFIG.STALL)}</h1>
            <input id="em" type="email" placeholder="Email" autocomplete="username">
            <input id="pw" type="password" placeholder="Password" autocomplete="current-password">
            <button id="go">Log in</button>
            <p><button type="button" class="sec" data-click="forgot">Forgot password?</button></p>
        </form>`;
}

onSubmit('login', async () => {
    const email = $('#em').value.trim();
    const password = $('#pw').value;

    if (!email || !password) return say('Enter your email and password.');

    $('#go').disabled = true;
    const { error } = await signIn(email, password);
    $('#go').disabled = false;

    if (error) return say(error.message);

    go('pos');
});

onClick('forgot', async () => {
    const email = $('#em').value.trim();
    if (!email) return say('Enter your email first.');

    await sendReset(email);
    say('If that email matches the admin account, a reset link was sent.');
});

export function recovery() {
    root.innerHTML = `
        <form class="box" data-submit="recovery" novalidate>
            <h1>New password</h1>
            <input id="p1" type="password" placeholder="New password (8+)" autocomplete="new-password">
            <input id="p2" type="password" placeholder="Repeat password" autocomplete="new-password">
            <button id="go">Save password</button>
        </form>`;
}

onSubmit('recovery', async () => {
    const a = $('#p1').value;

    if (a.length < 8 || a !== $('#p2').value) {
        return say('Passwords must match and be 8+ characters.');
    }

    const { error } = await setPassword(a);
    if (error) return say(error.message);

    await signOutEverywhere(); // sign out every device after a password change
    location.hash = '';
    login();
});
