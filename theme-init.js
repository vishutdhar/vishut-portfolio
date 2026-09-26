// Sets the theme before first paint to avoid a flash of the wrong theme.
// Loaded synchronously in <head>, ahead of the stylesheet.
//
// The stored value is a MODE, one of 'light' | 'dark' | 'system'. Anything
// else, including a visitor who has never touched the toggle, means light:
// the page is set on a pale drafting-film ground by default and only follows
// the operating system when the visitor has explicitly asked it to.
// (To make dark the default again, change the fallback below to 'dark' and
// the one in currentThemeMode() in script.js.)
//
// data-theme carries the RESOLVED theme, so the stylesheet only ever deals
// with 'light' or 'dark'. data-theme-mode carries the stored mode, so
// script.js can tell 'dark' from 'system that currently resolves to dark'
// without re-deriving the default.
(function () {
    var mode = null;
    try { mode = localStorage.getItem('theme'); } catch (e) {}
    if (mode !== 'light' && mode !== 'dark' && mode !== 'system') {
        mode = 'light';
    }
    var theme = mode;
    if (mode === 'system') {
        theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-theme-mode', mode);

    // Script is running, so the contact links script.js fills in will exist.
    // Without this class the stylesheet hides them instead of showing empty links.
    root.classList.add('js');

    // The scrap chart draws itself once, the first time it is seen. Arm that
    // here, before paint, so the lines never flash in and then vanish. The
    // stylesheet's default is the finished chart, so if script.js never
    // reports in (blocked, failed), the failsafe disarms and shows it.
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
        root.classList.add('chart-armed');
        setTimeout(function () {
            if (!root.hasAttribute('data-chart-observed')) {
                root.classList.remove('chart-armed');
            }
        }, 3000);
    }

    // The meta tag is declared above this script, so it already exists. Point
    // it at the resolved theme now rather than leaving the markup's light
    // value for the deferred script to correct.
    var meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) {
        meta.setAttribute('content', theme === 'dark' ? '#16212A' : '#F2F4F3');
    }
})();
