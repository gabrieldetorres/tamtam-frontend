/* ui/kit.js - small UI toolkit: DOM helpers, dialogs, click/input handling, error display.
   No inline onclick="..." anywhere: elements carry data-click="name" and handlers are registered here.
   That keeps the app compatible with a strict Content-Security-Policy. */

import { esc } from '../business/format.js';
import { hooks } from '../data/api.js';

export const root = document.getElementById('app');
export const $ = s => document.querySelector(s);

// "waking up the server" banner (free servers sleep after 15 minutes without visitors)
hooks.slow = () => {
    const b = $('#busy');
    b.textContent = 'Waking up the server… the first request after a quiet spell can take up to a minute.';
    b.hidden = false;
};
hooks.done = () => {
    $('#busy').hidden = true;
};

/* ---- event handlers registered by name ---- */
const registry = { click: {}, input: {}, change: {}, submit: {} };

export const onClick = (name, fn) => { registry.click[name] = fn; };
export const onInput = (name, fn) => { registry.input[name] = fn; };
export const onChange = (name, fn) => { registry.change[name] = fn; };
export const onSubmit = (name, fn) => { registry.submit[name] = fn; };

for (const type of Object.keys(registry)) {
    document.addEventListener(type, e => {
        const el = e.target instanceof Element ? e.target.closest(`[data-${type}]`) : null;
        if (!el || el.disabled) return;

        if (type === 'submit') e.preventDefault();

        const fn = registry[type][el.dataset[type]];
        if (fn) Promise.resolve().then(() => fn(el, e)).catch(showError);
    });
}

/* ---- dialogs (replace alert / prompt / confirm) ---- */
export function dlg(title, fields = [], o = {}) {
    const ok = o.ok || 'OK';
    const cancel = o.cancel !== false;

    return new Promise(resolve => {
        const ov = document.createElement('div');
        ov.className = 'ov';

        ov.innerHTML = `
            <form class="md">
                <h3>${esc(title)}</h3>
                ${fields.map((f, i) => `
                    <label>${esc(f.label)}
                        ${f.type === 'select'
                            ? `<select name="f${i}">${f.options.map(x => `
                                <option value="${esc(x.v)}" ${x.v == f.value ? 'selected' : ''}>${esc(x.t)}</option>`).join('')}
                              </select>`
                            : `<input name="f${i}" type="${f.type || 'text'}"
                                ${f.type === 'number' ? 'step="any" inputmode="decimal"' : ''}
                                value="${esc(f.value ?? '')}" ${f.req ? 'required' : ''}>`}
                    </label>`).join('')}
                <div class="row">
                    ${cancel ? '<button type="button" class="sec" id="dx">Cancel</button>' : ''}
                    <button id="dok">${esc(ok)}</button>
                </div>
            </form>`;

        document.body.appendChild(ov);

        const form = ov.querySelector('form');
        const close = v => { ov.remove(); resolve(v); };

        form.onsubmit = e => {
            e.preventDefault();
            close(fields.map((_, i) => form['f' + i].value));
        };

        if (cancel) {
            ov.querySelector('#dx').onclick = () => close(null);
            ov.onkeydown = e => { if (e.key === 'Escape') close(null); };
        }

        (form.querySelector('input,select') || form.querySelector('#dok')).focus();
    });
}

export const say = message => dlg(message, [], { cancel: false }).then(() => {});
export const sure = message => dlg(message, [], { ok: 'Yes' }).then(v => v !== null);

// Shows an API error to the cashier. A 401 is handled by the login screen instead.
export function showError(err) {
    if (err?.status === 401) return;
    return say(err?.message || 'Something went wrong. Please try again.');
}
