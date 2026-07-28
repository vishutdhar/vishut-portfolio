// Contact info obfuscation - prevents bots from scraping
(function () {
    var p = [50, 52, 56, 45, 50, 53, 50, 45, 52, 56, 51, 49];
    var e = [118, 105, 115, 104, 117, 116, 100, 104, 97, 114, 49, 57, 57, 51, 64, 103, 109, 97, 105, 108, 46, 99, 111, 109];
    var phone = String.fromCharCode.apply(null, p);
    var email = String.fromCharCode.apply(null, e);
    var pl = document.getElementById('phone-link');
    var pt = document.getElementById('phone-text');
    var el = document.getElementById('email-link');
    var et = document.getElementById('email-text');
    if (pl && pt) {
        pl.href = 'tel:' + phone;
        pt.textContent = '(' + phone.substring(0, 3) + ') ' + phone.substring(4);
    }
    if (el && et) {
        el.href = 'mailto:' + email;
        et.textContent = email;
    }
})();

// Theme toggle. Cycles dark -> light -> system -> dark.
// The site is dark by default; 'system' is an opt-in the visitor selects,
// not the fallback. See theme-init.js for the pre-paint half of this.
var themeToggle = document.getElementById('themeToggle');
var html = document.documentElement;
var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

var THEME_MODES = ['dark', 'light', 'system'];
var THEME_BAR = { dark: '#0F0F0E', light: '#FAFAF8' };

// The button shows the mode it is currently in and names the mode one press
// away, because no single icon can imply the next state in a three-way cycle.
var THEME_UI = {
    dark: { label: 'Theme: dark. Switch to light theme.' },
    light: { label: 'Theme: light. Switch to system theme.' },
    system: { label: 'Theme: system. Switch to dark theme.' }
};

function resolveTheme(mode) {
    if (mode === 'system') {
        return prefersDark.matches ? 'dark' : 'light';
    }
    return mode;
}

function applyThemeMode(mode) {
    var theme = resolveTheme(mode);
    html.setAttribute('data-theme', theme);
    // styles.css keys the visible icon off this attribute, so the control is
    // right from the first frame rather than after this deferred script runs
    html.setAttribute('data-theme-mode', mode);

    themeToggle.setAttribute('aria-label', THEME_UI[mode].label);
    themeToggle.setAttribute('title', THEME_UI[mode].label);

    var meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) {
        meta.setAttribute('content', THEME_BAR[theme]);
    }
}

// theme-init.js normally leaves the mode on the root element. If it was
// blocked or failed to load, fall back to storage rather than silently
// forcing dark on someone who saved light or system.
function currentThemeMode() {
    var mode = html.getAttribute('data-theme-mode');
    if (THEME_MODES.indexOf(mode) === -1) {
        try { mode = localStorage.getItem('theme'); } catch (e) { mode = null; }
    }
    return THEME_MODES.indexOf(mode) === -1 ? 'dark' : mode;
}

// theme-init.js already set the attributes before paint; sync the toggle UI to them
applyThemeMode(currentThemeMode());

themeToggle.addEventListener('click', function () {
    var next = THEME_MODES[(THEME_MODES.indexOf(currentThemeMode()) + 1) % THEME_MODES.length];
    applyThemeMode(next);
    try { localStorage.setItem('theme', next); } catch (e) {}
});

// Follow the operating system only while the visitor has chosen 'system'
function onSystemThemeChange() {
    if (currentThemeMode() === 'system') {
        applyThemeMode('system');
    }
}

// Older Safari only implements addListener on MediaQueryList
if (typeof prefersDark.addEventListener === 'function') {
    prefersDark.addEventListener('change', onSystemThemeChange);
} else if (typeof prefersDark.addListener === 'function') {
    prefersDark.addListener(onSystemThemeChange);
}

// Smooth scrolling for navigation links.
// preventDefault suppresses the browser's own hash update, so push it back on
// afterwards: without this the address bar never changes and Back leaves the
// page instead of returning to the previous section.
document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
        var href = this.getAttribute('href');
        // getElementById for the same reason as the popstate handler below:
        // the contact rows ship as href="#" until the obfuscation script
        // rewrites them, and querySelector('#') throws on a bare hash.
        var target = href.length > 1 ? document.getElementById(href.slice(1)) : null;
        if (!target) return;
        e.preventDefault();
        // Push the new entry BEFORE scrolling. The browser stores the current
        // scroll offset on the entry being left, so scrolling first would
        // record the destination on the outgoing entry and Back would leave
        // the visitor exactly where they pressed it.
        if (window.history && window.history.pushState && window.location.hash !== href) {
            window.history.pushState(null, '', href);
        }
        target.scrollIntoView({ behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
        target.focus({ preventScroll: true });
    });
});

// Going Back restores the URL and scroll position, but focus would stay on
// the section the visitor navigated away from, so the next Tab would resume
// from off screen. Move it to match wherever Back landed.
window.addEventListener('popstate', function () {
    // getElementById, not querySelector: a fragment like "#1" is a perfectly
    // legal URL but an invalid CSS selector, and querySelector throws on it.
    var id = window.location.hash.slice(1);
    var target = id ? document.getElementById(id) : null;
    // Only the page's own landmarks are focus destinations. A fragment can
    // name any element, and moving focus to something like the theme toggle
    // because a URL said so is not what "go back to that section" means.
    if (target && !target.matches('section[id], main[id]')) {
        target = null;
    }
    if (target) {
        target.focus({ preventScroll: true });
    } else if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
    }
});

// Mobile menu toggle
var mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
var navLinks = document.querySelector('.nav-links');

function setMobileMenu(open) {
    mobileMenuToggle.classList.toggle('active', open);
    navLinks.classList.toggle('active', open);
    mobileMenuToggle.setAttribute('aria-expanded', open);
}

mobileMenuToggle.addEventListener('click', function () {
    setMobileMenu(!mobileMenuToggle.classList.contains('active'));
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-links a').forEach(function (link) {
    link.addEventListener('click', function () {
        setMobileMenu(false);
    });
});

// Close mobile menu on Escape or when clicking outside the nav
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navLinks.classList.contains('active')) {
        setMobileMenu(false);
        mobileMenuToggle.focus();
    }
});

document.addEventListener('click', function (e) {
    if (navLinks.classList.contains('active') && !e.target.closest('nav')) {
        setMobileMenu(false);
    }
});

// The open state lives only in these classes, so widening past the breakpoint
// leaves it set: the menu would spring back open on returning to a narrow
// viewport, which a tablet does simply by rotating. Must match the breakpoint
// in styles.css.
var mobileMenuQuery = window.matchMedia('(max-width: 960px)');

function onMobileMenuBreakpoint(event) {
    if (!event.matches) {
        setMobileMenu(false);
    }
}

if (typeof mobileMenuQuery.addEventListener === 'function') {
    mobileMenuQuery.addEventListener('change', onMobileMenuBreakpoint);
} else if (typeof mobileMenuQuery.addListener === 'function') {
    mobileMenuQuery.addListener(onMobileMenuBreakpoint);
}

// Nav shadow, scroll progress, and back-to-top visibility (rAF-throttled)
var nav = document.querySelector('nav');
var scrollProgress = document.getElementById('scrollProgress');
var backToTopButton = document.getElementById('backToTop');
var scrollTicking = false;

function updateScrollUI() {
    scrollTicking = false;
    var y = window.scrollY;
    nav.classList.toggle('scrolled', y > 50);
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    var progress = maxScroll > 0 ? Math.min(Math.max(y / maxScroll, 0), 1) : 0;
    scrollProgress.style.transform = 'scaleX(' + progress + ')';
    backToTopButton.classList.toggle('visible', y > 500);
}

window.addEventListener('scroll', function () {
    if (!scrollTicking) {
        scrollTicking = true;
        window.requestAnimationFrame(updateScrollUI);
    }
}, { passive: true });
updateScrollUI();

// Active navigation highlighting via IntersectionObserver
var navLinkElements = document.querySelectorAll('.nav-links a');

var navObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
        if (entry.isIntersecting) {
            var id = entry.target.getAttribute('id');
            navLinkElements.forEach(function (link) {
                link.classList.toggle('active', link.getAttribute('href') === '#' + id);
            });
        }
    });
}, { rootMargin: '-30% 0px -60% 0px' });

document.querySelectorAll('section[id]').forEach(function (section) {
    navObserver.observe(section);
});

// Back to top button click handler
backToTopButton.addEventListener('click', function () {
    window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion.matches ? 'auto' : 'smooth'
    });
});

// Scroll Reveal Animation
var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -20px 0px'
});

// Add reveal class to sections and observe them
document.querySelectorAll('section:not(#home)').forEach(function (section) {
    section.classList.add('reveal');
    revealObserver.observe(section);
});

// Add stagger animation to grids
document.querySelectorAll('.projects-grid, .education-grid, .testimonials-grid, .skills-grid').forEach(function (grid) {
    grid.classList.add('stagger-children');
    revealObserver.observe(grid);
});

// Add reveal to experience items
document.querySelectorAll('.experience-item').forEach(function (item, index) {
    item.classList.add('reveal');
    item.style.transitionDelay = (index * 0.15) + 's';
    revealObserver.observe(item);
});

// Matches the number inside a stat, keeping whatever wraps it ($, %, +).
var STAT_NUMBER = /-?\d+(?:\.\d+)?/;

// Animate a statistic from start to end, rebuilding the element's text each
// frame from the markup's own prefix, suffix, and decimal places so the last
// frame lands exactly on the value the page was authored with.
function animateValue(element, start, end, duration) {
    var text = element.textContent;
    var match = text.match(STAT_NUMBER);
    if (!match) return;

    var prefix = text.slice(0, match.index);
    var suffix = text.slice(match.index + match[0].length);
    // Capped at 20: a double carries no meaningful precision past that, and
    // toFixed throws once asked for more than 100.
    var decimals = Math.min((match[0].split('.')[1] || '').length, 20);

    var startTimestamp = null;
    var step = function (timestamp) {
        if (!startTimestamp) startTimestamp = timestamp;
        var progress = Math.min((timestamp - startTimestamp) / duration, 1);
        var value = progress * (end - start) + start;

        element.textContent = prefix + value.toFixed(decimals) + suffix;

        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Create observer for stats; skip the count-up entirely under reduced motion
// (the markup already contains the final values)
var statsObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
            entry.target.dataset.animated = 'true';
            if (prefersReducedMotion.matches) return;
            // Hero stat numbers
            var statNumbers = entry.target.querySelectorAll('.stat-number');
            statNumbers.forEach(function (stat) {
                var match = stat.textContent.match(STAT_NUMBER);
                if (!match) return;
                // Stats count up from zero unless the markup names a starting
                // value, which the scrap rate does so it counts down instead.
                var from = parseFloat(stat.dataset.countFrom);
                animateValue(stat, isFinite(from) ? from : 0, parseFloat(match[0]), 800);
            });
            // Project metric values
            var metricValues = entry.target.querySelectorAll('.metric-value');
            metricValues.forEach(function (metric) {
                var text = metric.textContent.trim();
                var end, fmt;
                if (text.includes('$')) {
                    end = parseInt(text.replace(/[^0-9]/g, ''), 10);
                    fmt = function (v) { return '$' + Math.floor(v) + 'M'; };
                } else if (text.includes('%')) {
                    end = parseInt(text.replace(/[^0-9]/g, ''), 10);
                    fmt = function (v) { return Math.floor(v) + '%'; };
                } else {
                    end = parseInt(text, 10) || 0;
                    fmt = function (v) { return '' + Math.floor(v); };
                }
                if (end > 0) {
                    var startTime = null;
                    var step = function (ts) {
                        if (!startTime) startTime = ts;
                        var p = Math.min((ts - startTime) / 800, 1);
                        metric.textContent = fmt(p * end);
                        if (p < 1) requestAnimationFrame(step);
                    };
                    requestAnimationFrame(step);
                }
            });
        }
    });
}, { threshold: 0 });

// Observe hero stats
var heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    statsObserver.observe(heroStats);
}

// Animate project metrics
document.querySelectorAll('.project-card').forEach(function (card) {
    statsObserver.observe(card);
});

// Cursor light effect on hero
(function () {
    var hero = document.querySelector('.hero');
    var light = document.querySelector('.cursor-light');
    if (!hero || !light) return;
    if (prefersReducedMotion.matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    hero.addEventListener('pointermove', function (e) {
        var rect = hero.getBoundingClientRect();
        light.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
        light.style.setProperty('--my', (e.clientY - rect.top) + 'px');
        light.style.opacity = '1';
    });
    hero.addEventListener('pointerleave', function () {
        light.style.opacity = '0';
    });
})();
