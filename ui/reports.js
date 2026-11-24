import { $, onClick, say } from './kit.js';
import { api, download } from '../data/api.js';
import { M, esc, iso, addDays } from '../business/format.js';
import { register } from './router.js';

let last = { from: '', to: '' }; // the range shown by "Generate report" (used by the CSV button)

function summaryHtml(s) {
    return `
        <div class="g">
            <div><b>${M(s.sales)}</b>Sales</div>
            <div><b>${s.orders}</b>Orders</div>
            <div><b>${M(s.avg_order)}</b>Avg order</div>
        </div>
        ${s.voided ? `<h3>Voided carts: ${s.voided}</h3>` : ''}

        <h3>Top sellers (qty)</h3>
        ${s.top_sellers.map(x => `<p>${esc(x.label)}<span>${x.qty}</span></p>`).join('') || '<p>No sales yet.</p>'}

        ${s.daily.length > 1 ? `
            <h3>By day</h3>
            ${s.daily.map(d => `<p>${esc(d.date)}<span>${d.orders} orders · ${M(d.sales)}</span></p>`).join('')}` : ''}`;
}

register('reports', async () => {
    const today = iso(new Date());

    $('#m').innerHTML = `
        <h2>Today</h2>
        <div id="td"><p>Loading…</p></div>

        <h2>Reports</h2>
        <div class="row">
            <button class="sec" data-click="range" data-n="0">Today</button>
            <button class="sec" data-click="range" data-n="6">7 days</button>
            <button class="sec" data-click="range" data-n="29">30 days</button>
        </div>

        <input id="rf" type="date" value="${today}">
        <input id="rt" type="date" value="${today}">
        <button data-click="generate">Generate report</button>

        <div id="ro"></div>`;

    // no dates = "today" on the stall's clock (the server decides)
    $('#td').innerHTML = summaryHtml(await api.get('/reports/summary'));
});

async function generate() {
    const from = $('#rf').value;
    const to = $('#rt').value;

    if (!from || !to) return say('Choose both dates.');
    if (to < from) return say('The end date cannot be before the start date.');

    const s = await api.get('/reports/summary', { from, to });

    last = { from, to };
    $('#ro').innerHTML = summaryHtml(s) + '<button class="sec" data-click="csv">Download CSV</button>';
}

onClick('range', el => {
    $('#rf').value = iso(addDays(new Date(), -Number(el.dataset.n)));
    $('#rt').value = iso(new Date());
    return generate();
});

onClick('generate', generate);

onClick('csv', () => download('/reports/export', last, `sales-${last.from}-to-${last.to}.csv`));
