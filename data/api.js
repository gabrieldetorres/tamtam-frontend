/* data/api.js - the ONLY file that talks to the Laravel API. */

import { getToken, signOut } from './auth.js';

// The UI plugs into these to show a "waking up the server" banner.
export const hooks = { slow() {}, done() {} };

export class ApiError extends Error {
    constructor(message, status = 0, errors = null) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function makeUrl(path, query) {
    const url = new URL(window.APP_CONFIG.API_URL + path);
    Object.entries(query || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
    return url;
}

// Reads (GET) are retried once if the free server is still waking up.
async function fetchWithRetry(url, init, canRetry) {
    for (let attempt = 0; ; attempt++) {
        try {
            const res = await fetch(url, init);
            if (canRetry && attempt === 0 && [502, 503, 504].includes(res.status)) {
                await sleep(3000);
                continue;
            }
            return res;
        } catch {
            if (canRetry && attempt === 0) {
                await sleep(3000);
                continue;
            }
            throw new ApiError('Cannot reach the server. Check your internet connection and try again.', 0);
        }
    }
}

async function send(method, path, { query, body } = {}) {
    const token = await getToken();
    if (!token) throw new ApiError('Please log in again.', 401);

    const init = { method, headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } };
    if (body !== undefined) {
        init.headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(body);
    }

    const slow = setTimeout(() => hooks.slow(), 3000);
    let res;
    try {
        res = await fetchWithRetry(makeUrl(path, query), init, method === 'GET');
    } finally {
        clearTimeout(slow);
        hooks.done();
    }

    if (res.status === 401) {
        await signOut();
        throw new ApiError('Your session expired. Please log in again.', 401);
    }

    return res;
}

function toError(status, data) {
    const first = data?.errors ? Object.values(data.errors).flat()[0] : null;
    return new ApiError(first || data?.message || `Server error (${status}). Please try again.`, status, data?.errors || null);
}

async function json(method, path, options) {
    const res = await send(method, path, options);
    if (res.status === 204) return null;

    const data = await res.json().catch(() => null);
    if (!res.ok) throw toError(res.status, data);

    return data && 'data' in data ? data.data : data;
}

export const api = {
    get: (path, query) => json('GET', path, { query }),
    post: (path, body) => json('POST', path, { body }),
    put: (path, body) => json('PUT', path, { body }),
    patch: (path, body) => json('PATCH', path, { body }),
    del: path => json('DELETE', path),
};

// Saves a file from the API (e.g. the CSV). A plain link cannot send the login token.
export async function download(path, query, filename) {
    const res = await send('GET', path, { query });

    if (!res.ok) {
        throw toError(res.status, await res.json().catch(() => null));
    }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(await res.blob());
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
