/* ui/products.js - Menu management. Each drink can be linked to one ingredient. */

import { $, onClick, dlg, say, sure } from './kit.js';
import { api } from '../data/api.js';
import { M, esc } from '../business/format.js';
import { register } from './router.js';

let products = [];
let ingredients = [];

register('products', load);

async function load() {
    [products, ingredients] = await Promise.all([api.get('/products'), api.get('/ingredients')]);
    draw();
}

const ingredientText = p =>
    p.ingredient
        ? `${p.ingredient.item} · ${Number(p.qty)} ${p.ingredient.unit || ''}`.trim()
        : 'Link ingredient';

function draw() {
    $('#m').innerHTML = `
        <h3>Add product</h3>
        <input id="pn" placeholder="Name">
        <input id="ps" placeholder="Size (optional) e.g. M">
        <input id="pp" type="number" inputmode="decimal" min="0" step="any" placeholder="Price">
        <button data-click="addProduct">Add product</button>

        <h3>Menu</h3>
        ${products.map(p => `
            <p>
                ${esc(p.name)} ${esc(p.size)}
                <span>
                    <button class="sec" data-click="editIngredient" data-id="${esc(p.id)}">${esc(ingredientText(p))}</button>
                    <button class="sec" data-click="editProduct" data-id="${esc(p.id)}">${M(p.price)}</button>
                    <button class="sec" data-click="deleteProduct" data-id="${esc(p.id)}">Delete</button>
                </span>
            </p>`).join('')}`;
}

const find = id => products.find(p => p.id === id);

onClick('addProduct', async () => {
    const name = $('#pn').value.trim();
    const price = Number($('#pp').value);

    if (!name || $('#pp').value === '' || !(price >= 0)) return say('Enter a valid name and price.');

    await api.post('/products', { name, size: $('#ps').value.trim(), price });
    await load();
});

onClick('editProduct', async el => {
    const p = find(el.dataset.id);

    const v = await dlg('Edit product', [
        { label: 'Name', value: p.name, req: 1 },
        { label: 'Size', value: p.size },
        { label: 'Price', type: 'number', value: p.price, req: 1 },
    ], { ok: 'Save' });

    if (!v) return;
    if (!v[0].trim()) return say('Enter a name.');
    if (!(Number(v[2]) >= 0)) return say('Enter a valid price.');

    await api.put(`/products/${p.id}`, { name: v[0].trim(), size: v[1].trim(), price: Number(v[2]) });
    await load();
});

// which ingredient a drink uses, and how much per cup
onClick('editIngredient', async el => {
    const p = find(el.dataset.id);

    const v = await dlg(`${p.name} ${p.size}`.trim(), [
        {
            label: 'Ingredient used',
            type: 'select',
            value: p.item_id || '',
            options: [{ v: '', t: 'None' }, ...ingredients.map(i => ({ v: i.id, t: `${i.item} (${i.unit || ''})` }))],
        },
        { label: 'Amount used per cup', type: 'number', value: p.item_id ? Number(p.qty) : '' },
    ], { ok: 'Save' });

    if (!v) return;

    const item_id = v[0] || null;
    const qty = item_id ? Number(v[1]) : 0;

    if (item_id && !(qty > 0)) return say('Enter how much of the ingredient one cup uses.');

    await api.put(`/products/${p.id}`, { item_id, qty });
    await load();
});

onClick('deleteProduct', async el => {
    if (!(await sure('Delete this product? Past orders keep their details.'))) return;

    await api.del(`/products/${el.dataset.id}`);
    await load();
});
