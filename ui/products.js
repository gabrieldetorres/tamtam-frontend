/* ui/products.js - Menu management. A product has a recipe: the ingredients one serving uses. */

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

const recipeText = p =>
    p.ingredients.length
        ? 'Recipe: ' + p.ingredients.map(r => `${r.item.item} ×${Number(r.qty)}`).join(', ')
        : 'No ingredients linked';

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
                    <button class="sec" data-click="editRecipe" data-id="${esc(p.id)}">Recipe</button>
                    <button class="sec" data-click="editProduct" data-id="${esc(p.id)}">${M(p.price)}</button>
                    <button class="sec" data-click="deleteProduct" data-id="${esc(p.id)}">Delete</button>
                </span>
            </p>
            <small class="hint">${esc(recipeText(p))}</small>`).join('')}`;
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

// The recipe: type how much of each ingredient ONE serving uses. Leave blank (or 0) = not used.
onClick('editRecipe', async el => {
    const p = find(el.dataset.id);

    if (!ingredients.length) return say('Add ingredients in Stock first.');

    const current = new Map(p.ingredients.map(r => [r.item_id, Number(r.qty)]));

    const v = await dlg(`Recipe: ${p.name} ${p.size}`.trim(), ingredients.map(i => ({
        label: `${i.item} used per serving (${i.unit || 'units'})`,
        type: 'number',
        value: current.get(i.id) ?? '',
    })), { ok: 'Save' });

    if (!v) return;

    const lines = [];

    for (const [k, i] of ingredients.entries()) {
        const raw = v[k].trim();
        if (raw === '') continue;

        const qty = Number(raw);
        if (!(qty >= 0)) return say(`Enter a valid amount for ${i.item}.`);
        if (qty > 0) lines.push({ item_id: i.id, qty });
    }

    await api.put(`/products/${p.id}`, { ingredients: lines });
    await load();
});

onClick('deleteProduct', async el => {
    if (!(await sure('Delete this product? Past orders keep their details.'))) return;

    await api.del(`/products/${el.dataset.id}`);
    await load();
});
