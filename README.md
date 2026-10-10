# Vishut Dhar - Portfolio Website

A professional portfolio website showcasing my experience as a Senior Supplier Quality Engineer with expertise in data-driven quality management and continuous improvement.

**Live:** [https://vishutdhar.com](https://vishutdhar.com)

## Technology Stack

- HTML5
- CSS3 (CSS Variables for light/dark theming)
- Vanilla JavaScript
- Self-hosted fonts (DM Sans, DM Serif Display; woff2 under `assets/fonts/`)
- Vercel (hosting with automatic deployments)

## Features

- **Responsive Design** - Optimized for desktop, tablet, and mobile
- **Dark/Light Mode** - Follows the system setting by default; the toggle cycles dark, light, and system, and the choice persists
- **Smooth Animations** - Scroll-triggered reveals and hover states, with reduced-motion support
- **Accessibility** - WCAG compliant with ARIA labels, skip-to-content link, keyboard navigation
- **Performance** - Inline SVG icons (no icon-font CDN), WebP images with JPEG fallback, self-hosted preloaded fonts (no third-party requests)
- **Security** - Strict Content-Security-Policy (fully self-contained: no external script, style, or font origins) and hardening headers via vercel.json
- **Print Stylesheet** - Clean output for offline sharing
- **SEO** - robots.txt, image sitemap, semantic HTML, JSON-LD @graph (WebSite, ProfilePage, Person), Open Graph profile tags, canonical host redirect (www to apex)

## Sections

- **Hero** - Name, role at GM, and the one-line approach; no stat strip
- **About** - Professional summary and skills
- **Experience** - Work history with accomplishments and company logo marks (GM, Continental)
- **Projects** - Major achievements including $15M cost savings
- **Education** - Academic background
- **Testimonials** - Professional recommendations
- **Contact** - Email, LinkedIn, phone (shown only on tap, so it is not scraped)

## Project Structure

```
vishut-portfolio/
├── index.html               # Main website
├── styles.css               # All styling (light/dark themes)
├── theme-init.js            # Applies the saved theme, or the system one, before first paint
├── script.js                # All page behavior
├── vishut-dhar-headshot.jpg # Profile photo, 800px (JPEG fallback)
├── vishut-dhar-headshot.webp # Profile photo, 800px (WebP)
├── og-image.png             # Social sharing card (1200x630)
├── apple-touch-icon.png     # Home screen icon
├── icon.svg                 # Favicon (crawlable file)
├── vercel.json              # Security headers, redirects, caching
├── assets/fonts/            # Self-hosted woff2 fonts
├── assets/seo/indexnow.js   # Pings IndexNow search engines after a deploy
├── <key>.txt                # IndexNow key file (public by design, keep it deployed)
├── robots.txt               # Search engine directives
├── sitemap.xml              # Page index
└── README.md                # This file
```

## Search engines and indexing

What the site already does on its own:

- Canonical URL, robots meta, Open Graph and Twitter cards, and a JSON-LD graph (WebSite, ProfilePage, Person with occupation, credentials, and skills).
- `robots.txt` allows every crawler and points at `sitemap.xml`, which also lists the headshot for image search.
- `www` redirects permanently to the bare domain, so there is one URL to index.

What needs a one-time sign-in by the site owner:

1. **Google Search Console**: add `vishutdhar.com` as a Domain property, verify with the DNS TXT record it gives you, then submit `https://vishutdhar.com/sitemap.xml` and use URL Inspection, Request Indexing on the home page.
2. **Bing Webmaster Tools**: choose Import from Google Search Console. Bing feeds DuckDuckGo, Yahoo, and Ecosia, so this one step covers all four.
3. **Yandex Webmaster**: add the site, verify by DNS or meta tag, submit the sitemap.
4. If any of these asks for a meta tag instead of DNS, add it to the head of `index.html`.

After each content deploy, ping the IndexNow engines (Bing, Yandex, Naver, Seznam, Yep):

```
node assets/seo/indexnow.js
```

It reads the key file at the repo root and the URLs in `sitemap.xml`. A 200 or 202 response means accepted. Also bump `lastmod` in `sitemap.xml` and `dateModified` in the JSON-LD when the content changes.

## Deployment

Auto-deploys from `main` branch on GitHub to Vercel. Live at vishutdhar.com within ~1 minute of push.

### Local Development
1. Clone the repository
2. Open `index.html` in a browser or use Live Server in VS Code

## Contact

- **Email:** vishutdhar1993@gmail.com
- **LinkedIn:** [linkedin.com/in/vishutdhar](https://www.linkedin.com/in/vishutdhar/)

## License

(c) 2026 Vishut Dhar. All rights reserved.

Fonts (DM Sans, DM Serif Display) are licensed under the SIL Open Font License 1.1; see `assets/fonts/OFL-DM-Sans.txt` and `assets/fonts/OFL-DM-Serif-Display.txt`.
