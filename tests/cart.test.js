import test from 'node:test';
import assert from 'node:assert/strict';
import {
    state, setProducts, servingsLeft, canMake, addToCart, changeQty,
    cartTotal, orderLines, clearOrder, fillFromOrder,
} from '../business/cart.js';

const stockItem = (id, item, qty) => ({ id, item, qty, unit: 'pcs' });
const bread = qty => stockItem('i-bread', 'Bread', qty);
const patty = qty => stockItem('i-patty', 'Patty', qty);
const cheese = qty => stockItem('i-cheese', 'Cheese', qty);

const use = (item, qty) => ({ item_id: item.id, qty, item });

// 1 burger = 1 bread + 1 patty
const burger = (b = bread('10.000'), p = patty('10.000')) => ({
    id: 'p1', name: 'Burger', size: '', price: '60.00', ingredients: [use(b, '1.000'), use(p, '1.000')],
});
// 1 cheeseburger = 1 bread + 1 patty + 1 cheese (shares bread and patty with the burger)
const cheeseburger = (b, p, c = cheese('10.000')) => ({
    id: 'p3', name: 'Cheeseburger', size: '', price: '75.00',
    ingredients: [use(b, '1.000'), use(p, '1.000'), use(c, '1.000')],
});
const water = { id: 'p2', name: 'Water', size: '', price: '0.10', ingredients: [] };

function reset(products) {
    clearOrder();
    setProducts(products);
}

test('a product without ingredients is always available', () => {
    reset([water]);
    assert.equal(servingsLeft(water), Infinity);
    assert.equal(canMake(water), true);
});

test('a burger uses every ingredient: 10 bread and 10 patties make 10 burgers, then 9 after one sale', () => {
    reset([burger()]);
    assert.equal(servingsLeft(state.products[0]), 10);

    addToCart('p1');
    assert.equal(servingsLeft(state.products[0]), 9);
});

test('the ingredient that runs out first decides', () => {
    reset([burger(bread('10.000'), patty('1.000'))]); // lots of bread, one patty

    assert.equal(addToCart('p1'), true);
    assert.equal(canMake(state.products[0]), false);
    assert.equal(addToCart('p1'), false);
    assert.equal(state.cart[0].q, 1);
});

test('products that share an ingredient use it together', () => {
    const b = bread('10.000');
    const p = patty('2.000'); // only 2 patties for both products
    reset([burger(b, p), cheeseburger(b, p)]);

    assert.equal(addToCart('p1'), true);
    assert.equal(addToCart('p3'), true);

    assert.equal(canMake(state.products[0]), false);
    assert.equal(canMake(state.products[1]), false);
});

test('the total is exact (0.10 x 3 = 0.30)', () => {
    reset([water]);
    addToCart('p2');
    addToCart('p2');
    addToCart('p2');
    assert.equal(cartTotal(), 0.3);
});

test('the order sent to the API has product ids and quantities, never prices', () => {
    reset([burger(), water]);
    addToCart('p1');
    addToCart('p1');

    assert.deepEqual(orderLines(), [{ product_id: 'p1', qty: 2 }]);
});

test('lowering a quantity to zero removes the line', () => {
    reset([water]);
    addToCart('p2');
    changeQty(0, -1);
    assert.equal(state.cart.length, 0);
});

test('repeat order is reduced to what the stock allows and reports it', () => {
    reset([burger(bread('10.000'), patty('2.000')), water]); // only 2 burgers possible

    const skipped = fillFromOrder([
        { product_id: 'p1', name: 'Burger', qty: 3 },
        { product_id: 'gone', name: 'Old Product', qty: 1 },
    ]);

    assert.equal(state.cart[0].q, 2);
    assert.deepEqual(skipped, ['Burger (only 2 of 3)', 'Old Product']);
});
