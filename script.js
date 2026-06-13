/**
 * FUTURE SPACE — Premium JavaScript Controller
 * Custom Cursor · Page Loader · Lenis Smooth Scroll
 * Canvas Scroll Sequences · Scroll Reveals · Mobile Menu · Form
 */

'use strict';

// ============================================================
// 1. CUSTOM CURSOR
// ============================================================
const cursorDot  = document.getElementById('cursor-dot');
const cursorRing = document.getElementById('cursor-ring');
const cursorGlow = document.getElementById('cursor-glow');

let mouseX = -100, mouseY = -100;
let ringX  = -100, ringY  = -100;
let glowX  = -100, glowY  = -100;
let rafCursor;

const isTouch = window.matchMedia('(pointer: coarse)').matches;

if (!isTouch && cursorDot && cursorRing) {
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%,-50%)`;
    });

    const animateCursorRing = () => {
        ringX += (mouseX - ringX) * 0.12;
        ringY += (mouseY - ringY) * 0.12;
        cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%,-50%)`;
        
        glowX += (mouseX - glowX) * 0.08;
        glowY += (mouseY - glowY) * 0.08;
        if (cursorGlow) {
            cursorGlow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%,-50%)`;
        }
        
        rafCursor = requestAnimationFrame(animateCursorRing);
    };
    animateCursorRing();

    const hoverTargets = 'a, button, .project-card, .service-item, .insight-card, .timeline-step, .testimonial-feature, .about-image-accent';

    document.addEventListener('mouseover', (e) => {
        if (e.target.closest(hoverTargets)) {
            cursorRing.classList.add('is-hovering');
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.closest(hoverTargets)) {
            cursorRing.classList.remove('is-hovering');
        }
    });

    document.addEventListener('mouseleave', () => {
        cursorDot.style.opacity = '0';
        cursorRing.style.opacity = '0';
    });

    document.addEventListener('mouseenter', () => {
        cursorDot.style.opacity = '1';
        cursorRing.style.opacity = '1';
    });
}

// ============================================================
// 2. PAGE LOADER
// ============================================================
const loader     = document.getElementById('page-loader');
const loaderFill = document.getElementById('loader-fill');

const unlockScroll = () => {
    document.body.style.overflow = '';
    if (loader) loader.classList.add('loaded');
};

// Hard fallback — always unlock within 3s no matter what
let scrollFallback = setTimeout(unlockScroll, 3000);

const runLoader = () => {
    clearTimeout(scrollFallback);
    if (!loader || !loaderFill) {
        unlockScroll();
        return;
    }

    requestAnimationFrame(() => {
        loaderFill.style.width = '100%';
    });

    setTimeout(unlockScroll, 1800);
};

if (loader) {
    document.body.style.overflow = 'hidden';
}

if (document.readyState === 'complete') {
    runLoader();
} else {
    window.addEventListener('load', runLoader, { once: true });
}

// ============================================================
// 3. SCROLL — native only, no Lenis
// ============================================================
// Lenis is intentionally not used — native scroll is fastest.

// ============================================================
// 4. CANVAS FRAME SEQUENCES
// ============================================================
const TOTAL_FRAMES_HERO    = 99;
const BATCH_SIZE  = 30;   // load 30 frames per tick
const BATCH_DELAY = 0;    // no gap between batches

const canvas1   = document.getElementById('sequence-canvas');
const ctx1      = canvas1 ? canvas1.getContext('2d') : null;

const heroFramePath    = (i) => `images/frame_${String(i).padStart(4, '0')}.webp`;

const imgs1 = [];
const seq1  = { frame: 0 };
let tgt1 = 0;
let drawn1 = -1;

const scaleDPI = (canvas, ctx) => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
};

const scaleAllCanvases = () => {
    if (canvas1 && ctx1) scaleDPI(canvas1, ctx1);
};

const drawCover = (img, ctx, label = '') => {
    const cw = window.innerWidth;
    const ch = window.innerHeight;

    if (!img || !img.complete || img.naturalWidth === 0) {
        // Luxury loading state — matches site palette, no debug text
        const grad = ctx.createLinearGradient(0, 0, 0, ch);
        grad.addColorStop(0, '#071F15');
        grad.addColorStop(1, '#0B2E20');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, ch);
        return;
    }

    const ir = img.naturalWidth / img.naturalHeight;
    const cr = cw / ch;

    let rw, rh, rx, ry;
    if (cr > ir) {
        rw = cw; rh = cw / ir; rx = 0; ry = (ch - rh) / 2;
    } else {
        rw = ch * ir; rh = ch; rx = (cw - rw) / 2; ry = 0;
    }

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, rx, ry, rw, rh);
};

const isReady = (img) => img && img.complete && img.naturalWidth > 0;

const nearestLoaded = (arr, idx, total) => {
    if (isReady(arr[idx])) return idx;
    for (let d = 1; d < total; d++) {
        if (idx + d < total && isReady(arr[idx + d])) return idx + d;
        if (idx - d >= 0  && isReady(arr[idx - d])) return idx - d;
    }
    return -1;
};

const batchLoad = (arr, pathFn, start, end) => {
    for (let i = start; i <= end && i < arr.length; i++) {
        if (!arr[i].src) arr[i].src = pathFn(i + 1);
    }
};

const preloadSeq = (arr, pathFn, ctx, canvas, total, onReady) => {
    for (let i = 0; i < total; i++) arr.push(new Image());

    // Decode first frame immediately so canvas has something to show
    arr[0].onload = () => {
        if (ctx && canvas) requestAnimationFrame(() => drawCover(arr[0], ctx));
        if (onReady) onReady();
    };
    arr[0].onerror = () => {};
    arr[0].src = pathFn(1);

    // Load all remaining frames as fast as possible in large batches
    // Use requestIdleCallback when available so batches don't block the main thread
    const scheduleNext = typeof requestIdleCallback === 'function'
        ? (fn) => requestIdleCallback(fn, { timeout: 200 })
        : (fn) => setTimeout(fn, 0);

    let batch = 1;
    const next = () => {
        if (batch >= total) return;
        const end = Math.min(batch + BATCH_SIZE - 1, total - 1);
        batchLoad(arr, pathFn, batch, end);
        batch = end + 1;
        if (batch < total) scheduleNext(next);
    };
    scheduleNext(next);
};

// ============================================================
// 5. SCROLL SEQUENCE LOGIC
// ============================================================

// Cached offsets — measured once, never on scroll
let c1Top = 0, c1Height = 1;
const heroEl    = document.getElementById('hero-text-1');
const heroEls   = [1,2,3,4].map(i => document.getElementById(`hero-text-${i}`));

// Hero phase windows [start, end] as fraction of scroll progress
const HERO_PHASES = [
    [0.00, 0.28],
    [0.30, 0.55],
    [0.57, 0.80],
    [0.82, 1.00],
];

const cacheOffsets = () => {
    const vh = window.innerHeight;
    const c1 = document.querySelector('.scroll-sequence-container');
    if (c1) {
        c1Top    = c1.offsetTop;
        c1Height = c1.scrollHeight - vh;
    }
};

const computeSequences = () => {
    const sy = window.scrollY;

    // Hero sequence
    const f1 = Math.max(0, Math.min(1, (sy - c1Top) / c1Height));
    tgt1 = Math.min(TOTAL_FRAMES_HERO - 1, Math.floor(f1 * TOTAL_FRAMES_HERO));

    // Drive 4 text phases
    heroEls.forEach((el, i) => {
        if (!el) return;
        const [s, e] = HERO_PHASES[i];
        el.classList.toggle('active', f1 >= s && f1 <= e);
    });
};

// ============================================================
// 6. MAIN RENDER LOOP
// ============================================================
const renderLoop = () => {
    if (ctx1) {
        const d1 = tgt1 - seq1.frame;
        if (Math.abs(d1) > 0.05) {
            seq1.frame += d1 * 0.22;
            const r1 = Math.round(seq1.frame);
            if (r1 !== drawn1) {
                const ni = nearestLoaded(imgs1, r1, TOTAL_FRAMES_HERO);
                if (ni !== -1 && ni !== drawn1) { drawCover(imgs1[ni], ctx1); drawn1 = ni; }
            }
        }
    }

    requestAnimationFrame(renderLoop);
};

// ============================================================
// 7. NAVIGATION
// ============================================================
const siteHeader  = document.getElementById('site-header');
const menuBtn     = document.getElementById('nav-menu-btn');
const mobileMenu  = document.getElementById('mobile-menu');

const updateHeader = () => {
    if (!siteHeader) return;
    siteHeader.classList.toggle('scrolled', window.scrollY > 60);
};

if (menuBtn && mobileMenu) {
    const closeMenu = () => {
        mobileMenu.classList.remove('open');
        menuBtn.classList.remove('open');
        document.body.style.overflow = '';
        const fixedCta = document.querySelector('.mobile-fixed-cta');
        if (fixedCta) fixedCta.style.display = 'block';
    };

    menuBtn.addEventListener('click', () => {
        const open = mobileMenu.classList.toggle('open');
        menuBtn.classList.toggle('open', open);
        document.body.style.overflow = open ? 'hidden' : '';
        const fixedCta = document.querySelector('.mobile-fixed-cta');
        if (fixedCta) fixedCta.style.display = open ? 'none' : 'block';
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && mobileMenu.classList.contains('open')) {
            closeMenu();
        }
    });
}

// ============================================================
// 8. CSS SCROLL REVEAL (IntersectionObserver)
// ============================================================
const initReveal = () => {
    const items = document.querySelectorAll('.reveal-item, .reveal-title, .reveal-header');
    if (!items.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    items.forEach(el => observer.observe(el));
};

// ============================================================
// 9. CONTACT FORM
// ============================================================
const initForm = () => {
    const form    = document.getElementById('contact-form');
    const success = document.getElementById('form-success');
    if (!form) return;

    const requiredFields = form.querySelectorAll('input[required], select[required], textarea[required]');

    // Clear error style when user modifies field
    requiredFields.forEach(field => {
        const clearError = () => field.classList.remove('error');
        field.addEventListener('input', clearError);
        field.addEventListener('change', clearError);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let hasError = false;
        let firstInvalid = null;

        requiredFields.forEach(field => {
            const value = field.value.trim();
            let isInvalid = false;

            if (!value) {
                isInvalid = true;
            } else if (field.type === 'email') {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(value)) {
                    isInvalid = true;
                }
            }

            if (isInvalid) {
                field.classList.add('error');
                hasError = true;
                if (!firstInvalid) {
                    firstInvalid = field;
                }
            } else {
                field.classList.remove('error');
            }
        });

        if (hasError) {
            if (firstInvalid) {
                firstInvalid.focus();
            }
            return;
        }

        const btn = form.querySelector('.btn-form-submit');
        if (btn) {
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.6';
        }
        setTimeout(() => {
            if (success) success.classList.add('visible');
            form.reset();
            if (btn) { btn.style.pointerEvents = ''; btn.style.opacity = ''; }
        }, 800);
    });
};

// ============================================================
// 10. NEWSLETTER FORM
// ============================================================
function handleNewsletter(e) {
    e.preventDefault();
    const input = e.target.querySelector('input[type="email"]');
    const btn   = e.target.querySelector('button');
    if (!input || !btn) return;
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#C9A96E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    input.value = '';
    input.placeholder = 'Subscribed — thank you.';
}

// ============================================================
// 11. RESIZE HANDLER
// ============================================================
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        scaleAllCanvases();
        cacheOffsets();
        const f1 = Math.round(seq1.frame);
        if (ctx1 && imgs1[f1]) drawCover(imgs1[f1], ctx1);
    }, 100);
});

// ============================================================
// 12. SCROLL LISTENER
// ============================================================
window.addEventListener('scroll', () => {
    if (!isMobile()) computeSequences();
    updateHeader();
}, { passive: true });

// ============================================================
// 12.5 ACTIVE NAVIGATION HIGHLIGHTING (IntersectionObserver)
// ============================================================
const initActiveNavHighlight = () => {
    const sections = document.querySelectorAll('section[id], .scroll-sequence-container');
    const navLinks = document.querySelectorAll('.nav-link');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');

    const observerOptions = {
        root: null,
        rootMargin: '-35% 0px -45% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                let id = entry.target.getAttribute('id');
                if (id === 'hero-sequence') id = '';
                
                const activeHref = id ? `#${id}` : '#';

                navLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    link.classList.toggle('active', href === activeHref);
                });

                mobileLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    link.classList.toggle('active', href === activeHref);
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
};

// ============================================================
// 13. INIT
// ============================================================
const isMobile = () => window.innerWidth <= 768;

// ── Canvas sequence — desktop only; mobile uses static image ──
if (!isMobile()) {
    scaleAllCanvases();
    preloadSeq(imgs1, heroFramePath, ctx1, canvas1, TOTAL_FRAMES_HERO);
    requestAnimationFrame(renderLoop);

    // Defer layout-dependent init until the full page has rendered
    const initLayout = () => requestAnimationFrame(() => {
        cacheOffsets();
        computeSequences();
    });
    if (document.readyState === 'complete') {
        initLayout();
    } else {
        window.addEventListener('load', initLayout, { once: true });
    }
}

initReveal();
initForm();
updateHeader();
initActiveNavHighlight();

// ============================================================
// 14. LAZY IMAGE OBSERVER — fade-in + LQIP blur-up + skeleton
// ============================================================
(() => {
    const onLoad = (img) => {
        img.classList.add('loaded');
        const wrapper = img.closest('.project-image-wrapper, .about-image-accent, .service-image, .insight-image');
        if (wrapper) wrapper.classList.add('img-loaded');
    };

    // On mobile, the hero is ~1850px tall (220vh @ 844px viewport).
    // With only 200px rootMargin, section images below the hero don't start
    // fetching until the user is 200px away — too late on slow 3G.
    // 1800px bottom margin triggers loading at page-open on mobile so images
    // are ready before the user scrolls to them.
    const lazyMargin = window.matchMedia('(max-width: 768px)').matches
        ? '0px 0px 1800px 0px'
        : '200px';

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(({ isIntersecting, target }) => {
            if (!isIntersecting) return;
            observer.unobserve(target);
            if (target.complete && target.naturalWidth > 0) {
                onLoad(target);
            } else {
                target.addEventListener('load', () => onLoad(target), { once: true });
            }
        });
    }, { rootMargin: lazyMargin });

    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        if (img.complete && img.naturalWidth > 0) {
            onLoad(img);
        } else {
            observer.observe(img);
        }
    });
})();

// ============================================================
// 15. MOBILE STICKY CTA — show after hero, hide at contact
// ============================================================
(() => {
    const stickyCta = document.getElementById('mobile-sticky-cta');
    if (!stickyCta || !isTouch) return;

    const heroSection = document.querySelector('.scroll-sequence-container');
    const contactSection = document.getElementById('contact');

    let lastScrollY = 0;
    let ticking = false;

    const updateStickyCta = () => {
        const scrollY = window.scrollY;
        const heroBottom = heroSection ? heroSection.offsetTop + heroSection.offsetHeight : 600;
        const contactTop = contactSection ? contactSection.offsetTop - window.innerHeight * 0.5 : Infinity;

        if (scrollY > heroBottom && scrollY < contactTop) {
            stickyCta.classList.add('visible');
        } else {
            stickyCta.classList.remove('visible');
        }
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateStickyCta);
            ticking = true;
        }
    }, { passive: true });

    // Close sticky CTA when clicking its link
    stickyCta.querySelector('a').addEventListener('click', () => {
        stickyCta.classList.remove('visible');
    });
})();

// ============================================================
// 16. ADVANCED INTERACTIVE EFFECTS (Stats counter, Magnetic CTAs, Testimonials Drag)
// ============================================================
(() => {
    // 16.1 Stat counter animation
    const initCounter = () => {
        const statsContainer = document.querySelector('.about-stats');
        const statNums = document.querySelectorAll('.about-stat-num');
        if (!statsContainer || statNums.length === 0) return;

        const runCountUp = (el) => {
            const targetText = el.innerText || '';
            const match = targetText.match(/^([0-9]+)/);
            if (!match) return; // ignore non-numeric entries like "End-to-End"

            const targetVal = parseInt(match[1], 10);
            const suffix = targetText.slice(match[0].length);
            const supElement = el.querySelector('sup');
            const supHtml = supElement ? supElement.outerHTML : '';

            let start = 0;
            const duration = 2000; // 2 seconds
            let startTime = null;

            const animate = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const progress = Math.min((timestamp - startTime) / duration, 1);
                // Cubic ease-out
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                const currentVal = Math.floor(easeProgress * targetVal);

                if (supHtml) {
                    el.innerHTML = `${currentVal}${supHtml}`;
                } else {
                    el.innerText = `${currentVal}${suffix}`;
                }

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    statNums.forEach(runCountUp);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        observer.observe(statsContainer);
    };

    // 16.2 Magnetic buttons (desktop only)
    const initMagneticButtons = () => {
        if (isTouch) return; // disabled on mobile touch devices
        
        const btns = document.querySelectorAll('.btn-hero-primary, .btn-hero-ghost');
        btns.forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                // Suspend transition temporarily for lag-free cursor tracking
                btn.style.transition = 'none';
                
                // Pull button towards mouse by max 12px
                btn.style.transform = `translate(${x * 0.22}px, ${y * 0.22}px) translateY(-3px)`;
                btn.style.boxShadow = '0 16px 36px rgba(200, 169, 126, 0.45), 0 6px 12px rgba(0,0,0,0.2)';
                
                const content = btn.querySelector('span');
                if (content) {
                    content.style.transition = 'none';
                    content.style.transform = `translate(${x * 0.08}px, ${y * 0.08}px)`;
                }
            });
            
            btn.addEventListener('mouseleave', () => {
                // Restore transition and original state
                btn.style.transition = '';
                btn.style.transform = '';
                btn.style.boxShadow = '';
                
                const content = btn.querySelector('span');
                if (content) {
                    content.style.transition = '';
                    content.style.transform = '';
                }
            });
        });
    };

    // 16.3 Testimonials Mouse Drag to Scroll (desktop only)
    const initTestimonialsDrag = () => {
        const track = document.querySelector('.testimonials-track');
        if (!track) return;
        
        let isDown = false;
        let startX;
        let scrollLeft;
        
        track.addEventListener('mousedown', (e) => {
            isDown = true;
            track.classList.add('active');
            startX = e.pageX - track.offsetLeft;
            scrollLeft = track.scrollLeft;
            // Temporarily disable scroll-snap during dragging so dragging is smooth
            track.style.scrollSnapType = 'none';
            track.style.cursor = 'grabbing';
        });
        
        track.addEventListener('mouseleave', () => {
            if (!isDown) return;
            isDown = false;
            track.classList.remove('active');
            track.style.scrollSnapType = '';
            track.style.cursor = '';
        });
        
        track.addEventListener('mouseup', () => {
            if (!isDown) return;
            isDown = false;
            track.classList.remove('active');
            track.style.scrollSnapType = '';
            track.style.cursor = '';
        });
        
        track.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - track.offsetLeft;
            const walk = (x - startX) * 1.5;
            track.scrollLeft = scrollLeft - walk;
        });
    };

    // Initialize all advanced effects
    initCounter();
    initMagneticButtons();
    initTestimonialsDrag();
})();