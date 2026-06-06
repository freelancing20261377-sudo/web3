/**
 * AURA — Ultra-Premium Scroll Image Sequence Controller
 * Lenis + GSAP ScrollTrigger + Canvas Frame Sequences
 */

// ==============================
// LENIS SMOOTH SCROLL
// ==============================
let lenis;
try {
    if (typeof Lenis !== 'undefined') {
        lenis = new Lenis({
            duration: 1.4,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
        });

        if (typeof ScrollTrigger !== 'undefined') {
            lenis.on('scroll', ScrollTrigger.update);
        }

        if (typeof gsap !== 'undefined') {
            gsap.ticker.add((time) => {
                lenis.raf(time * 1000);
            });
            gsap.ticker.lagSmoothing(0);
        }
    }
} catch (e) {
    console.warn('Lenis initialization failed, falling back to native scroll');
}

// ==============================
// GLOBAL CONFIG
// ==============================
const totalFrames = 121;

// ==============================
// HERO CANVAS (images/)
// ==============================
const canvas1 = document.getElementById('sequence-canvas');
const context1 = canvas1.getContext('2d');
const currentFrame1 = index => `images/frame_${index.toString().padStart(4, '0')}.jpg`;

const images1 = [];
const airSequence1 = { frame: 0 };
let targetFrame1 = 0;
let currentRenderedFrame1 = -1;

// ==============================
// JOURNEY CANVAS (images1/)
// ==============================
const canvas2 = document.getElementById('sequence-canvas-2');
const context2 = canvas2.getContext('2d');
const currentFrame2 = index => `images1/frame_${index.toString().padStart(4, '0')}.jpg`;

const images2 = [];
const airSequence2 = { frame: 0 };
let targetFrame2 = 0;
let currentRenderedFrame2 = -1;

// ==============================
// CANVAS DPI & DRAWING
// ==============================
const scaleCanvasDPI = (canvas, context) => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    context.scale(dpr, dpr);
};

const trackAllDevicePixelRatios = () => {
    if(canvas1) scaleCanvasDPI(canvas1, context1);
    if(canvas2) scaleCanvasDPI(canvas2, context2);
};

const drawCoverImage = (img, ctx, canvas, frameIndex, label) => {
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    if (!img || !img.complete || img.naturalWidth === 0) {
        ctx.fillStyle = "#0A0A0A";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = "rgba(184, 155, 101, 0.4)";
        ctx.font = "11px Inter";
        ctx.textAlign = "center";
        ctx.fillText(`AURA ENGINE // LOADING_${label}_${frameIndex.toString().padStart(4, '0')}.JPG`, canvasWidth / 2, canvasHeight / 2);
        return;
    }

    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    const imgRatio = imgWidth / imgHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let renderWidth, renderHeight, xOffset, yOffset;

    if (canvasRatio > imgRatio) {
        renderWidth = canvasWidth;
        renderHeight = canvasWidth / imgRatio;
        xOffset = 0;
        yOffset = (canvasHeight - renderHeight) / 2;
    } else {
        renderWidth = canvasHeight * imgRatio;
        renderHeight = canvasHeight;
        xOffset = (canvasWidth - renderWidth) / 2;
        yOffset = 0;
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, xOffset, yOffset, renderWidth, renderHeight);
};

// ==============================
// SMART BATCHED FRAME LOADER
// ==============================
const BATCH_SIZE = 8;
const BATCH_DELAY = 60;

const isImageReady = (img) => img && img.complete && img.naturalWidth > 0;

const findNearestLoadedFrame = (images, targetIndex) => {
    if (isImageReady(images[targetIndex])) return targetIndex;
    // Search outward from target
    let distance = 1;
    while (distance < totalFrames) {
        const forward = targetIndex + distance;
        const backward = targetIndex - distance;
        if (forward < totalFrames && isImageReady(images[forward])) return forward;
        if (backward >= 0 && isImageReady(images[backward])) return backward;
        distance++;
    }
    return -1;
};

const loadBatch = (images, currentFrameFn, start, end) => {
    for (let i = start; i < end && i <= totalFrames; i++) {
        const img = images[i - 1];
        if (!img.src) img.src = currentFrameFn(i);
    }
};

const preloadSequenceBatched = (images, currentFrameFn, context, canvas, label, onFirstReady) => {
    // Initialize empty image slots
    for (let i = 1; i <= totalFrames; i++) {
        images.push(new Image());
    }

    // Load frame 1 immediately for instant display
    const firstImg = images[0];
    firstImg.src = currentFrameFn(1);
    firstImg.onload = () => {
        requestAnimationFrame(() => drawCoverImage(firstImg, context, canvas, 1, label));
        if (onFirstReady) onFirstReady();
    };
    firstImg.onerror = () => {};

    // Load remaining frames in small batches with delay
    let currentBatch = 2;
    const loadNextBatch = () => {
        if (currentBatch > totalFrames) return;
        const end = Math.min(currentBatch + BATCH_SIZE - 1, totalFrames);
        loadBatch(images, currentFrameFn, currentBatch, end);
        currentBatch = end + 1;
        if (currentBatch <= totalFrames) {
            setTimeout(loadNextBatch, BATCH_DELAY);
        }
    };
    setTimeout(loadNextBatch, BATCH_DELAY);
};

const preloadAllSequences = () => {
    preloadSequenceBatched(images1, currentFrame1, context1, canvas1, "HERO");
    preloadSequenceBatched(images2, currentFrame2, context2, canvas2, "JOURNEY");
};

// ==============================
// SCROLL SEQUENCE CALCULATION
// ==============================
const calculateScrollSequences = () => {
    const scrollTop = window.scrollY;
    const viewportHeight = window.innerHeight;

    // Hero Sequence
    const container1 = document.querySelector('.scroll-sequence-container');
    if (container1) {
        const container1Top = container1.offsetTop;
        const container1Height = container1.scrollHeight - viewportHeight;
        let fraction1 = (scrollTop - container1Top) / container1Height;
        fraction1 = Math.max(0, Math.min(1, fraction1));
        targetFrame1 = Math.min(totalFrames - 1, Math.floor(fraction1 * totalFrames));

        const heroOverlay = document.getElementById('hero-text-1');
        if (heroOverlay) {
            if (fraction1 > 0.22) {
                heroOverlay.classList.remove('active');
            } else {
                heroOverlay.classList.add('active');
            }
        }
    }

    // Journey Sequence
    const container2 = document.querySelector('.scroll-sequence-container-2');
    if (container2) {
        const rect = container2.getBoundingClientRect();
        const absoluteTop = rect.top + window.scrollY;
        const container2Height = container2.scrollHeight - viewportHeight;
        let fraction2 = (scrollTop - absoluteTop) / container2Height;
        fraction2 = Math.max(0, Math.min(1, fraction2));
        targetFrame2 = Math.min(totalFrames - 1, Math.floor(fraction2 * totalFrames));

        // Journey text overlays
        const overlays = [
            document.getElementById('journey-overlay-1'),
            document.getElementById('journey-overlay-2'),
            document.getElementById('journey-overlay-3'),
            document.getElementById('journey-overlay-4'),
            document.getElementById('journey-overlay-5'),
        ];

        overlays.forEach((el, idx) => {
            if (!el) return;
            const start = idx * 0.18;
            const end = start + 0.22;
            if (fraction2 >= start && fraction2 <= end) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }
};

// ==============================
// RENDER LOOP
// ==============================
const globalRenderLoop = () => {
    // Hero Sequence
    const delta1 = targetFrame1 - airSequence1.frame;
    if (Math.abs(delta1) > 0.05) {
        airSequence1.frame += delta1 * 0.15;
        const rounded1 = Math.round(airSequence1.frame);
        if (rounded1 !== currentRenderedFrame1) {
            const readyIndex1 = findNearestLoadedFrame(images1, rounded1);
            if (readyIndex1 !== -1 && readyIndex1 !== currentRenderedFrame1) {
                drawCoverImage(images1[readyIndex1], context1, canvas1, readyIndex1 + 1, "HERO");
                currentRenderedFrame1 = readyIndex1;
            }
        }
    }

    // Journey Sequence
    const delta2 = targetFrame2 - airSequence2.frame;
    if (Math.abs(delta2) > 0.05) {
        airSequence2.frame += delta2 * 0.15;
        const rounded2 = Math.round(airSequence2.frame);
        if (rounded2 !== currentRenderedFrame2) {
            const readyIndex2 = findNearestLoadedFrame(images2, rounded2);
            if (readyIndex2 !== -1 && readyIndex2 !== currentRenderedFrame2) {
                drawCoverImage(images2[readyIndex2], context2, canvas2, readyIndex2 + 1, "JOURNEY");
                currentRenderedFrame2 = readyIndex2;
            }
        }
    }

    requestAnimationFrame(globalRenderLoop);
};

// ==============================
// NAV SCROLL TRANSITION
// ==============================
const header = document.getElementById('site-header');
const updateHeaderState = () => {
    if (window.scrollY > 60) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
};

// ==============================
// GSAP SCROLL REVEALS
// ==============================
const initScrollReveals = () => {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    const revealSections = document.querySelectorAll('.section');
    revealSections.forEach((section) => {
        const elements = section.querySelectorAll('.section-title, .lead-text, .body-text, .timeline-step, .service-item, .project-card, .testimonial-quote, .form-wrapper, .pricing-card, .showcase-item, .insight-card, .booking-content, .booking-image-wrapper');
        if (!elements.length) return;
        gsap.fromTo(elements,
            { y: 40, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 1,
                ease: 'power3.out',
                stagger: 0.1,
                scrollTrigger: {
                    trigger: section,
                    start: 'top 85%',
                    toggleActions: 'play none none none',
                }
            }
        );
    });
};

// ==============================
// EVENT LISTENERS
// ==============================
window.addEventListener('resize', () => {
    trackAllDevicePixelRatios();
    if(images1[Math.round(airSequence1.frame)]) drawCoverImage(images1[Math.round(airSequence1.frame)], context1, canvas1, Math.round(airSequence1.frame) + 1, "HERO");
    if(images2[Math.round(airSequence2.frame)]) drawCoverImage(images2[Math.round(airSequence2.frame)], context2, canvas2, Math.round(airSequence2.frame) + 1, "JOURNEY");
});

window.addEventListener('scroll', () => {
    calculateScrollSequences();
    updateHeaderState();
}, { passive: true });

// ==============================
// INITIALIZATION
// ==============================
trackAllDevicePixelRatios();
preloadAllSequences();
requestAnimationFrame(globalRenderLoop);
initScrollReveals();