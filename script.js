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
        // If the address ever has to wrap, it breaks before the @ rather
        // than leaving "com" on a line of its own.
        var at = email.indexOf('@');
        et.textContent = email.slice(0, at);
        et.appendChild(document.createElement('wbr'));
        et.appendChild(document.createTextNode(email.slice(at)));
    }
    // Printed copies hide the Email me button, so spell the address out.
    var pe = document.getElementById('print-email');
    if (pe) {
        pe.textContent = email;
    }
    // Secondary email calls to action fall back to #contact without script.
    document.querySelectorAll('.js-email-link').forEach(function (link) {
        link.href = 'mailto:' + email;
    });
})();

// Theme toggle. Cycles light -> dark -> system -> light.
// The site is light by default; 'system' is an opt-in the visitor selects,
// not the fallback. See theme-init.js for the pre-paint half of this.
var themeToggle = document.getElementById('themeToggle');
var html = document.documentElement;
var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

var THEME_MODES = ['light', 'dark', 'system'];
var THEME_BAR = { light: '#F2F4F3', dark: '#16212A' };

// The button shows the mode it is currently in and names the mode one press
// away, because no single icon can imply the next state in a three-way cycle.
var THEME_UI = {
    light: { label: 'Theme: light. Switch to dark theme.' },
    dark: { label: 'Theme: dark. Switch to system theme.' },
    system: { label: 'Theme: system. Switch to light theme.' }
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
// forcing light on someone who saved dark or system.
function currentThemeMode() {
    var mode = html.getAttribute('data-theme-mode');
    if (THEME_MODES.indexOf(mode) === -1) {
        try { mode = localStorage.getItem('theme'); } catch (e) { mode = null; }
    }
    return THEME_MODES.indexOf(mode) === -1 ? 'light' : mode;
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

// A "Recommended by" link lands on one quote among eight. Mark it so the
// eye finds it. The stylesheet uses :target only when script is off, because
// pushState does not update :target and a stale one would leave two bars.
function markVoice(target) {
    document.querySelectorAll('figure.voice.is-target').forEach(function (v) {
        v.classList.remove('is-target');
    });
    if (target && target.matches('figure.voice')) {
        target.classList.add('is-target');
    }
}

// A direct link to a quote (/#voice-suggs) still gets its bar.
(function () {
    var h = window.location.hash.slice(1);
    if (h) {
        try { h = decodeURIComponent(h); } catch (e) {}
        markVoice(document.getElementById(h));
    }
})();

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
        markVoice(target);
        target.scrollIntoView({ behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
        target.focus({ preventScroll: true });
    });
});

// Going Back restores the URL and scroll position, but focus would stay on
// the section the visitor navigated away from, so the next Tab would resume
// from off screen. Move it to match wherever Back landed.
window.addEventListener('popstate', function () {
    // An open dropdown would otherwise stay up, covering whatever Back landed on
    setMobileMenu(false);

    // getElementById, not querySelector: a fragment like "#1" is a perfectly
    // legal URL but an invalid CSS selector, and querySelector throws on it.
    var id = window.location.hash.slice(1);
    // location.hash keeps percent-encoding, so "#%68ome" arrives as "%68ome"
    // while it identifies the element with id "home". decodeURIComponent
    // throws on a malformed sequence, so fall back to the raw value.
    if (id) {
        try { id = decodeURIComponent(id); } catch (e) {}
    }
    var target = id ? document.getElementById(id) : null;
    // Only the page's own landmarks are focus destinations. A fragment can
    // name any element, and moving focus to something like the theme toggle
    // because a URL said so is not what "go back to that section" means.
    if (target && !target.matches('section[id], main[id], #education, figure.voice[id], li.role[id]')) {
        target = null;
    }

    // Focus synchronously. Deferring this to measure what the restored
    // viewport shows means racing the browser's scroll restoration:
    // overlapping Back presses queue stale callbacks, and anything the
    // visitor focuses meanwhile gets overridden. A deterministic move to the
    // section the URL now names is worth more than a conditional one, even
    // though a visitor who had scrolled away from that section lands with its
    // start above the viewport.
    // preventScroll leaves the browser's own restoration alone.
    markVoice(target);
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
    mobileMenuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

mobileMenuToggle.addEventListener('click', function () {
    var open = !mobileMenuToggle.classList.contains('active');
    setMobileMenu(open);
    // The list sits before the toggle in the document, so a keyboard user who
    // opens the menu and presses Tab would move past it into the page instead
    // of into it. Hand focus to the first link so the menu is reachable.
    if (open) {
        var first = navLinks.querySelector('a');
        if (first) {
            first.focus();
        }
    }
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

// The veil under the open panel belongs to the list itself, so a click that
// lands on the list (not on one of its links) is a click outside the menu.
document.addEventListener('click', function (e) {
    if (navLinks.classList.contains('active') && (!e.target.closest('nav') || e.target === navLinks)) {
        setMobileMenu(false);
    }
});

// Tabbing out of the nav closes the menu, so the open panel never sits over
// whatever the visitor has moved on to.
var menuNav = document.querySelector('nav');
menuNav.addEventListener('focusout', function (e) {
    // Only when focus actually lands somewhere else: a tap on the menu button
    // in Safari blurs the link without focusing anything (relatedTarget is
    // null), and closing here would let that same tap reopen the menu.
    if (navLinks.classList.contains('active') && e.relatedTarget && !menuNav.contains(e.relatedTarget)) {
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

// Navigation state: the active section link and the nav's bottom rule.
var nav = document.querySelector('nav');
var navLinkElements = document.querySelectorAll('.nav-links a');
var navSections = document.querySelectorAll('main > section[id]');
var scrollTicking = false;

function updateScrollUI() {
    scrollTicking = false;
    var y = window.scrollY;
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    var activeId = '';
    navSections.forEach(function (section) {
        if (section.getBoundingClientRect().top <= window.innerHeight * 0.3) {
            activeId = section.id;
        }
    });
    // The final section can be too short to reach the reading line above.
    // At the end of the document, its navigation item must still be selected.
    if (maxScroll > 0 && y >= maxScroll - 2 && navSections.length) {
        activeId = navSections[navSections.length - 1].id;
    }
    // Sections without their own navigation item select the nearest one.
    if (activeId === 'apps') activeId = 'about';
    navLinkElements.forEach(function (link) {
        var on = link.getAttribute('href') === '#' + activeId;
        link.classList.toggle('active', on);
        if (on) {
            link.setAttribute('aria-current', 'true');
        } else {
            link.removeAttribute('aria-current');
        }
    });
    if (nav) {
        nav.classList.toggle('scrolled', y > 8);
    }
}

function scheduleScrollUI() {
    if (!scrollTicking) {
        scrollTicking = true;
        window.requestAnimationFrame(updateScrollUI);
    }
}
window.addEventListener('scroll', scheduleScrollUI, { passive: true });
window.addEventListener('resize', scheduleScrollUI);
updateScrollUI();

// The scrap chart draws once, the first time most of its plot is on screen.
// The plot, not the x-axis: on a 1366x768 laptop or a phone the axis sits
// right at the foot of the first screen, and waiting for it left the frame
// empty until the visitor scrolled.
// theme-init.js armed it (unless reduced motion is on) and will disarm it
// after 3s unless this script reports in, so a blocked script can never
// leave the chart blank. Without the arm, or without IntersectionObserver,
// the chart is simply shown finished.
(function () {
    var root = document.documentElement;
    root.setAttribute('data-chart-observed', '');
    var chart = document.getElementById('scrap-chart');
    var plot = chart ? chart.querySelector('.sc-plot') : null;
    if (!chart || !plot) return;
    if (!root.classList.contains('chart-armed') || !('IntersectionObserver' in window)) {
        chart.classList.add('is-drawn');
        return;
    }
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                observer.unobserve(entry.target);
                // Two frames, so the undrawn state has been painted at least
                // once and the transition has something to run from.
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        chart.classList.add('is-drawn');
                    });
                });
            }
        });
    }, { threshold: 0.6 });
    observer.observe(plot);
})();

// Paper has no "show more": expand every collapsed role for printing and
// put back only the ones the visitor had closed.
(function () {
    var reopened = [];
    window.addEventListener('beforeprint', function () {
        reopened = [];
        document.querySelectorAll('details:not([open])').forEach(function (d) {
            d.open = true;
            reopened.push(d);
        });
    });
    window.addEventListener('afterprint', function () {
        reopened.forEach(function (d) { d.open = false; });
        reopened = [];
    });
})();
