import { getSession, onAuthChange } from '../data/auth.js';
import { clearOrder } from '../business/cart.js';
import { go } from './router.js';
import { login, recovery } from './login.js';
import './pos.js';
import './products.js';
import './customers.js';
import './stock.js';
import './reports.js';
import './audit.js';

const cfg = window.APP_CONFIG;

document.title = cfg.STALL + ' POS' + (cfg.ENV === 'production' ? '' : ' (' + cfg.ENV + ')');

if (cfg.ENV !== 'production') {
    const bar = document.getElementById('envbar');
    bar.textContent = cfg.ENV.toUpperCase() + ' · test data, not real sales';
    bar.hidden = false;
}

onAuthChange(event => {
    if (event === 'SIGNED_OUT') {
        clearOrder();
        setTimeout(login, 0);
    }
    if (event === 'PASSWORD_RECOVERY') setTimeout(recovery, 0);
});

async function boot() {
    if (location.hash.includes('type=recovery')) return recovery();

    if (!(await getSession())) return login();

    go('pos');
}

boot();
