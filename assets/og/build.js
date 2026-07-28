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

// Read the figures the card advertises straight out of the page it advertises,
// so the two cannot drift apart.
//
// This hands index.html to a real HTML parser rather than matching it with
// regexes, so attribute order, extra classes, comments and character references
// all behave the way a browser says they do. DOMParser runs no scripts and
// fetches nothing, so unlike loading the page for real it returns the authored
// figures rather than whatever frame the stat animation happens to be on.
function readHeroContent(page) {
    const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');

    return page.evaluate((src) => {
        const doc = new DOMParser().parseFromString(src, 'text/html');
        const hero = doc.querySelector('#home');
        if (!hero) return { error: 'Could not find the hero section (#home) in index.html' };

        const only = (selector, label) => {
            const found = hero.querySelectorAll(selector);
            if (found.length !== 1) {
                return { error: 'Expected exactly 1 ' + label + ' in the hero of index.html, found ' + found.length };
            }
            return { value: found[0].textContent.trim() };
        };

        const name = only('h1', 'name');
        if (name.error) return name;
        const role = only('.hero-title', 'role');
        if (role.error) return role;

        // Keep each figure with the label it sits under, so the card can match
        // them up by name instead of trusting the order they appear in.
        const pairs = [];
        hero.querySelectorAll('.stat-item').forEach((item) => {
            const value = item.querySelector('.stat-number');
            const label = item.querySelector('.stat-label');
            if (value && label) pairs.push([label.textContent.trim(), value.textContent.trim()]);
        });

        if (pairs.length !== 3) {
            return { error: 'Expected 3 labelled hero stats in index.html, found ' + pairs.length };
        }
        // Distinct labels are checked separately: two stats sharing one would
        // collapse into a single entry and the survivor would win silently.
        const labels = pairs.map(p => p[0]);
        if (new Set(labels).size !== labels.length) {
            return { error: 'Hero stats in index.html do not have distinct labels: ' + labels.join(', ') };
        }

        return { value: { name: name.value, role: role.value, stats: Object.fromEntries(pairs) } };
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
            // Swallowed deliberately: a cleanup failure here would otherwise
            // replace the real reason the render failed.
            try {
                fs.rmSync(pending, { force: true });
            } catch (err) {
                // leave the stray file rather than lose the original error
            }
        }

        const summary = Object.entries(content.stats).map(([label, value]) => `${value} ${label}`).join(', ');
        console.log(`Wrote ${OUTPUT} (${WIDTH}x${HEIGHT}) with ${summary}`);
    } finally {
        await browser.close();
        server.close();
    }
})();
