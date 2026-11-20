/* ui/pos.js - Order screen: customer lookup, cart, void, payment, receipt (PDF).
   The browser only sends WHICH drinks and HOW MANY (+ cash given).
   The server works out prices, total, change and stock. */

import { $, onClick, onInput, say, sure, showError } from './kit.js';
import { api } from '../data/api.js';
import { loadProducts } from '../business/catalog.js';
import { state, canMake, servingsLeft, addToCart, changeQty, cartTotal, lineTotal, orderLines, clearOrder } from '../business/cart.js';
import { M, esc, newRef } from '../business/format.js';
import { register, go } from './router.js';
import { addCustomerDialog } from './customers.js';

let found = [];        // customer search results
let searchSeq = 0;     // ignores slow, out-of-date search answers
let searchTimer;
let checkoutRef = null; // one id per checkout attempt (prevents double orders on retry)
let lastReceipt = null;

register('pos', async () => {
    await loadProducts();
    drawPos();
});

/* ---------- order screen ---------- */

function drawPos() {
    $('#m').innerHTML = `
        <input id="cs" placeholder="Customer name (optional)" autocomplete="off"
               value="${esc(state.customer?.name || '')}" data-input="findCustomer">
        <small id="cinfo" class="hint"></small>
        <div id="cl"></div>

        <div class="pg" id="pg"></div>

        <h3>Order</h3>
        <div id="cart"></div>
        <h2 id="tot"></h2>

        <div class="row">
            <button class="sec" data-click="voidOrder">Void order</button>
            <button id="confirm" data-click="pay">Confirm</button>
        </div>`;

    drawCustomerInfo();
    drawGrid();
    drawCart();
}

// the grid and cart redraw on their own, so the customer box keeps focus and text
function drawGrid() {
    $('#pg').innerHTML = state.products.map(p => {
        const ok = canMake(p);
        const left = servingsLeft(p);
        const note = !ok ? ' (out)' : left <= 5 ? ` · ${left} left` : ''; // warn when a product is running low
        return `
            <button ${ok ? '' : 'disabled'} data-click="add" data-id="${esc(p.id)}">
                ${esc(p.name)}
                <small>${p.size ? esc(p.size) + ' · ' : ''}${M(p.price)}${note}</small>
            </button>`;
    }).join('') || '<p>Add products in Menu first.</p>';
}

function drawCart() {
    $('#cart').innerHTML = state.cart.map((line, k) => `
        <p>
            ${esc(line.p.name)} ${esc(line.p.size)}
            <span>
                <button class="sec" data-click="qty" data-k="${k}" data-d="-1">−</button>
                ${line.q}
                <button class="sec" data-click="qty" data-k="${k}" data-d="1">+</button>
                ${M(lineTotal(line))}
            </span>
        </p>`).join('') || '<p>Tap a drink to start.</p>';

    $('#tot').textContent = 'Total ' + M(cartTotal());
    $('#confirm').disabled = !state.cart.length;
}

function drawCustomerInfo() {
    const el = $('#cinfo');
    if (!el) return;

    const c = state.customer;
    el.textContent = c
        ? '✓ ' + c.name + (c.contact ? ' · ' + c.contact : '')
        : 'Walk-in (no customer attached)';
}

onClick('add', el => {
    addToCart(el.dataset.id);
    drawGrid();
    drawCart();
});

onClick('qty', el => {
    changeQty(Number(el.dataset.k), Number(el.dataset.d));
    drawGrid();
    drawCart();
});

/* ---------- customer lookup ---------- */

onInput('findCustomer', el => {
    const q = el.value.trim();

    // typing a different name unlinks the picked customer (so the order cannot go to the wrong person)
    if (state.customer && state.customer.name !== q) state.customer = null;
    drawCustomerInfo();

    clearTimeout(searchTimer);

    if (!q) {
        found = [];
        $('#cl').innerHTML = '';
        return;
    }

    const seq = ++searchSeq;
    searchTimer = setTimeout(async () => {
        try {
            const list = await api.get('/customers', { search: q });
            if (seq !== searchSeq) return;

            found = list.slice(0, 5);
            drawCustomerList(q);
        } catch (err) {
            showError(err);
        }
    }, 300);
});

function drawCustomerList(q) {
    $('#cl').innerHTML =
        found.map((c, i) => `
            <p class="pick" data-click="pickCustomer" data-i="${i}">
                ${esc(c.name)} <span>${esc(c.contact || '')}</span>
            </p>`).join('') +
        `<p class="pick" data-click="newCustomer" data-name="${esc(q)}">+ Add "${esc(q)}" as new customer</p>`;
}

onClick('pickCustomer', el => {
    state.customer = found[Number(el.dataset.i)];
    $('#cs').value = state.customer.name;
    $('#cl').innerHTML = '';
    drawCustomerInfo();
});

onClick('newCustomer', async el => {
    const customer = await addCustomerDialog(el.dataset.name);
    if (!customer) return;

    state.customer = customer;
    $('#cs').value = customer.name;
    $('#cl').innerHTML = '';
    drawCustomerInfo();
});

/* ---------- void ---------- */

onClick('voidOrder', async () => {
    if (!state.cart.length) {
        clearOrder();
        return drawPos();
    }

    if (!(await sure('Void this order? It will be logged.'))) return;

    await api.post('/orders/void', {
        client_ref: newRef(),
        customer_id: state.customer?.id ?? null,
        items: orderLines(),
    });

    clearOrder();
    drawPos();
});

/* ---------- payment ---------- */

onClick('pay', () => {
    checkoutRef = newRef(); // a new checkout; retrying THIS screen reuses the same id

    $('#m').innerHTML = `
        <h2>Total ${M(cartTotal())}</h2>
        ${state.cart.map(line => `
            <p>${line.q} × ${esc(line.p.name)} ${esc(line.p.size)}<span>${M(lineTotal(line))}</span></p>`).join('')}

        <input id="cash" type="number" inputmode="decimal" min="0" step="any"
               placeholder="Cash tendered" data-input="cash">
        <h2 id="ch">Change: —</h2>

        <div class="row">
            <button class="sec" data-click="back">Back</button>
            <button id="pb" disabled data-click="done">Mark as paid</button>
        </div>`;
});

onClick('back', drawPos);

onInput('cash', () => {
    const t = cartTotal();
    const raw = $('#cash').value;
    const v = Number(raw);
    const enough = raw !== '' && v >= t;

    $('#pb').disabled = !enough;
    $('#ch').textContent = enough ? 'Change: ' + M(v - t) : 'Change: —';
});

onClick('done', async el => {
    el.disabled = true;

    try {
        const order = await api.post('/orders', {
            client_ref: checkoutRef,
            customer_id: state.customer?.id ?? null,
            items: orderLines(),
            tendered: Number($('#cash').value),
        });

        showReceipt(order);
    } catch (err) {
        await showError(err);
        el.disabled = false;

        // 422 = the server refused (stock or menu changed): reload and let the cashier adjust
        if (err.status === 422) {
            await loadProducts().catch(() => {});
            drawPos();
        }
    }
});

/* ---------- receipt ---------- */

function showReceipt(o) {
    const L = [
        window.APP_CONFIG.STALL,
        new Date(o.paid_at || o.created_at).toLocaleString(),
        'Order #' + o.order_no,
        '-'.repeat(30),
        ...o.items.map(i => `${i.qty}x ${i.name} ${i.size || ''}  ${(Number(i.price) * i.qty).toFixed(2)}`),
        '-'.repeat(30),
        'Total: ' + Number(o.total).toFixed(2),
        'Payment: Cash',
        'Cash: ' + Number(o.tendered).toFixed(2),
        'Change: ' + Number(o.change_due).toFixed(2),
    ];

    lastReceipt = ['receipt-' + o.order_no + '.pdf', L];

    clearOrder();
    loadProducts().catch(() => {}); // stock changed after the sale

    $('#m').innerHTML = `
        <h2>Paid ✓</h2>
        <pre>${esc(L.join('\n'))}</pre>
        <div class="row">
            <button class="sec" data-click="pdf">Download PDF</button>
            <button data-click="newOrder">New order</button>
        </div>`;
}

onClick('newOrder', () => go('pos'));

// 80 mm wide PDF receipt
onClick('pdf', () => {
    if (!window.jspdf) return say('PDF tool did not load. Check your internet and refresh.');

    const { jsPDF } = window.jspdf;
    const [name, L] = lastReceipt;
    const w = 80, m = 6, ln = 4.6;

    const rows = L.flatMap(l => l.match(/.{1,35}/g) || ['']);
    const h = rows.length * ln + 2 * m;

    const d = new jsPDF({ unit: 'mm', format: [w, h], orientation: h > w ? 'p' : 'l' });
    d.setFont('courier', 'normal');
    d.setFontSize(9);
    rows.forEach((r, i) => d.text(r, m, m + ln * (i + 1) - 1.5));
    d.save(name);
});
