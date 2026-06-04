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
var DIGIT_H = 0;

function getDigitH() {
  if (DIGIT_H > 0) return DIGIT_H;
  var test = document.querySelector('.odometer-digit-char');
  if (test) { DIGIT_H = test.offsetHeight || 28; }
  else { DIGIT_H = 28; }
  return DIGIT_H;
}

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
    var targetY    = -(finalDigit * getDigitH());

    setTimeout(function () {
      console.log('Firing odometer, finalDigit:', finalDigit, 'targetY:', targetY);
      reel.classList.add('rolling');
      reel.style.transform = 'translateY(' + targetY + 'px)';
    }, idx * 150);
  });
}

/* ================================================================
   GALLERY GLOBE (gallery.html only) — TRUE 3D SPHERE
   ================================================================ */
var GALLERY_DATA = [
  { src:'https://picsum.photos/seed/artist1/400/600',
    title:'DSP India Tour', sub:'Artist Moments',
    category:'artist', orientation:'portrait' },
  { src:'https://picsum.photos/seed/crowd1/800/500',
    title:'Live Show', sub:'Live Events',
    category:'live', orientation:'landscape' },
  { src:'https://picsum.photos/seed/artist2/400/600',
    title:'Hybe India Auditions', sub:'Artist Moments',
    category:'artist', orientation:'portrait' },
  { src:'https://picsum.photos/seed/stage1/800/500',
    title:'Splash n Play', sub:'Live Events',
    category:'live', orientation:'landscape' },
  { src:'https://picsum.photos/seed/portrait1/400/600',
    title:'Artist Meet', sub:'Artist Moments',
    category:'artist', orientation:'portrait' },
  { src:'https://picsum.photos/seed/corporate1/800/500',
    title:'Corporate Summit', sub:'Corporate',
    category:'corporate', orientation:'landscape' },
  { src:'https://picsum.photos/seed/event1/800/500',
    title:'Grand Stage Night', sub:'Live Events',
    category:'live', orientation:'landscape' },
  { src:'https://picsum.photos/seed/celebration/800/500',
    title:'CSR Initiative', sub:'CSR',
    category:'csr', orientation:'landscape' },
];

function fibonacciSphere(n, total) {
  var goldenAngle = Math.PI * (3 - Math.sqrt(5));
  var y = 1 - (n / (total - 1)) * 2;
  var radius = Math.sqrt(1 - y * y);
  var theta = goldenAngle * n;
  return {
    x: Math.cos(theta) * radius,
    y: y,
    z: Math.sin(theta) * radius
  };
}

function calcRadius(count) {
  var base = 260;
  var extra = Math.max(0, count - 8) * 14;
  return Math.min(base + extra, 550);
}

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
  var isDragging    = false;
  var dragStartX    = 0;
  var dragStartY    = 0;
  var sphereRotX    = 0;
  var sphereRotY    = 0;
  var autoRotateY   = 0;
  var touchActive   = false;
  var autoRotate    = true;

  var SPHERE_RADIUS = calcRadius(GALLERY_DATA.length);

  // Touch handlers for globe pause/resume
  scene.addEventListener('touchstart', function() {
    autoRotate = false;
  }, { passive: true });

  scene.addEventListener('touchend', function() {
    setTimeout(function() { autoRotate = true; }, 2500);
  }, { passive: true });

  function getFiltered() {
    if (currentFilter === 'all') return GALLERY_DATA;
    return GALLERY_DATA.filter(function (d) { return d.category === currentFilter; });
  }

  function buildGlobeCards(data) {
    if (!ring) return;
    ring.innerHTML = '';

    var total = data.length;
    var Z_RADIUS = Math.min(260 + Math.max(0, total - 8) * 14, 520);
    var sphereR = Z_RADIUS;

    for (var i = 0; i < total; i++) {
      var item  = data[i];
      var pos   = fibonacciSphere(i, total);
      
      var rotY = Math.atan2(pos.x, pos.z) * 180 / Math.PI;
      var rotX = Math.asin(-pos.y) * 180 / Math.PI;

      var card = document.createElement('div');
      card.className = 'globe-card';
      card.setAttribute('data-index', i);

      var isPortrait = item.orientation === 'portrait';
      card.style.width  = isPortrait ? '160px' : '220px';
      card.style.height = isPortrait ? '220px' : '155px';
      card.style.borderRadius = '10px';
      card.style.overflow = 'hidden';
      card.style.position = 'absolute';

      card.style.transform = 'rotateY(' + rotY + 'deg) rotateX(' + rotX + 'deg) translateZ(' + sphereR + 'px)';

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
    for (var i = 0; i < data.length; i++) {
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
    var mc = document.getElementById('mobile-carousel');
    if (!mc) return;
    mc.innerHTML = '';
    data.forEach(function(item) {
      var card = document.createElement('div');
      var isPortrait = item.orientation === 'portrait';
      card.className = 'mobile-carousel-item';
      card.style.flexShrink = '0';
      card.style.scrollSnapAlign = 'center';
      card.style.borderRadius = '12px';
      card.style.overflow = 'hidden';
      card.style.position = 'relative';
      card.style.background = '#1a1a1a';
      if (isPortrait) {
        card.style.width = '58vw';
        card.style.maxWidth = '240px';
        card.style.height = '82vw';
        card.style.maxHeight = '340px';
      } else {
        card.style.width = '78vw';
        card.style.maxWidth = '340px';
        card.style.height = '52vw';
        card.style.maxHeight = '220px';
      }
      var img = document.createElement('img');
      img.src = item.src;
      img.alt = item.title;
      img.loading = 'lazy';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      var cap = document.createElement('div');
      cap.textContent = item.title;
      cap.style.cssText =
        'position:absolute;bottom:0;left:0;right:0;' +
        'background:linear-gradient(transparent,rgba(0,0,0,0.85));' +
        'color:#fff;padding:1.5rem 0.75rem 0.75rem;' +
        'font-family:DM Sans,sans-serif;' +
        'font-size:clamp(0.7rem,3vw,0.85rem);';
      card.appendChild(img);
      card.appendChild(cap);
      mc.appendChild(card);
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

  function goTo(idx) {
    var data = getFiltered();
    if (!data.length) return;
    activeIndex = ((idx % data.length) + data.length) % data.length;
    updateCaption(data);
    updateDots();
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function () {
      autoRotateY = 0;
    }, 2000);
  }

  function next() { 
    var data = getFiltered();
    goTo((activeIndex + 1) % data.length); 
  }
  function prev() { 
    var data = getFiltered();
    goTo((activeIndex - 1 + data.length) % data.length); 
  }

  // Drag interaction
  if (scene) {
    scene.addEventListener('mousedown', function (e) {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      clearTimeout(autoTimer);
    });

    document.addEventListener('mousemove', function (e) {
      if (!isDragging || !ring) return;
      var deltaX = e.clientX - dragStartX;
      var deltaY = e.clientY - dragStartY;
      
      sphereRotY += deltaX * 0.4;
      sphereRotX -= deltaY * 0.4;
      
      if (sphereRotX > 60) sphereRotX = 60;
      if (sphereRotX < -60) sphereRotX = -60;
      
      ring.style.transform = 'rotateY(' + sphereRotY + 'deg) rotateX(' + sphereRotX + 'deg)';
      
      dragStartX = e.clientX;
      dragStartY = e.clientY;
    });

    document.addEventListener('mouseup', function () {
      if (isDragging) {
        isDragging = false;
        clearTimeout(autoTimer);
        autoTimer = setTimeout(function () {
          autoRotateY = 0;
        }, 2000);
      }
    });

    scene.addEventListener('touchstart', function (e) {
      isDragging = true;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      clearTimeout(autoTimer);
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (!isDragging || !ring) return;
      var deltaX = e.touches[0].clientX - dragStartX;
      var deltaY = e.touches[0].clientY - dragStartY;
      
      sphereRotY += deltaX * 0.4;
      sphereRotX -= deltaY * 0.4;
      
      if (sphereRotX > 60) sphereRotX = 60;
      if (sphereRotX < -60) sphereRotX = -60;
      
      ring.style.transform = 'rotateY(' + sphereRotY + 'deg) rotateX(' + sphereRotX + 'deg)';
      
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', function () {
      if (isDragging) {
        isDragging = false;
        clearTimeout(autoTimer);
        autoTimer = setTimeout(function () {
          autoRotateY = 0;
        }, 2000);
      }
    });
  }

  // Arrow nav
  if (prevBtn) prevBtn.addEventListener('click', function () { prev(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { next(); });

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
      sphereRotX    = 0;
      sphereRotY    = 0;
      autoRotateY   = 0;
      var data = getFiltered();
      buildGlobeCards(data);
      buildDots(data);
      buildMobile(data);
      updateCaption(data);
      updateDots();
    });
  });

  // Auto-rotate animation loop
  var rafId = null;
  function animateAutoRotate() {
    if (!isDragging && autoRotate) {
      autoRotateY += 0.15;
    }
    if (ring) {
      ring.style.transform = 'rotateY(' + (sphereRotY + autoRotateY) + 'deg) rotateX(' + sphereRotX + 'deg)';
    }
    rafId = requestAnimationFrame(animateAutoRotate);
  }
  rafId = requestAnimationFrame(animateAutoRotate);

  // Initial build
  var data = getFiltered();
  buildGlobeCards(data);
  buildDots(data);
  buildMobile(data);
  updateCaption(data);
  updateDots();
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
