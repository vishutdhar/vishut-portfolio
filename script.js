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

// Motion. The same curves as the tokens in styles.css, for WAAPI. Every
// animation below asks motionOK() when it runs, not once at boot, so turning
// on reduced motion mid-visit takes effect at once.
var EASE_OUT = 'cubic-bezier(.2, 0, 0, 1)';
var EASE_IN = 'cubic-bezier(.4, 0, 1, 1)';
var EASE_INOUT = 'cubic-bezier(.4, 0, .2, 1)';

function motionOK() {
    return !prefersReducedMotion.matches;
}

// If reduced motion is switched on mid-visit, land everything that is moving.
function onReducedMotionChange() {
    if (prefersReducedMotion.matches && document.getAnimations) {
        document.getAnimations().forEach(function (a) {
            try { a.finish(); } catch (e) { a.cancel(); }
        });
    }
}

if (typeof prefersReducedMotion.addEventListener === 'function') {
    prefersReducedMotion.addEventListener('change', onReducedMotionChange);
} else if (typeof prefersReducedMotion.addListener === 'function') {
    prefersReducedMotion.addListener(onReducedMotionChange);
}

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

var THEME_ICON = { light: 'themeIconLight', dark: 'themeIconDark', system: 'themeIconSystem' };

// The old icon turns out and the new one turns in, both clockwise, in the
// same cell. No fill: when they end, the stylesheet's states are the same.
function animateToggleIcon(prev, next) {
    if (prev === next || !motionOK()) return;
    var out = document.getElementById(THEME_ICON[prev]);
    var inc = document.getElementById(THEME_ICON[next]);
    if (!out || !inc || !inc.animate) return;
    out.animate([
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'rotate(90deg) scale(.6)' }
    ], { duration: 160, easing: EASE_IN });
    inc.animate([
        { opacity: 0, transform: 'rotate(-90deg) scale(.6)' },
        { opacity: 1, transform: 'none' }
    ], { duration: 240, delay: 60, easing: EASE_OUT, fill: 'backwards' });
}

// A change the visitor can see starts at the bar that holds the button: the
// bar changes at once, then the new sheet is wiped down the page from the
// bar's bottom rule, hard-edged, like a sheet or a shift changing over. A
// mode change that leaves the page as it was (dark -> system on a dark OS)
// only turns the icon. Without View Transitions, or with reduced motion, the
// switch is instant; there are deliberately no colour transitions on the page.
//
// A press made while the wipe runs must not be lost. The mode it acts on is
// the one already on its way (pendingMode), not the attribute the
// asynchronous commit has yet to write. And during a View Transition the
// browser hit-tests every click to <html>, so a click that lands there is
// replayed on the control under the pointer once the wipe is cut short.
var pendingMode = null;
var activeVT = null;

function switchTheme(next, fromEl) {
    var prev = pendingMode || currentThemeMode();
    if (activeVT) activeVT.skipTransition();
    var commit = function () {
        if (pendingMode === next) pendingMode = null;
        applyThemeMode(next);
        try { localStorage.setItem('theme', next); } catch (e) {}
        animateToggleIcon(prev, next);
    };
    if (resolveTheme(prev) === resolveTheme(next) || !document.startViewTransition || !motionOK()) {
        commit();
        return;
    }
    var bar = document.querySelector('nav') || fromEl;
    var rule = Math.max(0, Math.round(bar.getBoundingClientRect().bottom));
    pendingMode = next;
    var vt = document.startViewTransition(commit);
    activeVT = vt;
    vt.finished.catch(function () {}).then(function () {
        if (activeVT === vt) activeVT = null;
    });
    vt.ready.then(function () {
        document.documentElement.animate({
            clipPath: [
                'inset(0px 0px calc(100% - ' + rule + 'px) 0px)',
                'inset(0px 0px 0px 0px)'
            ]
        }, {
            duration: 420,
            easing: EASE_INOUT,
            pseudoElement: '::view-transition-new(root)'
        });
    }).catch(function () {});
}

themeToggle.addEventListener('click', function () {
    var from = pendingMode || currentThemeMode();
    var next = THEME_MODES[(THEME_MODES.indexOf(from) + 1) % THEME_MODES.length];
    switchTheme(next, themeToggle);
});

document.addEventListener('click', function (e) {
    if (!activeVT || e.target !== html) return;
    e.stopPropagation();
    var x = e.clientX;
    var y = e.clientY;
    var v = activeVT;
    v.skipTransition();
    v.finished.catch(function () {}).then(function () {
        var t = document.elementFromPoint(x, y);
        var c = t && t.closest('a, button, summary');
        if (c) c.click();
    });
}, true);

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

// A followed link lands on one quote among eight, or on one role among
// five. Mark where it landed: once the scroll has settled, a bar is drawn
// down the gutter, held, then faded (styles.css), and the class is removed
// when it has gone, so there is never more than one. With reduced motion the
// bar is simply there and stays, as :target does without script. The
// stylesheet uses :target only when script is off, because pushState does
// not update :target and a stale one would leave two bars.
var markToken = 0;

function clearTarget() {
    document.querySelectorAll('.is-target').forEach(function (el) {
        el.classList.remove('is-target');
    });
}

// Calls back once a scroll that may or may not have started has come to
// rest: when scrollY has held for three frames, or sooner on a scrollend
// that is confirmed by two still frames. A scrollend can be left over from
// the visitor's own wheel or trackpad scroll while this one is still in
// flight, so it is only a hint, never taken on trust. No movement within
// 120ms means there was nothing to scroll.
function whenScrollSettles(cb) {
    var done = false;
    var t0 = performance.now();
    var last = window.scrollY;
    var moved = false;
    var still = 0;
    function finish() {
        if (done) return;
        done = true;
        window.removeEventListener('scrollend', onEnd);
        cb();
    }
    function onEnd() {
        var y0 = window.scrollY;
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                if (window.scrollY === y0) finish();
            });
        });
    }
    if ('onscrollend' in window) {
        window.addEventListener('scrollend', onEnd);
    }
    (function poll() {
        if (done) return;
        var y = window.scrollY;
        if (y !== last) {
            moved = true;
            still = 0;
            last = y;
        } else {
            still++;
        }
        var t = performance.now() - t0;
        if ((moved && still >= 3) || (!moved && t > 120) || t > 1200) {
            finish();
        } else {
            requestAnimationFrame(poll);
        }
    })();
}

function markTarget(target, afterScroll) {
    var token = ++markToken;
    clearTarget();
    if (!target || !target.matches('figure.voice, li.role')) return;
    function draw() {
        if (token !== markToken) return;
        // Back can restore a scroll position far from the fragment. A bar
        // drawn off screen answers nothing the visitor can see, so skip it
        // (focus still moves; see the popstate handler).
        if (afterScroll && motionOK()) {
            var r = target.getBoundingClientRect();
            if (r.bottom <= 0 || r.top >= window.innerHeight) return;
        }
        // Restart the drawing even on a repeat click on the same name.
        target.classList.remove('is-target');
        void target.offsetWidth;
        target.classList.add('is-target');
    }
    if (afterScroll && motionOK()) {
        whenScrollSettles(draw);
    } else {
        draw();
    }
}

document.addEventListener('animationend', function (e) {
    if (e.animationName === 'mark-fade' && e.target.classList) {
        e.target.classList.remove('is-target');
    }
});

// A direct link to a quote or role (/#voice-suggs) still gets its bar, once
// the browser has made its own jump there.
(function () {
    var h = window.location.hash.slice(1);
    if (!h) return;
    try { h = decodeURIComponent(h); } catch (e) {}
    var el = document.getElementById(h);
    if (!el) return;
    function mark() {
        requestAnimationFrame(function () { markTarget(el, false); });
    }
    if (document.readyState === 'complete') {
        mark();
    } else {
        window.addEventListener('load', mark, { once: true });
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
        target.scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto' });
        target.focus({ preventScroll: true });
        markTarget(target, true);
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
    markTarget(target, true);
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
    // The desktop indicator exists only above the breakpoint.
    if (typeof updateScrollUI === 'function') {
        indicatorDirty = true;
        scheduleScrollUI();
    }
}

if (typeof mobileMenuQuery.addEventListener === 'function') {
    mobileMenuQuery.addEventListener('change', onMobileMenuBreakpoint);
} else if (typeof mobileMenuQuery.addListener === 'function') {
    mobileMenuQuery.addListener(onMobileMenuBreakpoint);
}

// Navigation state: the active section link, the indicator under it, and
// the nav's bottom rule.
var nav = document.querySelector('nav');
var navLinkElements = document.querySelectorAll('.nav-links a');
var navSections = document.querySelectorAll('main > section[id]');
var scrollTicking = false;
var lastActiveId = null;
var indicatorLink = null;
var indicatorPlaced = false;
var indicatorDirty = true;

function setIndicator(props) {
    Object.keys(props).forEach(function (k) {
        navLinks.style.setProperty(k, props[k]);
    });
}

// Desktop bar only: one 2px bar slides and resizes to the current link.
// Arriving from nothing it grows rightward from the link's left edge; going
// back to the hero it shrinks away where it is.
function placeIndicator(link) {
    if (mobileMenuQuery.matches) {
        navLinks.classList.remove('has-indicator');
        indicatorLink = null;
        indicatorPlaced = false;
        return;
    }
    navLinks.classList.add('has-indicator');
    if (!link) {
        setIndicator({ '--ind-s': '0', '--ind-o': '0' });
        indicatorLink = null;
        indicatorPlaced = true;
        return;
    }
    var pos = {
        '--ind-x': link.offsetLeft + 'px',
        '--ind-y': (link.offsetTop + link.offsetHeight + 3) + 'px'
    };
    var size = { '--ind-s': String(link.offsetWidth / 100), '--ind-o': '1' };
    if (!indicatorPlaced || !indicatorLink) {
        // First placement on load is simply there; arriving from the hero
        // grows in place. Either way the position jumps without a slide.
        navLinks.classList.add('ind-snap');
        setIndicator(pos);
        if (indicatorPlaced) {
            setIndicator({ '--ind-s': '0', '--ind-o': '0' });
        } else {
            setIndicator(size);
        }
        getComputedStyle(navLinks, '::before').transform;
        navLinks.classList.remove('ind-snap');
    } else {
        setIndicator(pos);
    }
    setIndicator(size);
    indicatorLink = link;
    indicatorPlaced = true;
}

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
    // The final section is too short to reach the reading line above on
    // most screens. Select it once its heading is comfortably in view, which
    // can only happen after everything above it has scrolled up.
    var last = navSections[navSections.length - 1];
    var lastHead = last && last.querySelector('h2');
    if (lastHead) {
        var hr = lastHead.getBoundingClientRect();
        var navH = nav ? nav.offsetHeight : 0;
        if (hr.top < window.innerHeight * 0.7 && hr.bottom > navH) {
            activeId = last.id;
        }
    }
    // Backstop: at the end of the document the last item is selected.
    if (maxScroll > 0 && y >= maxScroll - 2 && last) {
        activeId = last.id;
    }
    // Sections without their own navigation item select the nearest one.
    if (activeId === 'apps') activeId = 'about';
    var activeLink = null;
    navLinkElements.forEach(function (link) {
        var on = link.getAttribute('href') === '#' + activeId;
        link.classList.toggle('active', on);
        if (on) {
            link.setAttribute('aria-current', 'true');
            activeLink = link;
        } else {
            link.removeAttribute('aria-current');
        }
    });
    if (activeId !== lastActiveId || indicatorDirty) {
        lastActiveId = activeId;
        indicatorDirty = false;
        placeIndicator(activeLink);
    }
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
window.addEventListener('resize', function () {
    indicatorDirty = true;
    scheduleScrollUI();
});
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
        indicatorDirty = true;
        scheduleScrollUI();
    });
}
updateScrollUI();

// The scrap chart plots itself once: calibrate, run, change, run, report
// (timeline in styles.css). theme-init.js armed it (unless reduced motion is
// on) and will disarm it after 3s unless this script reports in, so a
// blocked script can never leave the chart blank. Without the arm, or
// without IntersectionObserver, the chart is simply shown finished.
//
// The sequence splits at its natural beat, the stage break, and each half
// plays only when what it ends on is on screen:
// - calibrate and run 1 end on the red 5% level (watched through the "5%"
//   tick label, which sits on that level);
// - change, run 2 and report end on "$15 million saved a year" (watched
//   through the report itself, or through the whole figure).
// "On screen" means below the sticky nav, not behind it.
// Load mode: the report is on screen at first paint (1440x900, common
// laptops such as 1366x768), so the whole sequence plays as soon as the page
// is ready; the last few pixels of run 2 may draw just below the fold.
// Split: only the 5% level is on screen (1280x720, most phones), so the
// frame is ruled in and the process runs out of control at 5%, then holds
// at the stage break until the report is in view. The first view is the
// before condition, not an empty frame.
// Already passed: a figure that is above the viewport at the first callback
// (restored scroll, a deep link, Back) or that comes back into view top edge
// first is shown finished at once, never as an empty frame.
// Scroll: not even the 5% level is on screen, so the frame is shown at once
// (a partly visible chart never looks like a hole under its title) and each
// half runs when its ending comes into view. Nothing ever replays.
(function () {
    var root = document.documentElement;
    root.setAttribute('data-chart-observed', '');
    var chart = document.getElementById('scrap-chart');
    var fig = chart ? chart.querySelector('.sc-figure') : null;
    var level = chart ? chart.querySelector('.sc-y-5') : null;
    var report = chart ? chart.querySelector('.sc-result') : null;
    if (!chart || !fig || !level || !report) return;
    if (!root.classList.contains('chart-armed') || !('IntersectionObserver' in window)) {
        chart.classList.add('is-drawn');
        return;
    }

    // Reduced motion switched on mid-visit: show the finished chart now,
    // not whenever it would have been released.
    function disarm() {
        if (prefersReducedMotion.matches) root.classList.remove('chart-armed');
    }
    if (typeof prefersReducedMotion.addEventListener === 'function') {
        prefersReducedMotion.addEventListener('change', disarm);
    } else if (typeof prefersReducedMotion.addListener === 'function') {
        prefersReducedMotion.addListener(disarm);
    }

    // Releases happen in order, one after another.
    var queue = Promise.resolve();
    function then(fn) {
        queue = queue.then(fn);
    }
    // When the second half may start: the stage break on the timeline, so a
    // fast scroll can never start the change while run 1 is still running.
    var holdUntil = 0;
    var released = 0; // 0 nothing, 1 calibrate + run 1, 2 everything
    var first = true;
    var figIn = false;
    var levelIn = false;
    var reportIn = false;

    // Wait (briefly) for Archivo before the first release, so a late font
    // swap cannot move the chart mid-sequence. The font is preloaded, so
    // this is normally immediate.
    function fontGate() {
        var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        return Promise.race([fonts, new Promise(function (r) { setTimeout(r, 300); })]);
    }

    function releaseRun1(ruled) {
        released = 1;
        then(function () {
            if (ruled) chart.classList.add('run-frame');
            chart.classList.add('run-before');
            // 620ms on the full timeline; 340ms when the frame was shown at
            // once (--t: -280ms).
            holdUntil = performance.now() + (ruled ? 620 : 340);
        });
    }

    function releaseAll(ruled) {
        var held = released === 1;
        released = 2;
        then(function () {
            var wait = held ? holdUntil - performance.now() : 0;
            return wait > 0 ? new Promise(function (r) { setTimeout(r, wait); }) : null;
        });
        then(function () {
            if (ruled) chart.classList.add('run-frame');
            chart.classList.add('is-drawn');
        });
    }

    // Whole figure in view. A figure taller than the viewport (heavy zoom)
    // can never reach 98%, so filling most of the viewport also counts.
    function inView(e) {
        if (e.intersectionRatio >= 0.98) return true;
        var vh = e.rootBounds ? e.rootBounds.height : window.innerHeight;
        return e.boundingClientRect.height > vh && e.intersectionRect.height >= vh * 0.8;
    }

    // Visibility is measured below the sticky nav: the part of the page
    // behind the bar is not in view.
    var nav = document.querySelector('nav');
    var navH = nav ? nav.offsetHeight : 0;

    var io = new IntersectionObserver(function (entries) {
        var fe = null;
        entries.forEach(function (e) {
            if (e.target === fig) {
                fe = e;
                figIn = inView(e);
            } else if (e.target === report) {
                reportIn = e.isIntersecting && e.intersectionRatio >= 0.99;
            } else {
                levelIn = e.isIntersecting && e.intersectionRatio >= 0.99;
            }
        });
        var initial = first;
        first = false;
        // Already scrolled past, or coming back from below: show it finished.
        if (fe && !figIn && !reportIn && released < 2) {
            var top = fe.rootBounds ? fe.rootBounds.top : 0;
            if (fe.boundingClientRect.top < top && (initial || fe.isIntersecting)) {
                io.disconnect();
                chart.classList.add('is-drawn');
                root.classList.remove('chart-armed');
                return;
            }
        }
        if (initial) {
            if (figIn || levelIn || reportIn) {
                then(fontGate);
            } else {
                chart.classList.add('frame-ready');
            }
        }
        // The frame is ruled in only if it was not already shown.
        var ruled = !chart.classList.contains('frame-ready');
        if (figIn || reportIn) {
            io.disconnect();
            releaseAll(ruled && released === 0);
            return;
        }
        if (levelIn && released === 0) {
            releaseRun1(ruled);
        }
    }, {
        rootMargin: '-' + navH + 'px 0px 0px 0px',
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 0.98, 0.99, 1]
    });
    io.observe(fig);
    io.observe(level);
    io.observe(report);
})();

// "N more responsibilities": the list opens to its real height and the new
// bullets settle in, one after another; closing is quicker and plainer.
// One measured-height controller for every browser (no ::details-content
// path, which would double-animate in Chrome). With reduced motion, or
// without WAAPI, the native toggle is left alone and is instant.
var detailsAnims = new WeakMap();

// Closing flips `open` at the press, so assistive tech hears "collapsed"
// when the glyph turns, not when the list has finished shrinking. Where
// ::details-content exists, .is-closing keeps the closed content rendered
// (styles.css) while it shrinks. Elsewhere `open` has to stay true until the
// end, so the summary carries aria-expanded="false" meanwhile; it is removed
// once `open` is really false (or the close is abandoned).
var HOLD_CLOSED = !!(window.CSS && CSS.supports && CSS.supports('selector(::details-content)'));

function clearExpanded(d) {
    var s = d.querySelector('summary');
    if (s) s.removeAttribute('aria-expanded');
}

function stopDetails(d) {
    var list = detailsAnims.get(d);
    if (list) {
        list.forEach(function (a) { a.cancel(); });
    }
    detailsAnims.delete(d);
    clearExpanded(d);
}

function openDuration(h) {
    return Math.max(240, Math.min(420, 180 + 0.3 * h));
}

function openDetails(d, ul, fromH) {
    d.classList.remove('is-closing');
    d.open = true;
    d.classList.add('is-animating');
    var h = ul.getBoundingClientRect().height;
    var pad = getComputedStyle(ul).paddingTop;
    var anims = [];
    var grow = ul.animate([
        { height: fromH + 'px', paddingTop: fromH > 0 ? pad : '0px' },
        { height: h + 'px', paddingTop: pad }
    ], { duration: openDuration(h), easing: EASE_OUT });
    anims.push(grow);
    if (fromH === 0) {
        Array.prototype.forEach.call(ul.children, function (li, i) {
            anims.push(li.animate([
                { opacity: 0, transform: 'translateY(-6px)' },
                { opacity: 1, transform: 'none' }
            ], { duration: 240, delay: 60 + 40 * i, easing: EASE_OUT, fill: 'backwards' }));
        });
    }
    grow.onfinish = function () {
        if (detailsAnims.get(d) !== anims) return;
        d.classList.remove('is-animating');
        detailsAnims.delete(d);
    };
    detailsAnims.set(d, anims);
}

function closeDetails(d, ul, fromH) {
    // The glyph and the accessible state answer at once; the list follows.
    d.classList.add('is-closing', 'is-animating');
    if (HOLD_CLOSED) {
        d.open = false;
    } else {
        var summary = d.querySelector('summary');
        if (summary) summary.setAttribute('aria-expanded', 'false');
    }
    var natural = ul.scrollHeight;
    var pad = getComputedStyle(ul).paddingTop;
    var shrink = ul.animate([
        { height: fromH + 'px', paddingTop: pad },
        { height: '0px', paddingTop: '0px' }
    ], { duration: Math.max(200, 0.8 * openDuration(natural)), easing: EASE_IN });
    var fade = ul.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'linear', fill: 'forwards' });
    var anims = [shrink, fade];
    shrink.onfinish = function () {
        if (detailsAnims.get(d) !== anims) return;
        d.open = false;
        d.classList.remove('is-closing', 'is-animating');
        fade.cancel();
        detailsAnims.delete(d);
        clearExpanded(d);
    };
    detailsAnims.set(d, anims);
}

document.querySelectorAll('.role-details').forEach(function (d) {
    var summary = d.querySelector('summary');
    var ul = d.querySelector('ul');
    if (!summary || !ul || !ul.animate) return;
    summary.addEventListener('click', function (e) {
        if (!motionOK()) return;
        e.preventDefault();
        var closing = d.classList.contains('is-closing');
        // Read where it is now, then stop, then head the other way from there.
        var fromH = d.open || closing ? ul.getBoundingClientRect().height : 0;
        stopDetails(d);
        if (d.open && !closing) {
            closeDetails(d, ul, fromH);
        } else {
            openDetails(d, ul, closing ? fromH : 0);
        }
    });
});

// Land any details animation where it was heading.
function settleDetails() {
    document.querySelectorAll('.role-details').forEach(function (d) {
        if (!detailsAnims.has(d)) return;
        var closing = d.classList.contains('is-closing');
        stopDetails(d);
        d.classList.remove('is-closing', 'is-animating');
        if (closing) d.open = false;
    });
}

// Paper has no "show more": expand every collapsed role for printing and
// put back only the ones the visitor had closed.
(function () {
    var reopened = [];
    window.addEventListener('beforeprint', function () {
        settleDetails();
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
