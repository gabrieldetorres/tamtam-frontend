import { $, onClick, onChange, dlg, say, sure } from './kit.js';
import { api } from '../data/api.js';
import { loadProducts } from '../business/catalog.js';
import { state, fillFromOrder } from '../business/cart.js';
import { M, esc, dateText } from '../business/format.js';
import { register, go } from './router.js';

let profile = null; // the customer profile on screen

// shared with the Order screen: asks for details and creates the customer
export async function addCustomerDialog(name = '') {
    const v = await dlg('Add customer', [
        { label: 'Customer name', value: name, req: 1 },
        { label: 'Contact number (optional)' },
    ], { ok: 'Save' });

    if (!v || !v[0].trim()) return null;

    return api.post('/customers', { name: v[0].trim(), contact: v[1].trim() || null });
}

register('customers', async () => list(''));

async function list(q) {
    const customers = await api.get('/customers', { search: q });

    $('#m').innerHTML = `
        <input id="q" placeholder="Search name or number" value="${esc(q)}" data-change="searchCustomers">
        <div class="row"><button data-click="addCustomer">Add customer</button></div>
        ${customers.map(c => `
            <p class="pick" data-click="openCustomer" data-id="${esc(c.id)}">
                ${esc(c.name)} <span>${esc(c.contact || '')}</span>
            </p>`).join('')}`;
}

onChange('searchCustomers', el => list(el.value));

onClick('addCustomer', async () => {
    const customer = await addCustomerDialog();
    if (!customer) return;

    state.customer = customer; // straight to the Order screen with this customer
    go('pos');
});

onClick('openCustomer', async el => {
    profile = await api.get(`/customers/${el.dataset.id}/profile`);
    drawProfile();
});

function drawProfile() {
    const { customer: c, stats: s, top_products: top, history } = profile;

    $('#m').innerHTML = `
        <h2>${esc(c.name)}</h2>
        <h3>${esc(c.contact || '')}</h3>

        <div class="g">
            <div><b>${s.orders}</b>Orders</div>
            <div><b>${M(s.total_spend)}</b>Total spend</div>
            <div><b>${s.last_order_at ? dateText(s.last_order_at) : '—'}</b>Last order</div>
        </div>

        <h3>Usually orders: ${top.map(x => esc(x.name) + ' ×' + x.qty).join(', ') || '—'}</h3>

        <div class="row">
            <button ${history[0] ? '' : 'disabled'} data-click="repeatOrder">Repeat last order</button>
            <button class="sec" data-click="archiveCustomer">Archive</button>
        </div>

        <h3>History</h3>
        ${history.map(o => `
            <p>
                <span>${dateText(o.created_at)}: ${o.items.map(i => i.qty + '× ' + esc(i.name)).join(', ')}</span>
                ${M(o.total)}
            </p>`).join('')}`;
}

onClick('repeatOrder', async () => {
    await loadProducts(); // fresh stock levels before deciding what can be repeated
    const skipped = fillFromOrder(profile.history[0].items);
    state.customer = profile.customer;

    await go('pos');

    if (skipped.length) say('Skipped or reduced (not enough stock): ' + skipped.join(', '));
});

onClick('archiveCustomer', async () => {
    if (!(await sure('Archive this customer?'))) return;

    await api.patch(`/customers/${profile.customer.id}/archive`);
    go('customers');
});
