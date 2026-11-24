import { $ } from './kit.js';
import { api } from '../data/api.js';
import { esc, dateTimeText } from '../business/format.js';
import { register } from './router.js';

register('audit', async () => {
    const rows = await api.get('/audit-log');

    $('#m').innerHTML = `
        <h3>Activity log</h3>
        ${rows.map(l => `
            <p>
                <span>${esc(l.kind)}: ${esc(l.detail)}</span>
                <span>${esc(dateTimeText(l.created_at))}</span>
            </p>`).join('') || '<p>Nothing logged yet.</p>'}`;
});
