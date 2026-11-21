// Picks the right .env.* file, checks it, and builds the site into dist/.
// Usage:  node scripts/build-config.js [development|staging|production]
// On Vercel the environment is chosen from the git branch (main = production,
// staging = staging, anything else = development).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const fail = msg => {
    console.error('\nBUILD STOPPED: ' + msg + '\n');
    process.exit(1);
};

const branch = process.env.VERCEL_GIT_COMMIT_REF || '';
const env = process.argv[2] || process.env.APP_ENV ||
    (branch === 'main' ? 'production' : branch === 'staging' ? 'staging' : 'development');

if (!['development', 'staging', 'production'].includes(env)) fail(`Unknown environment "${env}".`);

const file = path.join(root, `.env.${env}`);
const vars = {};

// Local builds read .env.*. Vercel builds use configured environment variables.
if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        if (line.trim().startsWith('#')) continue;
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
} else if (!process.env.VERCEL) {
    fail(`${file} does not exist.`);
}

// real environment variables win over the file (handy for CI or Vercel settings)
const required = ['API_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'];
for (const k of [...required, 'STALL_NAME']) if (process.env[k]) vars[k] = process.env[k];

for (const k of required) {
    if (!vars[k] || /YOUR[-_]|changeme/i.test(vars[k])) {
        fail(`${k} in .env.${env} is missing or still a placeholder.`);
    }
}

const config = {
    ENV: env,
    API_URL: vars.API_URL.replace(/\/+$/, ''),
    SUPABASE_URL: vars.SUPABASE_URL.replace(/\/+$/, ''),
    SUPABASE_PUBLISHABLE_KEY: vars.SUPABASE_PUBLISHABLE_KEY,
    STALL: vars.STALL_NAME || 'TamTam',
};
const configJs = `window.APP_CONFIG = Object.freeze(${JSON.stringify(config, null, 2)});\n`;

// dist/ = exactly what gets deployed (the .env.* files and scripts are NOT published)
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
for (const item of ['index.html', 'css', 'ui', 'business', 'data']) {
    fs.cpSync(path.join(root, item), path.join(dist, item), { recursive: true });
}
fs.writeFileSync(path.join(dist, 'config.js'), configJs);

// for local work: also write config.js next to index.html so Live Server can use the source files directly
if (!process.env.VERCEL) fs.writeFileSync(path.join(root, 'config.js'), configJs);

console.log(`Built "${env}" -> API ${config.API_URL}`);
