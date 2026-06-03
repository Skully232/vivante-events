/**
 * Vivante Events — main.js
 * All site-wide JS in one file.
 * initMenu · initCursor · initTextReveal · initOdometer · initScrollReveal · initTopbar
 * Contact form · Gallery globe
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  initTopbar();
  initMenu();
  initCursor();
  initSharedObserver(); // handles: reveal, textReveal, odometer
  initGalleryGlobe();
  initContactForm();
});

/* ================================================================
   TOPBAR SCROLL SHADOW
   ================================================================ */
function initTopbar() {
  var topbar = document.getElementById('topbar');
  if (!topbar) return;
  function onScroll() {
    topbar.classList.toggle('scrolled', window.scrollY > 20);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ================================================================
   FULLSCREEN MENU
   ================================================================ */
function initMenu() {
  var hamburger = document.getElementById('hamburger');
  var fullmenu  = document.getElementById('fullmenu');
  if (!hamburger || !fullmenu) return;

  var isOpen = false;

  function openMenu() {
    isOpen = true;
    fullmenu.classList.add('open');
    hamburger.classList.add('is-open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    isOpen = false;
    fullmenu.classList.remove('open');
    hamburger.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', function () {
    isOpen ? closeMenu() : openMenu();
  });
  fullmenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) closeMenu();
  });
}

/* ================================================================
   CUSTOM CURSOR GLOW  (fixed rAF — skips when still)
   ================================================================ */
function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  var dot  = document.getElementById('cursor-dot');
  var ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  var mx = window.innerWidth / 2,  my = window.innerHeight / 2;
  var rx = mx, ry = my;
  var rafId = null;

  document.addEventListener('mousemove', function (e) {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
    if (!rafId) rafId = requestAnimationFrame(animRing);
  });

  function lerp(a, b, t) { return a + (b - a) * t; }

  function animRing() {
    var dx = mx - rx;
    var dy = my - ry;

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      // cursor is still — stop loop
      rafId = null;
      return;
    }

    rx = lerp(rx, mx, 0.12);
    ry = lerp(ry, my, 0.12);
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    rafId = requestAnimationFrame(animRing);
  }

  // Hover state on interactive elements
  var hoverSel = 'a, button, [role="button"], input, textarea, select, label';
  document.querySelectorAll(hoverSel).forEach(function (el) {
    el.addEventListener('mouseenter', function () { ring.classList.add('is-hovering'); });
    el.addEventListener('mouseleave', function () { ring.classList.remove('is-hovering'); });
  });

  document.addEventListener('mouseleave', function () {
    dot.style.opacity = '0';
    ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', function () {
    dot.style.opacity = '1';
    ring.style.opacity = '1';
  });
}

/* ================================================================
   SHARED INTERSECTION OBSERVER
   Handles:  .reveal fade-up  |  h2 word reveal  |  .odometer-stat
   ================================================================ */
function initSharedObserver() {
  if (!('IntersectionObserver' in window)) {
    // Fallback — show everything immediately
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
    document.querySelectorAll('h2').forEach(splitH2);
    document.querySelectorAll('h2').forEach(function (h2) { h2.classList.add('words-revealed'); });
    document.querySelectorAll('.odometer-stat').forEach(buildOdometer);
    document.querySelectorAll('.odometer-stat').forEach(fireOdometer);
    return;
  }

  // --- Prepare h2 word splits before observing ---
  document.querySelectorAll('h2').forEach(splitH2);

  // --- Build odometer DOM before observing ---
  document.querySelectorAll('.odometer-stat').forEach(buildOdometer);

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;

      if (el.classList.contains('reveal')) {
        el.classList.add('visible');
      }
      if (el.tagName === 'H2') {
        el.classList.add('words-revealed');
      }
      if (el.classList.contains('odometer-stat')) {
        fireOdometer(el);
      }

      observer.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(function (el) { observer.observe(el); });
  document.querySelectorAll('h2').forEach(function (el) { observer.observe(el); });
  document.querySelectorAll('.odometer-stat').forEach(function (el) { observer.observe(el); });
}

/* ================================================================
   TEXT REVEAL — split h2 words
   ================================================================ */
function splitH2(h2) {
  if (h2.dataset.wordSplit) return; // already done
  h2.dataset.wordSplit = '1';
  var words = h2.textContent.trim().split(/\s+/);
  h2.innerHTML = words.map(function (word, i) {
    return '<span class="word-reveal-wrap">' +
           '<span class="word-reveal-inner" style="transition-delay:' + (i * 0.1) + 's">' +
           word + '</span></span>';
  }).join(' ');
}

/* ================================================================
   ODOMETER — build DOM + fire animation
   ================================================================ */
var DIGIT_H = 60; // px — hardcoded, never measure DOM

function buildOdometer(el) {
  if (el.dataset.odoBuilt) return;
  el.dataset.odoBuilt = '1';

  var target = parseInt(el.getAttribute('data-target'), 10) || 0;
  var suffix = el.getAttribute('data-suffix') || '';
  var digits = String(target).split('');

  var html = digits.map(function (d, idx) {
    var reelHtml = '';
    for (var n = 0; n <= 9; n++) {
      reelHtml += '<div class="odometer-digit-char">' + n + '</div>';
    }
    return '<div class="odometer-digit-slot">' +
             '<div class="odometer-digit-reel" data-final="' + d + '" data-idx="' + idx + '">' +
             reelHtml +
             '</div>' +
           '</div>';
  }).join('');

  if (suffix) {
    html += '<span class="odometer-suffix">' + suffix + '</span>';
  }
  el.innerHTML = html;
}

function fireOdometer(el) {
  el.querySelectorAll('.odometer-digit-reel').forEach(function (reel) {
    var finalDigit = parseInt(reel.getAttribute('data-final'), 10);
    var idx        = parseInt(reel.getAttribute('data-idx'), 10);
    var targetY    = -(finalDigit * DIGIT_H);

    setTimeout(function () {
      reel.classList.add('rolling');
      reel.style.transform = 'translateY(' + targetY + 'px)';
    }, idx * 150);
  });
}

/* ================================================================
   GALLERY GLOBE (gallery.html only)
   ================================================================ */
var GALLERY_DATA = [
  { src: 'https://picsum.photos/seed/artist1/400/600',    title: 'DSP India Tour',       sub: 'Artist Moments', category: 'artist' },
  { src: 'https://picsum.photos/seed/crowd1/800/500',     title: 'Live Show',             sub: 'Live Events',    category: 'live' },
  { src: 'https://picsum.photos/seed/artist2/400/600',    title: 'Hybe India Auditions',  sub: 'Artist Moments', category: 'artist' },
  { src: 'https://picsum.photos/seed/stage1/800/500',     title: 'Splash n Play',         sub: 'Live Events',    category: 'live' },
  { src: 'https://picsum.photos/seed/portrait1/400/600',  title: 'Artist Meet',           sub: 'Artist Moments', category: 'artist' },
  { src: 'https://picsum.photos/seed/corporate1/800/500', title: 'Corporate Summit',      sub: 'Corporate',      category: 'corporate' },
  { src: 'https://picsum.photos/seed/event1/800/500',     title: 'Grand Stage Night',     sub: 'Live Events',    category: 'live' },
  { src: 'https://picsum.photos/seed/celebration/800/500',title: 'CSR Initiative',        sub: 'CSR',            category: 'csr' },
];

function initGalleryGlobe() {
  var scene   = document.getElementById('globe-scene');
  var ring    = document.getElementById('globe-ring');
  var caption = document.getElementById('globe-caption');
  var captTitle = document.getElementById('globe-caption-title');
  var captSub   = document.getElementById('globe-caption-sub');
  var dotsWrap  = document.getElementById('globe-dots');
  var prevBtn   = document.getElementById('globe-prev');
  var nextBtn   = document.getElementById('globe-next');
  var mobileCarousel = document.getElementById('mobile-carousel');
  var filterBtns = document.querySelectorAll('.gallery-filter-btn');

  if (!scene && !mobileCarousel) return; // not gallery page

  var currentFilter = 'all';
  var activeIndex   = 0;
  var autoTimer     = null;
  var isHovering    = false;

  function getFiltered() {
    if (currentFilter === 'all') return GALLERY_DATA;
    return GALLERY_DATA.filter(function (d) { return d.category === currentFilter; });
  }

  // Positions on the globe (8 slots = 360/8 = 45deg apart)
  // translateZ(300px) puts each card on globe surface
  var SLOT_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
  var Z_RADIUS = 300;

  function getCardStyle(slotAngle) {
    var rad = slotAngle * Math.PI / 180;
    var absAngle = ((slotAngle % 360) + 360) % 360;
    // Opacity and scale based on how "front-facing" the card is
    // 0deg = front, 180deg = back
    var frontness = Math.cos(rad); // 1 at front, -1 at back
    var opacity = Math.max(0.1, (frontness + 1) / 2 * 0.9 + 0.1);
    var scale   = Math.max(0.4,  (frontness + 1) / 2 * 0.6 + 0.4);
    return {
      transform: 'rotateY(' + slotAngle + 'deg) translateZ(' + Z_RADIUS + 'px) scale(' + scale.toFixed(2) + ')',
      opacity: opacity.toFixed(2),
      zIndex: Math.round(frontness * 10 + 10),
    };
  }

  function buildGlobeCards(data) {
    if (!ring) return;
    ring.innerHTML = '';

    var total = Math.min(data.length, 8);
    for (var i = 0; i < total; i++) {
      var item  = data[i];
      var angle = (i / total) * 360; // evenly distributed
      var style = getCardStyle(angle);

      var card = document.createElement('div');
      card.className = 'globe-card';
      card.setAttribute('data-index', i);
      card.setAttribute('data-base-angle', angle.toFixed(2));
      card.style.transform = style.transform;
      card.style.opacity   = style.opacity;
      card.style.zIndex    = style.zIndex;

      card.innerHTML = '<img src="' + item.src + '" alt="' + item.title + '" loading="lazy">' +
                       '<div class="globe-card-overlay"></div>';

      (function(idx) {
        card.addEventListener('click', function () { goTo(idx); });
      })(i);

      ring.appendChild(card);
    }
  }

  function buildDots(data) {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = '';
    var total = Math.min(data.length, 8);
    for (var i = 0; i < total; i++) {
      var dot = document.createElement('button');
      dot.className = 'globe-dot' + (i === activeIndex ? ' active' : '');
      dot.setAttribute('aria-label', 'Photo ' + (i + 1));
      (function(idx) {
        dot.addEventListener('click', function () { goTo(idx); });
      })(i);
      dotsWrap.appendChild(dot);
    }
  }

  function buildMobile(data) {
    if (!mobileCarousel) return;
    mobileCarousel.innerHTML = '';
    data.forEach(function (item) {
      var div = document.createElement('div');
      div.className = 'mobile-carousel-item';
      div.innerHTML = '<img src="' + item.src + '" alt="' + item.title + '" loading="lazy">' +
                      '<div class="mobile-carousel-caption">' + item.title + '</div>';
      mobileCarousel.appendChild(div);
    });
  }

  function updateCaption(data) {
    if (!captTitle || !captSub) return;
    var item = data[activeIndex];
    if (item) {
      captTitle.textContent = item.title;
      captSub.textContent   = item.sub;
    }
  }

  function updateDots() {
    if (!dotsWrap) return;
    dotsWrap.querySelectorAll('.globe-dot').forEach(function (d, i) {
      d.classList.toggle('active', i === activeIndex);
    });
  }

  // Stop auto-spin, rotate so active card faces front
  function applyRotation(data) {
    if (!ring) return;
    var total = Math.min(data.length, 8);
    // Each card's base angle; we want activeIndex card at 0deg (front)
    var offset = -(activeIndex / total) * 360;

    // Temporarily remove auto-spin to apply rotation
    ring.classList.remove('auto-spin');
    ring.style.transform = 'rotateY(' + offset + 'deg)';
    ring.style.transition = 'transform 0.7s cubic-bezier(0.23, 1, 0.32, 1)';

    updateCaption(data);
    updateDots();

    // Resume auto-spin after user interaction timeout
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function () {
      ring.style.transition = '';
      ring.style.transform  = '';
      ring.classList.add('auto-spin');
    }, 4000);
  }

  function goTo(idx) {
    var data = getFiltered();
    if (!data.length) return;
    activeIndex = ((idx % data.length) + data.length) % data.length;
    applyRotation(data);
  }

  function next() { goTo(activeIndex + 1); }
  function prev() { goTo(activeIndex - 1); }

  function startAutoSpin() {
    if (!ring) return;
    ring.classList.add('auto-spin');
  }

  function init() {
    activeIndex = 0;
    var data = getFiltered();
    buildGlobeCards(data);
    buildDots(data);
    buildMobile(data);
    updateCaption(data);
    updateDots();
    startAutoSpin();
  }

  // Pause on hover
  if (scene) {
    scene.addEventListener('mouseenter', function () {
      isHovering = true;
      if (ring) ring.classList.add('paused');
    });
    scene.addEventListener('mouseleave', function () {
      isHovering = false;
      if (ring) ring.classList.remove('paused');
    });
  }

  // Arrow nav
  if (prevBtn) prevBtn.addEventListener('click', function () { prev(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { next(); });

  // Touch swipe on scene
  var touchStartX = 0;
  if (scene) {
    scene.addEventListener('touchstart', function (e) { touchStartX = e.touches[0].clientX; }, { passive: true });
    scene.addEventListener('touchend', function (e) {
      var diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) { diff > 0 ? next() : prev(); }
    }, { passive: true });
  }

  // Keyboard
  document.addEventListener('keydown', function (e) {
    if (!scene) return;
    if (e.key === 'ArrowLeft')  prev();
    if (e.key === 'ArrowRight') next();
  });

  // Filter buttons
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      currentFilter = btn.getAttribute('data-filter');
      activeIndex   = 0;
      init();
    });
  });

  init();
}

/* ================================================================
   CONTACT FORM
   ================================================================ */
function initContactForm() {
  var SCRIPT_URL    = 'PASTE_YOUR_SCRIPT_URL';
  var RATE_LIMIT_MS = 60000;
  var RATE_LIMIT_KEY = 'vivante_last_submit';

  var form       = document.getElementById('contact-form');
  if (!form) return;

  var submitBtn    = document.getElementById('submit-btn');
  var formMessage  = document.getElementById('form-message');
  var defaultBtnTxt = submitBtn ? submitBtn.textContent : 'SEND ENQUIRY →';

  function showMsg(text, type) {
    if (!formMessage) return;
    formMessage.textContent = text;
    formMessage.className = 'form-message ' + type;
    formMessage.classList.remove('hidden');
  }
  function hideMsg() { if (formMessage) formMessage.classList.add('hidden'); }

  function clearErrors() {
    form.querySelectorAll('.error').forEach(function (el) { el.classList.remove('error'); });
  }

  function validate(data) {
    clearErrors();
    var ok = true;
    if (!data.fullName.trim()) { document.getElementById('fullName').classList.add('error'); ok = false; }
    if (!data.phone.trim())    { document.getElementById('phone').classList.add('error');    ok = false; }
    if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      document.getElementById('email').classList.add('error'); ok = false;
    }
    return ok;
  }

  function isRateLimited() {
    var last = sessionStorage.getItem(RATE_LIMIT_KEY);
    return last && (Date.now() - parseInt(last, 10) < RATE_LIMIT_MS);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideMsg();

    var honeypot = form.querySelector('[name="website"]');
    if (honeypot && honeypot.value.trim()) return;

    if (isRateLimited()) { showMsg('Please wait a moment before submitting again.', 'error'); return; }

    var fd = new FormData(form);
    var data = {
      fullName:  fd.get('fullName')  || '',
      company:   fd.get('company')   || '',
      phone:     fd.get('phone')     || '',
      email:     fd.get('email')     || '',
      eventType: fd.get('eventType') || '',
      eventDate: fd.get('eventDate') || '',
      guests:    fd.get('guests')    || '',
      budget:    fd.get('budget')    || '',
      message:   fd.get('message')   || '',
    };

    if (!validate(data)) { showMsg('Please fill in all required fields correctly.', 'error'); return; }

    if (SCRIPT_URL === 'PASTE_YOUR_SCRIPT_URL') {
      showMsg('Form is not yet connected. Please configure the Google Apps Script URL in js/main.js', 'error');
      return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

    fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (result.result === 'success' || result.success === true) {
        sessionStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
        form.reset();
        showMsg("Thanks! We'll get back within 24hrs", 'success');
      } else {
        showMsg('Something went wrong, please WhatsApp us directly', 'error');
      }
    })
    .catch(function () { showMsg('Something went wrong, please WhatsApp us directly', 'error'); })
    .finally(function () {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = defaultBtnTxt; }
    });
  });
}
