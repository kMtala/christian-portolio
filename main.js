/* ==========================================================================
   Christian J. Salgado — Portfolio interactions
   Lightweight, dependency-free, progressive enhancement
   ========================================================================== */

(function () {
  'use strict';

  var body = document.body;
  var slice = Array.prototype.slice;

  var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var prefersReducedMotion = reducedMotionQuery.matches;

  var toTop = document.getElementById('toTop');
  var loader = document.getElementById('loader');
  var rail = document.getElementById('rail');
  var railIndicator = document.getElementById('railIndicator');
  var tabbar = document.getElementById('tabbar');
  var progressBar = document.getElementById('scrollProgress');
  var ringFill = document.getElementById('toTopRing');
  var cursorLabel = document.getElementById('cursorLabel');
  var portrait = document.querySelector('.portrait');

  var RING_CIRCUMFERENCE = 138.23;
  var parallaxEnabled = !prefersReducedMotion && window.matchMedia('(min-width: 720px)').matches;

  /* ------------------------------------------------------------------
     1. Page loading entrance
     ------------------------------------------------------------------ */
  function finishLoading() {
    if (loader) {
      loader.classList.add('is-done');
      window.setTimeout(function () {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 700);
    }
    body.classList.add('is-loaded');
  }

  if (document.readyState === 'complete') {
    window.requestAnimationFrame(finishLoading);
  } else {
    window.addEventListener('load', finishLoading);
    // Safety net so content is never left hidden.
    window.setTimeout(finishLoading, 2500);
  }

  /* ------------------------------------------------------------------
     2. Scroll feedback — progress bar, back-to-top, hero parallax
     ------------------------------------------------------------------ */
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;

    if (toTop) toTop.classList.toggle('is-visible', y > 520);

    var max = document.documentElement.scrollHeight - window.innerHeight;
    var progress = max > 0 ? Math.min(Math.max(y / max, 0), 1) : 0;

    if (progressBar) progressBar.style.transform = 'scaleX(' + progress + ')';
    if (ringFill) ringFill.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress));

    // Subtle hero parallax — nudged by how far the portrait sits from centre.
    if (parallaxEnabled && portrait) {
      var rect = portrait.getBoundingClientRect();
      var delta = (window.innerHeight / 2 - (rect.top + rect.height / 2)) / window.innerHeight;
      var shift = Math.max(-14, Math.min(14, delta * 26));
      portrait.style.setProperty('--py', shift.toFixed(2) + 'px');
    }

    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(onScroll);
    }
  }, { passive: true });

  onScroll();

  /* ------------------------------------------------------------------
     3. Scroll-triggered reveals
     ------------------------------------------------------------------ */
  var revealItems = slice.call(document.querySelectorAll('[data-reveal]'));

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    revealItems.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ------------------------------------------------------------------
     4. Active navigation state (rail + indicator, tab bar)
     ------------------------------------------------------------------ */
  var navLinks = slice.call(document.querySelectorAll('[data-nav-link]'));
  var railItems = slice.call(document.querySelectorAll('.rail__item'));

  // Unique destinations, in document order.
  var sectionIds = [];
  navLinks.forEach(function (link) {
    var hash = link.getAttribute('href');
    if (hash && hash.charAt(0) === '#' && sectionIds.indexOf(hash.slice(1)) === -1) {
      sectionIds.push(hash.slice(1));
    }
  });

  var sections = sectionIds
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  function activeId() {
    if (!sections.length) return '';
    var position = window.scrollY + 90;
    var current = sections[0];

    sections.forEach(function (section) {
      if (section.offsetTop <= position) current = section;
    });

    // Pin the last section when the page is scrolled to the bottom.
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
      current = sections[sections.length - 1];
    }

    return current.id;
  }

  var lastActiveId = '';

  function moveRailIndicator() {
    if (!rail || !railIndicator) return;

    var active = null;
    railItems.forEach(function (item) {
      if (item.classList.contains('is-active')) active = item;
    });

    if (!active) {
      railIndicator.classList.remove('is-ready');
      return;
    }

    var height = railIndicator.offsetHeight || 22;
    var offset = active.offsetTop + (active.offsetHeight - height) / 2;
    railIndicator.style.transform = 'translateY(' + Math.round(offset) + 'px)';
    railIndicator.classList.add('is-ready');
  }

  function centerActiveTab(active) {
    if (!tabbar || !active || tabbar.offsetParent === null) return;
    var list = tabbar.querySelector('.tabbar__list');
    if (!list || list.scrollWidth <= list.clientWidth + 4) return;

    var rect = active.getBoundingClientRect();
    var listRect = list.getBoundingClientRect();
    if (rect.left < listRect.left || rect.right > listRect.right) {
      list.scrollTo({
        left: active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    }
  }

  function setActiveLink() {
    if (!sections.length) return;

    var id = activeId();
    var changed = id !== lastActiveId;
    lastActiveId = id;

    navLinks.forEach(function (link) {
      var isActive = link.getAttribute('href') === '#' + id;
      link.classList.toggle('is-active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
      if (isActive && changed && link.classList.contains('tabbar__item')) {
        centerActiveTab(link);
      }
    });

    if (changed || !railIndicator || !railIndicator.classList.contains('is-ready')) {
      moveRailIndicator();
    }
  }

  var activeTicking = false;

  window.addEventListener('scroll', function () {
    if (!activeTicking) {
      activeTicking = true;
      window.requestAnimationFrame(function () {
        setActiveLink();
        activeTicking = false;
      });
    }
  }, { passive: true });

  window.addEventListener('resize', function () {
    setActiveLink();
    moveRailIndicator();
  });

  window.addEventListener('load', function () {
    setActiveLink();
    moveRailIndicator();
  });

  setActiveLink();

  /* ------------------------------------------------------------------
     5. Navigation clicks — smooth scroll
     ------------------------------------------------------------------ */
  function scrollToTarget(target) {
    var top = target.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo({
      top: Math.max(top, 0),
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
  }

  slice.call(document.querySelectorAll('a[href^="#"]')).forEach(function (link) {
    link.addEventListener('click', function (event) {
      var hash = link.getAttribute('href');
      if (!hash || hash === '#') return;

      var target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();
      scrollToTarget(target);
      if (history.replaceState) history.replaceState(null, '', hash);
    });
  });

  /* ------------------------------------------------------------------
     6. Back to top
     ------------------------------------------------------------------ */
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ------------------------------------------------------------------
     7. Media placeholders — swap to real images when they exist
     ------------------------------------------------------------------ */
  slice.call(document.querySelectorAll('[data-media]')).forEach(function (media) {
    var img = media.querySelector('[data-image]');
    if (!img) return;

    var show = function () { media.classList.add('has-image'); };
    var hide = function () { media.classList.remove('has-image'); };

    if (img.complete) {
      (img.naturalWidth > 0 ? show : hide)();
    }
    img.addEventListener('load', show);
    img.addEventListener('error', hide);
  });

  /* ------------------------------------------------------------------
     8. Lightbox / modal (portfolio + certificates)
     ------------------------------------------------------------------ */
  var lightbox = document.getElementById('lightbox');
  var lightboxPanel = lightbox ? lightbox.querySelector('.lightbox__panel') : null;
  var lightboxStage = document.getElementById('lightboxStage');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxPlaceholder = document.getElementById('lightboxPlaceholder');
  var lightboxFile = document.getElementById('lightboxFile');
  var lightboxCategory = document.getElementById('lightboxCategory');
  var lightboxTitle = document.getElementById('lightboxTitle');
  var lightboxDesc = document.getElementById('lightboxDesc');
  var lightboxCount = document.getElementById('lightboxCount');
  var lightboxZoom = document.getElementById('lightboxZoom');
  var lightboxZoomUse = lightboxZoom ? lightboxZoom.querySelector('use') : null;
  var lightboxClose = lightbox ? lightbox.querySelector('.lightbox__close') : null;

  var triggers = slice.call(document.querySelectorAll('[data-lightbox-item]'));
  var galleries = {};

  triggers.forEach(function (item) {
    var key = item.getAttribute('data-gallery') || 'default';
    (galleries[key] = galleries[key] || []).push(item);
  });

  var currentGallery = [];
  var currentIndex = -1;
  var lastFocused = null;

  function setZoom(on) {
    if (lightboxStage) lightboxStage.classList.toggle('is-zoomed', on);
    if (lightboxZoom) lightboxZoom.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (lightboxZoomUse) lightboxZoomUse.setAttribute('href', on ? '#i-zoom-out' : '#i-zoom-in');
  }

  function render() {
    var item = currentGallery[currentIndex];
    if (!item) return;

    var src = item.getAttribute('href') || '';
    var file = src.split('/').pop();
    var date = item.getAttribute('data-date');

    lightboxCategory.textContent = date
      ? (item.getAttribute('data-category') || '') + ' · ' + date
      : (item.getAttribute('data-category') || '');
    lightboxTitle.textContent = item.getAttribute('data-title') || '';
    lightboxDesc.textContent = item.getAttribute('data-desc') || '';
    lightboxCount.textContent = (currentIndex + 1) + ' / ' + currentGallery.length;
    if (lightboxFile) lightboxFile.textContent = file || '';

    setZoom(false);
    if (lightboxStage) lightboxStage.scrollTop = 0;
    if (lightboxPlaceholder) lightboxPlaceholder.classList.remove('is-hidden');
    if (lightboxImg) {
      lightboxImg.classList.remove('is-ready');
      lightboxImg.alt = item.getAttribute('data-title') || '';
      lightboxImg.src = src;
    }
  }

  function openLightbox(item) {
    if (!lightbox) return;
    var key = item.getAttribute('data-gallery') || 'default';
    currentGallery = galleries[key] || [item];
    currentIndex = currentGallery.indexOf(item);
    if (currentIndex === -1) currentIndex = 0;

    lastFocused = item;
    render();
    lightbox.hidden = false;
    body.classList.add('is-locked');

    if (lightboxClose) {
      window.requestAnimationFrame(function () { lightboxClose.focus(); });
    }
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    setZoom(false);
    if (lightboxImg) lightboxImg.removeAttribute('src');
    body.classList.remove('is-locked');
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function step(direction) {
    if (currentGallery.length < 2) return;
    currentIndex = (currentIndex + direction + currentGallery.length) % currentGallery.length;
    render();
  }

  if (lightboxImg) {
    lightboxImg.addEventListener('load', function () {
      if (lightboxPlaceholder) lightboxPlaceholder.classList.add('is-hidden');
      lightboxImg.classList.add('is-ready');
    });
    lightboxImg.addEventListener('error', function () {
      lightboxImg.classList.remove('is-ready');
      if (lightboxPlaceholder) lightboxPlaceholder.classList.remove('is-hidden');
    });
  }

  triggers.forEach(function (item) {
    item.addEventListener('click', function (event) {
      event.preventDefault();
      openLightbox(item);
    });
  });

  if (lightbox) {
    slice.call(lightbox.querySelectorAll('[data-lightbox-close]')).forEach(function (el) {
      el.addEventListener('click', closeLightbox);
    });

    var prevBtn = lightbox.querySelector('[data-lightbox-prev]');
    var nextBtn = lightbox.querySelector('[data-lightbox-next]');
    if (prevBtn) prevBtn.addEventListener('click', function () { step(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { step(1); });

    if (lightboxZoom) {
      lightboxZoom.addEventListener('click', function () {
        setZoom(!lightboxStage.classList.contains('is-zoomed'));
      });
    }

    if (lightboxStage) {
      lightboxStage.addEventListener('click', function () {
        if (lightboxStage.classList.contains('is-zoomed')) setZoom(false);
      });
    }
  }

  document.addEventListener('keydown', function (event) {
    if (!lightbox || lightbox.hidden) return;

    if (event.key === 'Escape') {
      closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      step(-1);
    } else if (event.key === 'ArrowRight') {
      step(1);
    } else if (event.key === 'Tab' && lightboxPanel) {
      // Simple focus trap inside the dialog.
      var focusables = slice.call(
        lightboxPanel.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')
      ).filter(function (el) { return el.offsetParent !== null; });
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  /* ------------------------------------------------------------------
     9. Optional custom cursor (mouse devices only)
     ------------------------------------------------------------------ */
  var cursor = document.getElementById('cursor');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (cursor && finePointer && !prefersReducedMotion) {
    var cursorX = 0;
    var cursorY = 0;
    var cursorQueued = false;

    var paintCursor = function () {
      cursor.style.transform = 'translate(' + cursorX + 'px, ' + cursorY + 'px)';
      cursorQueued = false;
    };

    window.addEventListener('mousemove', function (event) {
      cursorX = event.clientX;
      cursorY = event.clientY;
      cursor.classList.add('is-visible');
      if (!cursorQueued) {
        cursorQueued = true;
        window.requestAnimationFrame(paintCursor);
      }
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      cursor.classList.remove('is-visible');
    });

    var hoverSelector = 'a, button, [data-lightbox-item], .rail__item, .tabbar__item, input, textarea';
    document.addEventListener('mouseover', function (event) {
      if (event.target.closest && event.target.closest(hoverSelector)) {
        cursor.classList.add('is-hover');
      }
    });
    document.addEventListener('mouseout', function (event) {
      if (event.target.closest && event.target.closest(hoverSelector)) {
        cursor.classList.remove('is-hover');
      }
    });
  } else if (cursor && cursor.parentNode) {
    cursor.parentNode.removeChild(cursor);
  }

  /* ------------------------------------------------------------------
     10. Enhanced motion & UI
     ------------------------------------------------------------------ */

  // Ribbon — duplicate the group so the marquee loops seamlessly (-50%).
  var ribbonTrack = document.getElementById('ribbonTrack');
  if (ribbonTrack) {
    var ribbonGroup = ribbonTrack.querySelector('.ribbon__group');
    if (ribbonGroup) ribbonTrack.appendChild(ribbonGroup.cloneNode(true));
  }

  // Auto-stagger reveals inside grids that don't declare their own delay.
  var staggerGrids = '.card-grid, .work-grid, .skill-grid, .soft-grid, .cert-grid, .mini-grid, .timeline';
  slice.call(document.querySelectorAll(staggerGrids)).forEach(function (grid) {
    slice.call(grid.children).forEach(function (child, index) {
      if (!child.hasAttribute || !child.hasAttribute('data-reveal')) return;
      if (child.style.getPropertyValue('--reveal-delay')) return;
      child.style.setProperty('--reveal-delay', Math.min(index * 0.06, 0.42).toFixed(2) + 's');
    });
  });

  if (finePointer && !prefersReducedMotion) {
    // Pointer spotlight across card surfaces.
    slice.call(document.querySelectorAll('.card, .mini-card, .skill-card, .soft-card, .timeline__card'))
      .forEach(function (card) {
        card.addEventListener('mousemove', function (event) {
          var rect = card.getBoundingClientRect();
          card.style.setProperty('--mx', ((event.clientX - rect.left) / rect.width) * 100 + '%');
          card.style.setProperty('--my', ((event.clientY - rect.top) / rect.height) * 100 + '%');
        });
        card.addEventListener('mouseleave', function () {
          card.style.removeProperty('--mx');
          card.style.removeProperty('--my');
        });
      });

    // Magnetic pull on action buttons.
    slice.call(document.querySelectorAll('.btn')).forEach(function (btn) {
      var pull = 7;
      btn.addEventListener('mousemove', function (event) {
        var rect = btn.getBoundingClientRect();
        var dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        var dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
        btn.style.setProperty('--tx', (dx * pull).toFixed(2) + 'px');
        btn.style.setProperty('--ty', (dy * pull).toFixed(2) + 'px');
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.setProperty('--tx', '0px');
        btn.style.setProperty('--ty', '0px');
      });
    });

    // Contextual cursor label over anything that opens in the lightbox.
    if (cursor && cursorLabel) {
      document.addEventListener('mouseover', function (event) {
        if (event.target.closest && event.target.closest('[data-lightbox-item]')) {
          cursorLabel.textContent = 'View';
          cursor.classList.add('has-label');
        }
      });
      document.addEventListener('mouseout', function (event) {
        if (event.target.closest && event.target.closest('[data-lightbox-item]')) {
          cursor.classList.remove('has-label');
        }
      });
    }
  }

  // Keep rail indicator correct once webfonts / layout settle.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { moveRailIndicator(); });
  }
})();
