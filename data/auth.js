/* data/auth.js - Supabase is used ONLY for login, logout and password reset.
   Everything else goes through the Laravel API (data/api.js). */

let client;

function sb() {
    if (!client) {
        const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = window.APP_CONFIG;
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    }
    return client;
}

export async function getSession() {
    const { data } = await sb().auth.getSession(); // also refreshes an expired token
    return data.session;
}

export async function getToken() {
    return (await getSession())?.access_token ?? null;
}

export const signIn = (email, password) => sb().auth.signInWithPassword({ email, password });

export const signOut = () => sb().auth.signOut();

export const signOutEverywhere = () => sb().auth.signOut({ scope: 'global' });

export const sendReset = email =>
    sb().auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });

export const setPassword = password => sb().auth.updateUser({ password });

export function onAuthChange(callback) {
    sb().auth.onAuthStateChange(event => callback(event));
}
