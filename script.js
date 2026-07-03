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

// Dark Mode Toggle
var themeToggle = document.getElementById('themeToggle');
var darkIcon = document.getElementById('darkIcon');
var lightIcon = document.getElementById('lightIcon');
var html = document.documentElement;
var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    darkIcon.classList.toggle('hidden', theme === 'dark');
    lightIcon.classList.toggle('hidden', theme !== 'dark');
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    var meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) {
        meta.setAttribute('content', theme === 'dark' ? '#141413' : '#FAFAF8');
    }
}

// theme-init.js already set the attribute before paint; sync the toggle UI to it
applyTheme(html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

themeToggle.addEventListener('click', function () {
    var newTheme = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    try { localStorage.setItem('theme', newTheme); } catch (e) {}
});

// Follow system theme changes while the visitor has not chosen one explicitly
function onSystemThemeChange(event) {
    var stored = null;
    try { stored = localStorage.getItem('theme'); } catch (e) {}
    if (stored !== 'light' && stored !== 'dark') {
        applyTheme(event.matches ? 'dark' : 'light');
    }
}

// Older Safari only implements addListener on MediaQueryList
if (typeof prefersDark.addEventListener === 'function') {
    prefersDark.addEventListener('change', onSystemThemeChange);
} else if (typeof prefersDark.addListener === 'function') {
    prefersDark.addListener(onSystemThemeChange);
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
            target.focus({ preventScroll: true });
        }
    });
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
    scrollProgress.style.width = (maxScroll > 0 ? (y / maxScroll) * 100 : 0) + '%';
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

// Animate statistics numbers
function animateValue(element, start, end, duration) {
    var startTimestamp = null;
    var step = function (timestamp) {
        if (!startTimestamp) startTimestamp = timestamp;
        var progress = Math.min((timestamp - startTimestamp) / duration, 1);

        if (element.dataset.isPercentage) {
            element.textContent = (progress * (end - start) + start).toFixed(1) + '%';
        } else if (element.dataset.isMoney) {
            element.textContent = '$' + Math.floor(progress * (end - start) + start) + 'M';
        } else {
            element.textContent = Math.floor(progress * (end - start) + start) + '+';
        }

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
                var text = stat.textContent;
                if (text.includes('$')) {
                    stat.dataset.isMoney = 'true';
                    animateValue(stat, 0, 15, 800);
                } else if (text.includes('%')) {
                    stat.dataset.isPercentage = 'true';
                    animateValue(stat, 5, 0.5, 800);
                } else {
                    animateValue(stat, 0, 6, 600);
                }
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
}, { threshold: 0.5 });

// Observe hero stats
var heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    statsObserver.observe(heroStats);
}

// Animate project metrics
document.querySelectorAll('.project-card').forEach(function (card) {
    statsObserver.observe(card);
});
