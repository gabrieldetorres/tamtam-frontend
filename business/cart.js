

export const state = { products: [], cart: [], customer: null };

const num = v => Number(v ?? 0);
const recipeOf = p => p.ingredients ?? [];

export function setProducts(list) {
    state.products = list;

   
    const byId = new Map(list.map(p => [p.id, p]));
    state.cart.forEach(line => {
        line.p = byId.get(line.p.id) ?? line.p;
    });
}

 
function usedInCart(itemId) {
    return state.cart.reduce((sum, line) => {
        const r = recipeOf(line.p).find(x => x.item_id === itemId);
        return sum + (r ? line.q * num(r.qty) : 0);
    }, 0);
}

 export const needsRecipe = p => recipeOf(p).length === 0;

 
export function servingsLeft(p) {
    if (needsRecipe(p)) return 0;

    const recipe = recipeOf(p);

    const perIngredient = recipe.map(r => (num(r.item.qty) - usedInCart(r.item_id)) / num(r.qty));

    return Math.max(0, Math.floor(Math.min(...perIngredient) + 1e-9));
}

export const canMake = p => servingsLeft(p) >= 1;

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

 
export const lineTotal = line => (Math.round(num(line.p.price) * 100) * line.q) / 100;
export const cartTotal = () => state.cart.reduce((sum, line) => sum + Math.round(num(line.p.price) * 100) * line.q, 0) / 100;


export const orderLines = () => state.cart.map(line => ({ product_id: line.p.id, qty: line.q }));

export function clearOrder() {
    state.cart = [];
    state.customer = null;
}

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
