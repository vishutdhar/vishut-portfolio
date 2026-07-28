/*
 * Regenerates og-image.png, the 1200x630 social share card, from
 * assets/og-template.html so the card can be updated in step with the site
 * copy instead of being edited by hand as a binary.
 *
 * Usage: node assets/build-og-image.js
 *
 * Needs a Chromium that Playwright can drive. Resolves the playwright package
 * from the global npm root when it is not installed locally.
 */

const { execFileSync } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(REPO_ROOT, 'og-image.png');
const WIDTH = 1200;
const HEIGHT = 630;

// This repo has no package.json, so Playwright is usually not installed
// alongside it. Fall back to the global npm root, including one level down,
// since Playwright is often present only as a dependency of a global tool.
function loadPlaywright() {
    try {
        return require('playwright');
    } catch (err) {
        // Not installed locally; keep looking.
    }

    let globalRoot;
    try {
        globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    } catch (err) {
        globalRoot = null;
    }

    const candidates = [];
    if (globalRoot && fs.existsSync(globalRoot)) {
        candidates.push(path.join(globalRoot, 'playwright'));
        for (const entry of fs.readdirSync(globalRoot)) {
            candidates.push(path.join(globalRoot, entry, 'node_modules', 'playwright'));
        }
    }

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return require(candidate);
        }
    }

    throw new Error('Playwright not found. Install it with: npm install playwright');
}

const MIME = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.svg': 'image/svg+xml'
};

// The template pulls in local fonts and the headshot, which a file:// origin
// will not load consistently, so serve the repo over http for the render.
function serveRepo() {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
            const filePath = path.join(REPO_ROOT, rel);
            if (!filePath.startsWith(REPO_ROOT) || !fs.existsSync(filePath)) {
                res.writeHead(404);
                res.end('not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
        });
        server.listen(0, '127.0.0.1', () => resolve(server));
    });
}

// Read the figures the card advertises straight out of the page it advertises,
// so the two cannot drift apart. This parses the file rather than querying a
// live DOM because the hero stats animate on screen, and a rendered page would
// hand back whatever mid-animation value happened to be showing.
function readHeroContent() {
    const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');

    const one = (pattern, label) => {
        const match = html.match(pattern);
        if (!match) throw new Error(`Could not read ${label} from index.html`);
        return match[1].trim();
    };

    const stats = [...html.matchAll(/<div class="stat-number"[^>]*>([^<]+)<\/div>/g)].map(m => m[1].trim());
    if (stats.length !== 3) {
        throw new Error(`Expected 3 hero stats in index.html, found ${stats.length}`);
    }

    return {
        name: one(/<h1>([^<]+)<\/h1>/, 'name'),
        role: one(/<p class="hero-title">([^<]+)<\/p>/, 'role'),
        stats
    };
}

(async () => {
    const content = readHeroContent();
    const { chromium } = loadPlaywright();
    const server = await serveRepo();
    const port = server.address().port;
    const browser = await chromium.launch();

    try {
        const page = await browser.newPage({
            viewport: { width: WIDTH, height: HEIGHT },
            deviceScaleFactor: 1
        });

        const failures = [];
        page.on('requestfailed', req => failures.push(`${req.url()} (${req.failure().errorText})`));
        page.on('response', res => {
            if (!res.ok()) failures.push(`${res.url()} (HTTP ${res.status()})`);
        });

        await page.goto(`http://127.0.0.1:${port}/assets/og-template.html`, { waitUntil: 'networkidle' });

        // The stat labels stay in the template: the page spells them out at
        // widths this layout has no room for.
        await page.evaluate((c) => {
            document.querySelector('.name').textContent = c.name;
            document.querySelector('.role').textContent = c.role;
            document.querySelectorAll('.stat-value').forEach((el, i) => { el.textContent = c.stats[i]; });
        }, content);

        await page.evaluate(() => document.fonts.ready);

        const ready = await page.evaluate(() => {
            const img = document.querySelector('.headshot');
            return {
                headshotLoaded: img.complete && img.naturalWidth > 0,
                fontsLoaded: document.fonts.status === 'loaded'
            };
        });

        if (failures.length) throw new Error(`Assets failed to load:\n  ${failures.join('\n  ')}`);
        if (!ready.headshotLoaded) throw new Error('Headshot did not load; refusing to overwrite the card');
        if (!ready.fontsLoaded) throw new Error('Fonts did not load; refusing to overwrite the card');

        // Render aside first so a failed run cannot leave a broken card behind.
        const pending = `${OUTPUT}.pending`;
        await page.screenshot({ path: pending, type: 'png' });
        fs.renameSync(pending, OUTPUT);

        console.log(`Wrote ${OUTPUT} (${WIDTH}x${HEIGHT}) with ${content.stats.join(', ')}`);
    } finally {
        await browser.close();
        server.close();
    }
})();
