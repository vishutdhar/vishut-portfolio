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
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text) {
    return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body) => {
        if (body[0] === '#') {
            const code = body[1] === 'x' || body[1] === 'X'
                ? parseInt(body.slice(2), 16)
                : parseInt(body.slice(1), 10);
            // fromCodePoint throws outside the Unicode range, so leave anything
            // that is not a real code point exactly as it was written.
            if (!Number.isInteger(code) || code < 0 || code > 0x10FFFF) return whole;
            return String.fromCodePoint(code);
        }
        const named = ENTITIES[body.toLowerCase()];
        return named === undefined ? whole : named;
    });
}

function readHeroContent() {
    const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');

    // Match only inside the hero, so an <h1> or stat anywhere else on the page
    // cannot be picked up instead.
    const hero = html.match(/<section id="home"[^>]*>([\s\S]*?)<\/section>/);
    if (!hero) throw new Error('Could not find the hero section in index.html');
    const source = hero[1];

    const one = (pattern, label) => {
        const matches = [...source.matchAll(pattern)];
        if (matches.length !== 1) {
            throw new Error(`Expected exactly 1 ${label} in the hero of index.html, found ${matches.length}`);
        }
        return decodeEntities(matches[0][1].trim());
    };

    // Keep each figure with the label it sits under, so the card can match them
    // up by name instead of trusting the order they appear in.
    const stats = {};
    const pair = /<div class="stat-number"[^>]*>([^<]+)<\/div>\s*<div class="stat-label">([^<]+)<\/div>/g;
    const found = [...source.matchAll(pair)];
    for (const match of found) {
        stats[decodeEntities(match[2].trim())] = decodeEntities(match[1].trim());
    }
    if (found.length !== 3) {
        throw new Error(`Expected 3 labelled hero stats in index.html, found ${found.length}`);
    }
    // Counting unique labels separately: two stats sharing a label would leave
    // three pairs but only two keys, and the survivor would win silently.
    if (Object.keys(stats).length !== found.length) {
        throw new Error(`Hero stats in index.html do not have distinct labels: ${found.map(m => `"${m[2].trim()}"`).join(', ')}`);
    }

    return {
        name: one(/<h1>([^<]+)<\/h1>/g, 'name'),
        role: one(/<p class="hero-title">([^<]+)<\/p>/g, 'role'),
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

        await page.goto(`http://127.0.0.1:${port}${TEMPLATE_URL_PATH}`, { waitUntil: 'networkidle' });

        const missingLabels = await page.evaluate((c) => {
            document.querySelector('.name').textContent = c.name;
            document.querySelector('.role').textContent = c.role;
            const missing = [];
            document.querySelectorAll('.stat-value').forEach((el) => {
                const label = el.dataset.pageLabel;
                if (!(label in c.stats)) {
                    missing.push(label);
                    return;
                }
                el.textContent = c.stats[label];
            });
            return missing;
        }, content);

        if (missingLabels.length) {
            throw new Error(
                `index.html has no hero stat labelled ${missingLabels.map(l => `"${l}"`).join(', ')}. ` +
                `Found: ${Object.keys(content.stats).map(l => `"${l}"`).join(', ')}`
            );
        }

        await page.evaluate(() => document.fonts.ready);

        const ready = await page.evaluate(() => {
            const img = document.querySelector('.headshot');
            return {
                headshotLoaded: img.complete && img.naturalWidth > 0,
                // fonts.status only reports that loading finished, not that it
                // succeeded, so ask whether each family can actually be used.
                missingFonts: ['DM Serif Display', 'DM Sans']
                    .filter(family => !document.fonts.check(`16px "${family}"`))
            };
        });

        if (failures.length) throw new Error(`Assets failed to load:\n  ${failures.join('\n  ')}`);
        if (!ready.headshotLoaded) throw new Error('Headshot did not load; refusing to overwrite the card');
        if (ready.missingFonts.length) {
            throw new Error(`Fonts unavailable (${ready.missingFonts.join(', ')}); refusing to overwrite the card`);
        }

        // Render aside first so a failed run cannot leave a broken card behind.
        // The pid keeps two concurrent builds off each other's temporary file.
        const pending = `${OUTPUT}.${process.pid}.pending`;
        try {
            await page.screenshot({ path: pending, type: 'png' });
            fs.renameSync(pending, OUTPUT);
        } finally {
            fs.rmSync(pending, { force: true });
        }

        const summary = Object.entries(content.stats).map(([label, value]) => `${value} ${label}`).join(', ');
        console.log(`Wrote ${OUTPUT} (${WIDTH}x${HEIGHT}) with ${summary}`);
    } finally {
        await browser.close();
        server.close();
    }
})();
