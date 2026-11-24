export const M = n => '₱' + Number(n || 0).toFixed(2);

export const esc = s =>
    String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[c]));


export const iso = d =>
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

export const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
};

export const dateText = v => new Date(v).toLocaleDateString();
export const dateTimeText = v => new Date(v).toLocaleString();


export const newRef = () =>
    globalThis.crypto?.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(16).slice(2);
