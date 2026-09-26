/*
 * Regenerates og-image.png, the 1200x630 social share card, from
 * assets/og/template.html so the card can be updated in step with the site
 * copy instead of being edited by hand as a binary.
 *
 * Usage: node assets/og/build.js
 *
 * Needs a Chromium that Playwright can drive. Resolves the playwright package
 * from the global npm root when it is not installed locally.
 */

const { execFileSync } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT = path.join(REPO_ROOT, 'og-image.png');
const TEMPLATE_URL_PATH = '/assets/og/template.html';
const WIDTH = 1200;
const HEIGHT = 630;
// The template's own left and right gutter, reused to check the content fits.
const MARGIN = 72;

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
            const inRepo = filePath === REPO_ROOT || filePath.startsWith(REPO_ROOT + path.sep);
            if (!inRepo || !fs.existsSync(filePath)) {
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

// Read the name and role the card shows straight out of the page it
// advertises, so the two cannot drift apart.
//
// This hands index.html to a real HTML parser rather than matching it with
// regexes, so attribute order, extra classes, comments and character references
// all behave the way a browser says they do. The parsed document is inert: no
// scripts run and no subresources load.
function readHeroContent(page) {
    const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');

    return page.evaluate((src) => {
        // Collapse runs of any whitespace, including non-breaking spaces, so
        // markup line breaks and nowrap spans do not leak into the card.
        const norm = (text) => text.replace(/\s+/g, ' ').trim();

        const doc = new DOMParser().parseFromString(src, 'text/html');
        const hero = doc.querySelector('#home');
        if (!hero) return { error: 'Could not find the hero section (#home) in index.html' };

        const only = (selector, label) => {
            const found = hero.querySelectorAll(selector);
            if (found.length !== 1) {
                return { error: 'Expected exactly 1 ' + label + ' in the hero of index.html, found ' + found.length };
            }
            const value = norm(found[0].textContent);
            if (!value) return { error: 'The hero ' + label + ' in index.html is empty' };
            return { value };
        };

        const name = only('h1', 'name (h1)');
        if (name.error) return name;
        const role = only('.hero-role', 'role line (.hero-role)');
        if (role.error) return role;

        // The card draws the same chart as the page with fixed figures, so
        // refuse to build if the page's chart no longer says the same thing.
        const chart = doc.querySelector('#scrap-chart');
        const chartText = chart ? norm(chart.textContent) : '';
        const missing = ['5%', '0.5%', '$15 million'].filter(f => !chartText.includes(f));
        if (missing.length) {
            return { error: 'The scrap chart in index.html no longer shows ' + missing.join(', ') + '; update the card template to match' };
        }

        return { value: { name: name.value, role: role.value } };
    }, html);
}

(async () => {
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

        await page.goto(`http://127.0.0.1:${port}${TEMPLATE_URL_PATH}`, { waitUntil: 'networkidle' });

        const read = await readHeroContent(page);
        if (read.error) throw new Error(read.error);
        const content = read.value;

        const injection = await page.evaluate((c) => {
            const name = document.querySelector('.name');
            const role = document.querySelector('.role');
            if (!name || !role) return { error: 'The card template is missing .name or .role' };
            name.textContent = c.name;
            role.textContent = c.role;
            return {};
        }, content);

        if (injection.error) throw new Error(injection.error);

        await page.evaluate(() => document.fonts.ready);

        const ready = await page.evaluate(() => {
            const img = document.querySelector('.headshot');
            return {
                headshotLoaded: img.complete && img.naturalWidth > 0,
                // fonts.status only reports that loading finished, not that it
                // succeeded, so ask whether each family can actually be used.
                missingFonts: ['Archivo']
                    .filter(family => !document.fonts.check(`16px "${family}"`))
            };
        });

        if (failures.length) throw new Error(`Assets failed to load:\n  ${failures.join('\n  ')}`);
        if (!ready.headshotLoaded) throw new Error('Headshot did not load; refusing to overwrite the card');
        if (ready.missingFonts.length) {
            throw new Error(`Fonts unavailable (${ready.missingFonts.join(', ')}); refusing to overwrite the card`);
        }

        // Now that the page's text is in, check it still fits. The name, role
        // and chart share the left column, so they must stop short of the
        // portrait; the domain must stay inside the card's right margin. Copy
        // long enough to break either rule would otherwise be cropped or
        // collide silently, and the card is only ever seen at this size.
        const overflowing = await page.evaluate((margin) => {
            const photoLeft = document.querySelector('.headshot').getBoundingClientRect().left;
            const columnLimit = photoLeft - 32;
            const cardLimit = document.documentElement.clientWidth - margin;
            const checks = [
                ...[...document.querySelectorAll('.name, .role, .chart, .result')].map(el => ({ el, limit: columnLimit })),
                { el: document.querySelector('.domain'), limit: cardLimit }
            ];
            return checks
                .map(({ el, limit }) => {
                    // Measure the text itself: .role is a fixed-width box, so its
                    // own rectangle would never report a line running long.
                    const range = document.createRange();
                    range.selectNodeContents(el);
                    return { el, limit, right: range.getBoundingClientRect().right };
                })
                .filter(({ right, limit }) => right > limit)
                .map(({ el, right, limit }) => `${el.className} reaches ${Math.round(right)}px, past ${Math.round(limit)}px`);
        }, MARGIN);

        if (overflowing.length) {
            throw new Error(`Card content does not fit:\n  ${overflowing.join('\n  ')}`);
        }

        // Render aside first so a failed run cannot leave a broken card behind.
        // The pid keeps two concurrent builds off each other's temporary file.
        const pending = `${OUTPUT}.${process.pid}.pending`;
        try {
            await page.screenshot({ path: pending, type: 'png' });
            fs.renameSync(pending, OUTPUT);
        } finally {
            // Swallowed deliberately: a cleanup failure here would otherwise
            // replace the real reason the render failed.
            try {
                fs.rmSync(pending, { force: true });
            } catch (err) {
                // leave the stray file rather than lose the original error
            }
        }

        console.log(`Wrote ${OUTPUT} (${WIDTH}x${HEIGHT}) for "${content.name}", "${content.role}"`);
    } finally {
        // Shutting down must not throw over the failure that brought us here,
        // and the server has to close even if the browser will not.
        try {
            await browser.close();
        } catch (err) {
            // nothing useful to do; the real error is already on its way out
        }
        server.close();
    }
})();
