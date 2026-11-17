/* business/cart.js - cart rules. The server has the final say on prices, totals and stock;
   these rules only decide what the screen shows (greyed-out drinks, the running total). */

export const state = { products: [], cart: [], customer: null };

const num = v => Number(v ?? 0);

export function setProducts(list) {
    state.products = list;

    // cart lines point at the freshest copy of their drink
    const byId = new Map(list.map(p => [p.id, p]));
    state.cart.forEach(line => {
        line.p = byId.get(line.p.id) ?? line.p;
    });
}

// How much of a drink's ingredient is left, after what is already in the cart
export function stockLeft(p) {
    if (!p.item_id || !p.ingredient) return Infinity;

    const used = state.cart.reduce(
        (sum, line) => sum + (line.p.item_id === p.item_id ? line.q * num(line.p.qty) : 0),
        0
    );

    return num(p.ingredient.qty) - used;
}

export const canMake = p => stockLeft(p) + 1e-9 >= num(p.qty);

export function addToCart(id) {
    const p = state.products.find(x => x.id === id);
    if (!p || !canMake(p)) return false;

    const line = state.cart.find(l => l.p.id === id);
    if (line) line.q++;
    else state.cart.push({ p, q: 1 });

    return true;
}

export function changeQty(index, delta) {
    const line = state.cart[index];
    if (!line) return false;
    if (delta > 0 && !canMake(line.p)) return false;

    line.q += delta;
    if (line.q < 1) state.cart.splice(index, 1);

    return true;
}

// money in whole centavos, so 0.10 x 3 is exactly 0.30
export const lineTotal = line => (Math.round(num(line.p.price) * 100) * line.q) / 100;
export const cartTotal = () => state.cart.reduce((sum, line) => sum + Math.round(num(line.p.price) * 100) * line.q, 0) / 100;

// What is sent to the API: only WHICH drinks and HOW MANY. Never prices.
export const orderLines = () => state.cart.map(line => ({ product_id: line.p.id, qty: line.q }));

export function clearOrder() {
    state.cart = [];
    state.customer = null;
}

// "Repeat last order": returns the drinks that had to be skipped or reduced
export function fillFromOrder(items) {
    state.cart = [];
    const skipped = [];

    for (const item of items) {
        const p = state.products.find(x => x.id === item.product_id);

        if (!p || !canMake(p)) {
            skipped.push(item.name);
            continue;
        }

        const line = { p, q: 0 };
        state.cart.push(line);

        while (line.q < item.qty && canMake(p)) line.q++;

        if (line.q < item.qty) skipped.push(`${item.name} (only ${line.q} of ${item.qty})`);
    }

    return skipped;
}
