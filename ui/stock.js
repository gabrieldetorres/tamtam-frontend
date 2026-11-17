/* ui/stock.js - ingredient stock */

import { $, onClick, dlg, sure } from './kit.js';
import { api } from '../data/api.js';
import { esc } from '../business/format.js';
import { register } from './router.js';

let items = [];

register('stock', load);

async function load() {
    items = await api.get('/ingredients');

    $('#m').innerHTML = `
        <button data-click="addStock">Add ingredient</button>
        <h3>Stocks/Inventory</h3>
        ${items.map(s => `
            <p>
                ${esc(s.item)}
                <span>
                    ${Number(s.qty)} ${esc(s.unit || '')}
                    <button class="sec" data-click="updateStock" data-id="${esc(s.id)}">Update</button>
                    <button class="sec" data-click="removeStock" data-id="${esc(s.id)}">Remove</button>
                </span>
            </p>`).join('')}`;
}

onClick('addStock', async () => {
    const v = await dlg('Add ingredient', [
        { label: 'Ingredient', req: 1 },
        { label: 'Quantity', type: 'number', value: 0, req: 1 },
        { label: 'Unit (e.g. kg, g, pcs)' },
    ], { ok: 'Save' });

    if (!v || !v[0].trim()) return;

    await api.post('/ingredients', { item: v[0].trim(), qty: Number(v[1]), unit: v[2].trim() || null });
    await load();
});

onClick('updateStock', async el => {
    const s = items.find(x => x.id === el.dataset.id);

    const v = await dlg('Update quantity', [
        { label: 'New quantity', type: 'number', value: Number(s.qty), req: 1 },
    ], { ok: 'Save' });

    if (!v) return;

    await api.put(`/ingredients/${s.id}`, { qty: Number(v[0]) });
    await load();
});

// the server archives it, and refuses while a drink still uses it
onClick('removeStock', async el => {
    if (!(await sure('Remove this ingredient?'))) return;

    await api.del(`/ingredients/${el.dataset.id}`);
    await load();
});
