/**
 * Vivante Events — Shared JavaScript
 * Navbar, scroll reveal, stats counter, contact form
 */

(function () {
  'use strict';

  var SCRIPT_URL = 'PASTE_YOUR_SCRIPT_URL';
  var RATE_LIMIT_MS = 60000;
  var RATE_LIMIT_KEY = 'vivante_last_submit';

  /* ---- Navbar scroll shadow ---- */
  var navbar = document.getElementById('navbar');
  if (navbar) {
    function onScroll() {
      if (window.scrollY > 20) {
        navbar.classList.add('navbar-scrolled');
      } else {
        navbar.classList.remove('navbar-scrolled');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- Mobile nav toggle ---- */
  var navToggle = document.getElementById('nav-toggle');
  var mobileMenu = document.getElementById('mobile-menu');
  var iconOpen = document.getElementById('icon-open');
  var iconClose = document.getElementById('icon-close');

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.contains('open');
      mobileMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(!isOpen));
      if (iconOpen && iconClose) {
        iconOpen.classList.toggle('hidden', !isOpen);
        iconClose.classList.toggle('hidden', isOpen);
      }
    });

    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        if (iconOpen && iconClose) {
          iconOpen.classList.remove('hidden');
          iconClose.classList.add('hidden');
        }
      });
    });
  }

  /* ---- Scroll reveal ---- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var revealObs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );
    revealEls.forEach(function (el) {
      revealObs.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  /* ---- Stats counter (index.html) ---- */
  var statsAnimated = false;
  var statEls = document.querySelectorAll('.stat-num');

  function animateValue(el, target, suffix, duration) {
    suffix = suffix || '';
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.floor(eased * target);
      el.textContent = current + suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target + suffix;
      }
    }
    requestAnimationFrame(step);
  }

  function runStats() {
    if (statsAnimated || !statEls.length) return;
    statsAnimated = true;
    statEls.forEach(function (el) {
      var target = parseInt(el.getAttribute('data-target'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      animateValue(el, target, suffix, 1800);
    });
  }

  var statsSection = document.querySelector('.stats-panel') || document.querySelector('.stats-section');
  if (statsSection && 'IntersectionObserver' in window) {
    var statsObs = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          runStats();
          statsObs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    statsObs.observe(statsSection);
  } else if (statEls.length) {
    runStats();
  }

  /* ---- Gallery page filters ---- */
  var galleryFilters = document.getElementById('gallery-filters');
  var masonryItems = document.querySelectorAll('.masonry-item');

  if (galleryFilters && masonryItems.length) {
    galleryFilters.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-filter]');
      if (!btn) return;

      var filter = btn.getAttribute('data-filter');
      galleryFilters.querySelectorAll('[data-filter]').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      masonryItems.forEach(function (item) {
        var cat = item.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          item.classList.remove('is-hidden');
        } else {
          item.classList.add('is-hidden');
        }
      });
    });
  }

  /* ---- Contact form ---- */
  var contactForm = document.getElementById('contact-form');
  if (!contactForm) return;

  var submitBtn = document.getElementById('submit-btn');
  var formMessage = document.getElementById('form-message');
  var defaultBtnText = submitBtn ? submitBtn.textContent : 'SEND ENQUIRY →';

  function showMessage(text, type) {
    if (!formMessage) return;
    formMessage.textContent = text;
    formMessage.className = 'form-message ' + type;
    formMessage.classList.remove('hidden');
  }

  function hideMessage() {
    if (formMessage) formMessage.classList.add('hidden');
  }

  function clearErrors() {
    contactForm.querySelectorAll('.error').forEach(function (el) {
      el.classList.remove('error');
    });
  }

  function validateForm(data) {
    clearErrors();
    var valid = true;

    if (!data.fullName.trim()) {
      document.getElementById('fullName').classList.add('error');
      valid = false;
    }
    if (!data.phone.trim()) {
      document.getElementById('phone').classList.add('error');
      valid = false;
    }
    if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      document.getElementById('email').classList.add('error');
      valid = false;
    }
    return valid;
  }

  function isRateLimited() {
    var lastSubmit = sessionStorage.getItem(RATE_LIMIT_KEY);
    if (!lastSubmit) return false;
    return Date.now() - parseInt(lastSubmit, 10) < RATE_LIMIT_MS;
  }

  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    hideMessage();

    var honeypot = contactForm.querySelector('[name="website"]');
    if (honeypot && honeypot.value.trim() !== '') {
      return;
    }

    if (isRateLimited()) {
      showMessage('Please wait a moment before submitting again.', 'error');
      return;
    }

    var formData = new FormData(contactForm);
    var data = {
      fullName: formData.get('fullName') || '',
      company: formData.get('company') || '',
      phone: formData.get('phone') || '',
      email: formData.get('email') || '',
      eventType: formData.get('eventType') || '',
      eventDate: formData.get('eventDate') || '',
      guests: formData.get('guests') || '',
      budget: formData.get('budget') || '',
      message: formData.get('message') || '',
    };

    if (!validateForm(data)) {
      showMessage('Please fill in all required fields correctly.', 'error');
      return;
    }

    if (SCRIPT_URL === 'PASTE_YOUR_SCRIPT_URL') {
      showMessage('Form is not yet connected. Please configure the Google Apps Script URL in js/main.js', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
    }

    fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (result) {
        var ok =
          result.result === 'success' ||
          result.success === true;
        if (ok) {
          sessionStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
          contactForm.reset();
          showMessage("Thanks! We'll get back within 24hrs", 'success');
        } else {
          showMessage(
            'Something went wrong, please WhatsApp us directly',
            'error'
          );
        }
      })
      .catch(function () {
        showMessage(
          'Something went wrong, please WhatsApp us directly',
          'error'
        );
      })
      .finally(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = defaultBtnText;
        }
      });
  });
})();
