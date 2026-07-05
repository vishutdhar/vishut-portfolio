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
- **Dark/Light Mode** - Follows system preference by default; manual toggle persists the choice
- **Smooth Animations** - Scroll-triggered reveals and hover states, with reduced-motion support
- **Accessibility** - WCAG compliant with ARIA labels, skip-to-content link, keyboard navigation
- **Performance** - Inline SVG icons (no icon-font CDN), WebP images with JPEG fallback, self-hosted preloaded fonts (no third-party requests)
- **Security** - Strict Content-Security-Policy (fully self-contained: no external script, style, or font origins) and hardening headers via vercel.json
- **Print Stylesheet** - Clean output for offline sharing
- **SEO** - robots.txt, image sitemap, semantic HTML, JSON-LD @graph (WebSite, ProfilePage, Person), Open Graph profile tags, canonical host redirect (www to apex)

## Sections

- **Hero** - Introduction with key metrics
- **About** - Professional summary and skills
- **Experience** - Work history with accomplishments and company logo marks (GM, Continental)
- **Projects** - Major achievements including $15M cost savings
- **Education** - Academic background
- **Testimonials** - Professional recommendations
- **Contact** - Email, LinkedIn, phone
- **Personal Projects** - iOS apps, web apps, and automations shipped outside of work

## Project Structure

```
vishut-portfolio/
├── index.html               # Main website
├── styles.css               # All styling (light/dark themes)
├── theme-init.js            # Applies saved/system theme before first paint
├── script.js                # All page behavior
├── vishut-dhar-headshot.jpg # Profile photo (JPEG fallback)
├── vishut-dhar-headshot.webp # Profile photo (WebP)
├── og-image.png             # Social sharing card (1200x630)
├── apple-touch-icon.png     # Home screen icon
├── icon.svg                 # Favicon (crawlable file)
├── vercel.json              # Security headers, redirects, caching
├── assets/apps/             # Personal project app icons
├── assets/fonts/            # Self-hosted woff2 fonts
├── robots.txt               # Search engine directives
├── sitemap.xml              # Page index
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
