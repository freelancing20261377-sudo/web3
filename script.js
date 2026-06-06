/**
 * AURA — Production Scroll Image Sequence Controller
 * Progressive loading | Lazy on-demand | Memory window | 60fps
 */

// ==============================
// CONFIG
// ==============================
const USE_WEBP = false;
const FRAME_EXT = USE_WEBP ? 'webp' : 'jpg';
const TOTAL_FRAMES = 121;
const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const BATCH_SIZE = IS_SAFARI ? 4 : 6;
const BATCH_DELAY = IS_SAFARI ? 80 : 50;
const INITIAL_BATCH = 15;
const LAZY_WINDOW = 12;
const MEMORY_WINDOW = 30;

// ==============================
// LENIS SMOOTH SCROLL
// ==============================
let lenis;
try {
    if (typeof Lenis !== 'undefined') {
        lenis = new Lenis({ duration: 1.4, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
        if (typeof ScrollTrigger !== 'undefined') lenis.on('scroll', ScrollTrigger.update);
        if (typeof gsap !== 'undefined') {
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
        }
    }
} catch (e) { console.warn('Lenis init failed'); }

// ==============================
// LOADING OVERLAY UI
// ==============================
const loadingOverlay = document.getElementById('loading-overlay');
const progressBar = document.querySelector('.loading-progress-bar');
const progressText = document.querySelector('.loading-percentage');
const updateLoadingUI = (pct) => {
    if (!progressBar || !progressText) return;
    progressBar.style.width = `${pct}%`;
    progressText.textContent = `${pct}%`;
    if (pct >= 100 && loadingOverlay) {
        loadingOverlay.classList.add('hidden');
        setTimeout(() => { if(loadingOverlay) loadingOverlay.style.display = 'none'; }, 600);
    }
};

// ==============================
// FRAME SEQUENCE CLASS
// ==============================
class FrameSequence {
    constructor(opts) {
        this.id = opts.id;
        this.canvas = opts.canvas;
        this.ctx = opts.ctx;
        this.totalFrames = opts.totalFrames;
        this.getPath = opts.getPath;
        this.label = opts.label;
        this.images = [];
        this.loadedSet = new Set();
        this.evictedSet = new Set();
        this.currentFrame = 0;
        this.targetFrame = 0;
        this.lastRendered = -1;
        this.isVisible = opts.visible !== false;
        this.hasStarted = false;
        for (let i = 0; i < this.totalFrames; i++) this.images.push(new Image());
    }

    _framePath(i) {
        return this.getPath(i + 1).replace(/\.jpg$/, `.${FRAME_EXT}`).replace(/\.jpeg$/, `.${FRAME_EXT}`);
    }

    loadRange(start, end, priority = false) {
        for (let i = start; i < end && i < this.totalFrames; i++) {
            if (this.loadedSet.has(i) || this.evictedSet.has(i)) continue;
            const img = this.images[i];
            img.src = this._framePath(i);
            if (priority && img.decode) {
                img.decode().then(() => this._onLoad(i)).catch(() => this._onLoad(i));
            } else {
                img.onload = () => this._onLoad(i);
            }
            img.onerror = () => { this.loadedSet.add(i); this._updateProgress(); };
        }
    }

    _onLoad(index) {
        this.loadedSet.add(index);
        this._updateProgress();
        if (index === 0) this.drawFrame(0);
    }

    _updateProgress() {
        const pct = Math.min(100, Math.round((this.loadedSet.size / this.totalFrames) * 100));
        if (this.id === 'hero') updateLoadingUI(pct);
    }

    loadInitial() {
        if (!this.isVisible) return;
        this.loadRange(0, INITIAL_BATCH, true);
        let cursor = INITIAL_BATCH;
        const step = () => {
            if (cursor >= this.totalFrames) return;
            const end = Math.min(cursor + BATCH_SIZE, this.totalFrames);
            this.loadRange(cursor, end);
            cursor = end;
            if (cursor < this.totalFrames) setTimeout(step, BATCH_DELAY);
        };
        setTimeout(step, BATCH_DELAY);
    }

    ensureLoadedAround(targetFrame) {
        if (!this.isVisible) return;
        const start = Math.max(0, targetFrame - 5);
        const end = Math.min(this.totalFrames, targetFrame + LAZY_WINDOW);
        let needed = false;
        for (let i = start; i < end; i++) {
            if (!this.loadedSet.has(i) && !this.evictedSet.has(i)) { needed = true; break; }
        }
        if (needed) this.loadRange(start, end);
        this._evictDistant(targetFrame);
    }

    _evictDistant(center) {
        const minKeep = Math.max(0, center - MEMORY_WINDOW / 2);
        const maxKeep = Math.min(this.totalFrames, center + MEMORY_WINDOW / 2);
        for (let i = 0; i < this.totalFrames; i++) {
            if (this.loadedSet.has(i) && (i < minKeep || i > maxKeep)) {
                this.loadedSet.delete(i);
                this.evictedSet.add(i);
                this.images[i].src = '';
            }
        }
    }

    getNearestLoaded(target) {
        if (this.loadedSet.has(target)) return target;
        let d = 1;
        while (d < this.totalFrames) {
            const f = target + d, b = target - d;
            if (f < this.totalFrames && this.loadedSet.has(f)) return f;
            if (b >= 0 && this.loadedSet.has(b)) return b;
            d++;
        }
        return -1;
    }

    drawFrame(index) {
        const img = this.images[index];
        if (!img || !img.complete || img.naturalWidth === 0) return;
        const cw = window.innerWidth, ch = window.innerHeight;
        const ratio = img.naturalWidth / img.naturalHeight;
        const cr = cw / ch;
        let rw, rh, xo, yo;
        if (cr > ratio) { rw = cw; rh = cw / ratio; xo = 0; yo = (ch - rh) / 2; }
        else { rw = ch * ratio; rh = ch; xo = (cw - rw) / 2; yo = 0; }
        this.ctx.clearRect(0, 0, cw, ch);
        this.ctx.drawImage(img, xo, yo, rw, rh);
    }

    tick() {
        const delta = this.targetFrame - this.currentFrame;
        if (Math.abs(delta) < 0.05) return;
        this.currentFrame += delta * 0.12;
        const rounded = Math.round(this.currentFrame);
        if (rounded === this.lastRendered) return;
        this.ensureLoadedAround(rounded);
        const ready = this.getNearestLoaded(rounded);
        if (ready !== -1 && ready !== this.lastRendered) {
            this.drawFrame(ready);
            this.lastRendered = ready;
        }
    }

    setTargetFromScroll(scrollTop, containerTop, containerHeight) {
        let fraction = (scrollTop - containerTop) / containerHeight;
        fraction = Math.max(0, Math.min(1, fraction));
        this.targetFrame = Math.min(this.totalFrames - 1, Math.floor(fraction * this.totalFrames));
    }
}

// ==============================
// INSTANCE SETUP
// ==============================
const c1 = document.getElementById('sequence-canvas');
const ctx1 = c1 ? c1.getContext('2d', { alpha: false }) : null;
const heroSeq = new FrameSequence({
    id: 'hero', canvas: c1, ctx: ctx1, totalFrames: TOTAL_FRAMES,
    getPath: i => `images/frame_${i.toString().padStart(4, '0')}.jpg`,
    label: 'HERO', visible: true,
});

const c2 = document.getElementById('sequence-canvas-2');
const ctx2 = c2 ? c2.getContext('2d', { alpha: false }) : null;
const journeySeq = new FrameSequence({
    id: 'journey', canvas: c2, ctx: ctx2, totalFrames: TOTAL_FRAMES,
    getPath: i => `images1/frame_${i.toString().padStart(4, '0')}.jpg`,
    label: 'JOURNEY', visible: false,
});

// ==============================
// INTERSECTION OBSERVER (Lazy Journey)
// ==============================
const journeyContainer = document.querySelector('.scroll-sequence-container-2');
if (journeyContainer && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting && !journeySeq.hasStarted) {
                journeySeq.isVisible = true;
                journeySeq.hasStarted = true;
                journeySeq.loadInitial();
            }
        });
    }, { rootMargin: '200px 0px', threshold: 0.05 }).observe(journeyContainer);
} else {
    journeySeq.isVisible = true;
    journeySeq.loadInitial();
}

// ==============================
// SCROLL CALCULATION
// ==============================
const calculateScroll = () => {
    const st = window.scrollY, vh = window.innerHeight;
    const c1el = document.querySelector('.scroll-sequence-container');
    if (c1el) {
        heroSeq.setTargetFromScroll(st, c1el.offsetTop, c1el.scrollHeight - vh);
        const overlay = document.getElementById('hero-text-1');
        if (overlay) {
            const f = (st - c1el.offsetTop) / (c1el.scrollHeight - vh);
            overlay.classList.toggle('active', f <= 0.22);
        }
    }
    const c2el = document.querySelector('.scroll-sequence-container-2');
    if (c2el) {
        const top = c2el.getBoundingClientRect().top + st;
        journeySeq.setTargetFromScroll(st, top, c2el.scrollHeight - vh);
        const fraction = Math.max(0, Math.min(1, (st - top) / (c2el.scrollHeight - vh)));
        const overlays = [
            document.getElementById('journey-overlay-1'), document.getElementById('journey-overlay-2'),
            document.getElementById('journey-overlay-3'), document.getElementById('journey-overlay-4'),
            document.getElementById('journey-overlay-5'),
        ];
        overlays.forEach((el, idx) => {
            if (!el) return;
            const s = idx * 0.18, e = s + 0.22;
            el.classList.toggle('active', fraction >= s && fraction <= e);
        });
    }
};

// ==============================
// RENDER LOOP (60fps)
// ==============================
const renderLoop = () => {
    heroSeq.tick();
    journeySeq.tick();
    requestAnimationFrame(renderLoop);
};

// ==============================
// NAV SCROLL TRANSITION
// ==============================
const header = document.getElementById('site-header');
const updateHeader = () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 60);
};

// ==============================
// GSAP SCROLL REVEALS
// ==============================
const initScrollReveals = () => {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('.section').forEach(section => {
        const els = section.querySelectorAll(
            '.section-title, .lead-text, .body-text, .timeline-step, .service-item, .project-card,' +
            '.testimonial-quote, .form-wrapper, .pricing-card, .showcase-item, .insight-card,' +
            '.booking-content, .booking-image-wrapper'
        );
        if (!els.length) return;
        gsap.fromTo(els, { y: 40, opacity: 0 }, {
            y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.1,
            scrollTrigger: { trigger: section, start: 'top 85%', toggleActions: 'play none none none' }
        });
    });
};

// ==============================
// EVENT LISTENERS
// ==============================
window.addEventListener('resize', () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    [heroSeq, journeySeq].forEach(seq => {
        if (!seq.canvas) return;
        seq.canvas.width = window.innerWidth * dpr;
        seq.canvas.height = window.innerHeight * dpr;
        seq.ctx.scale(dpr, dpr);
        if (seq.lastRendered !== -1) seq.drawFrame(seq.lastRendered);
    });
});

window.addEventListener('scroll', () => { calculateScroll(); updateHeader(); }, { passive: true });

// ==============================
// INITIALIZATION
// ==============================
heroSeq.loadInitial();
requestAnimationFrame(renderLoop);
initScrollReveals();