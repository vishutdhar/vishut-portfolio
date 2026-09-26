/*
 * Tells IndexNow-enabled search engines (Bing, Yandex, Naver, Seznam, Yep,
 * and everyone who shares the IndexNow feed, including DuckDuckGo and Yahoo
 * through Bing) that the page changed, so they recrawl it right away instead
 * of on their own schedule.
 *
 * Usage: node assets/seo/indexnow.js
 *
 * Run it after each deploy of a content change. The key file it references is
 * the <key>.txt at the repo root, which must stay deployed at the same path.
 * Google does not take IndexNow; it picks up the sitemap on its own and can be
 * nudged from Search Console.
 */

const fs = require('fs');
const path = require('path');

const HOST = 'vishutdhar.com';
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const keyFile = fs.readdirSync(REPO_ROOT).find(f => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) {
    console.error('No IndexNow key file (<32 hex chars>.txt) found at the repo root.');
    process.exit(1);
}
const key = keyFile.replace(/\.txt$/, '');

const sitemap = fs.readFileSync(path.join(REPO_ROOT, 'sitemap.xml'), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map(m => m[1])
    .filter(u => u.startsWith(`https://${HOST}/`) && !/\.(jpg|jpeg|png|webp|svg)$/i.test(u));

(async () => {
    const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList })
    });
    // 200 and 202 both mean accepted. 422 means the key file did not match.
    console.log(`IndexNow responded ${res.status} for ${urlList.length} URL(s): ${urlList.join(', ')}`);
    if (res.status >= 400) process.exit(1);
})();
