import test from 'node:test';
import assert from 'node:assert/strict';
import {
    state, setProducts, stockLeft, canMake, addToCart, changeQty,
    cartTotal, orderLines, clearOrder, fillFromOrder,
} from '../business/cart.js';

const milk = (qty) => ({ id: 'i1', item: 'Milk', qty, unit: 'L' });
const tea = (stock = '1.000') => ({
    id: 'p1', name: 'Milk Tea', size: 'M', price: '45.00', item_id: 'i1', qty: '0.600', ingredient: milk(stock),
});
const water = { id: 'p2', name: 'Water', size: '', price: '0.10', item_id: null, qty: '0', ingredient: null };

function reset(products) {
    clearOrder();
    setProducts(products);
}

test('a drink without an ingredient is always available', () => {
    reset([tea(), water]);
    assert.equal(stockLeft(water), Infinity);
    assert.equal(canMake(water), true);
});

test('cannot add a drink when the ingredient would run out', () => {
    reset([tea('1.000')]); // 1 L, each cup needs 0.6 L

    assert.equal(addToCart('p1'), true);
    assert.equal(canMake(state.products[0]), false);
    assert.equal(addToCart('p1'), false);
    assert.equal(state.cart[0].q, 1);
});

test('the total is exact (0.10 x 3 = 0.30)', () => {
    reset([water]);
    addToCart('p2');
    addToCart('p2');
    addToCart('p2');
    assert.equal(cartTotal(), 0.3);
});

test('the order sent to the API has drink ids and quantities, never prices', () => {
    reset([tea('10.000'), water]);
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
    reset([tea('1.000'), water]); // only 1 cup of tea possible

    const skipped = fillFromOrder([
        { product_id: 'p1', name: 'Milk Tea', qty: 3 },
        { product_id: 'gone', name: 'Old Drink', qty: 1 },
    ]);

    assert.equal(state.cart[0].q, 1);
    assert.deepEqual(skipped, ['Milk Tea (only 1 of 3)', 'Old Drink']);
});
