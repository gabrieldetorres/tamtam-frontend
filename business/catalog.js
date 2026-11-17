/* business/catalog.js - loads the menu into the cart rules */

import { api } from '../data/api.js';
import { setProducts } from './cart.js';

export async function loadProducts() {
    setProducts(await api.get('/products'));
}
