# Vishut Dhar - Portfolio Website

A professional portfolio website showcasing my experience as a Senior Supplier Quality Engineer with expertise in data-driven quality management and continuous improvement.

**Live:** [https://vishutdhar.com](https://vishutdhar.com)

## Technology Stack

- HTML5
- CSS3 (CSS Variables for light/dark theming)
- Vanilla JavaScript
- Self-hosted font: Archivo variable (width and weight axes, latin subset; woff2 under `assets/fonts/`)
- Vercel (hosting with automatic deployments)

## Features

- **Responsive Design** - Optimized for desktop, tablet, and mobile
- **Light/Dark Mode** - Light by default; the toggle cycles light, dark, and system, and the choice persists
- **One animation** - The scrap-rate chart draws once when first seen; skipped under reduced motion, without JavaScript, and in print
- **Accessibility** - WCAG compliant with ARIA labels, skip-to-content link, keyboard navigation
- **Performance** - Inline SVG icons (no icon-font CDN), WebP images with JPEG fallback, self-hosted preloaded fonts (no third-party requests)
- **Security** - Strict Content-Security-Policy (fully self-contained: no external script, style, or font origins) and hardening headers via vercel.json
- **Print Stylesheet** - Full content on paper, collapsed responsibilities expanded, chart in colour
- **SEO** - robots.txt, image sitemap, semantic HTML, JSON-LD @graph (WebSite, ProfilePage, Person), Open Graph profile tags, canonical host redirect (www to apex)

## Sections

- **Hero** (`#home`) - Name, role and scope, dated lead-auditor credential, Email me, and a staged scrap-rate chart of the Spring Hill result (5% to 0.5%)
- **Results** (`#projects`) - Supplier portfolio turnaround, scrap reduction ($15M/yr), EV battery launch, IATF 16949 audits
- **Experience** (`#experience`) - Roles grouped by company (GM, Continental), key responsibilities shown and the rest expandable, with links to each company's recommendations
- **What colleagues say** (`#testimonials`) - All eight recommendations, grouped by company
- **About** (`#about`, includes `#education`) - Summary, grouped skills, education and certification
- **Outside work** (`#apps`) - Freedom Terminal and @USC1787
- **Get in touch** (`#contact`) - Email, phone, LinkedIn, GitHub

## Project Structure

```
vishut-portfolio/
├── index.html               # Main website
├── styles.css               # All styling (light/dark themes)
├── theme-init.js            # Applies the saved theme, or light, before first paint
├── script.js                # All page behavior
├── vishut-dhar-headshot.jpg # Profile photo (JPEG fallback)
├── vishut-dhar-headshot.webp # Profile photo (WebP)
├── og-image.png             # Social sharing card (1200x630), built by assets/og/build.js
├── apple-touch-icon.png     # Home screen icon
├── icon.svg                 # Favicon (crawlable file)
├── vercel.json              # Security headers, redirects, caching
├── assets/apps/             # Personal project app icons
├── assets/fonts/            # Self-hosted woff2 fonts
├── assets/og/               # Share card template and build script
├── robots.txt               # Search engine directives
├── sitemap.xml              # Page index
├── docs/                    # Design notes
└── README.md                # This file
```

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

Archivo is licensed under the SIL Open Font License 1.1; see `assets/fonts/OFL-Archivo.txt`.
