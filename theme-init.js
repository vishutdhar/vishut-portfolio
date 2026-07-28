// Sets the theme before first paint to avoid a flash of the wrong theme.
// Loaded synchronously in <head>, ahead of the stylesheet.
//
// The stored value is a MODE, one of 'light' | 'dark' | 'system'. Anything
// else, including a visitor who has never touched the toggle, means dark:
// this site is dark by default and only follows the operating system when
// the visitor has explicitly asked it to.
//
// data-theme carries the RESOLVED theme, so the stylesheet only ever deals
// with 'light' or 'dark'. data-theme-mode carries the stored mode, so
// script.js can tell 'dark' from 'system that currently resolves to dark'
// without re-deriving the default.
(function () {
    var mode = null;
    try { mode = localStorage.getItem('theme'); } catch (e) {}
    if (mode !== 'light' && mode !== 'dark' && mode !== 'system') {
        mode = 'dark';
    }
    var theme = mode;
    if (mode === 'system') {
        theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-theme-mode', mode);
})();
