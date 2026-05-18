const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('is-open');
  hamburger.classList.toggle('is-open', isOpen);
  hamburger.setAttribute('aria-expanded', isOpen);
});

// Sluit mobiel menu bij klikken op een link
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('is-open');
    hamburger.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});

// Beschikbaarheid: custom checkbox dropdown
const availDrop = document.getElementById('availDrop');
const availBtn = availDrop && availDrop.querySelector('.avail-check__btn');
const availPanel = availDrop && availDrop.querySelector('.avail-check__panel');
const availSummary = availDrop && availDrop.querySelector('.avail-check__summary');
const beschikbaarOnzeker = availDrop && availDrop.querySelector('input[name="beschikbaar_onzeker"]');
const dagdeelBoxes = availDrop ? Array.from(availDrop.querySelectorAll('input[name="beschikbaar[]"]')) : [];

function updateAvailSummary() {
  if (beschikbaarOnzeker && beschikbaarOnzeker.checked) {
    availSummary.textContent = 'Weet ik nog niet';
    availSummary.classList.remove('is-placeholder');
    return;
  }
  const checked = dagdeelBoxes.filter(cb => cb.checked);
  if (checked.length === 0) {
    availSummary.textContent = 'Kies een moment…';
    availSummary.classList.add('is-placeholder');
  } else {
    availSummary.textContent = checked.map(cb =>
      cb.closest('.avail-check__item').textContent.trim()
    ).join(', ');
    availSummary.classList.remove('is-placeholder');
  }
}

function closeAvailDrop() {
  availPanel.hidden = true;
  availBtn.setAttribute('aria-expanded', 'false');
}

if (availBtn && availPanel) {
  availSummary.classList.add('is-placeholder');

  availBtn.addEventListener('click', () => {
    const isOpen = !availPanel.hidden;
    availPanel.hidden = isOpen;
    availBtn.setAttribute('aria-expanded', String(!isOpen));
  });

  dagdeelBoxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (beschikbaarOnzeker) beschikbaarOnzeker.checked = false;
      updateAvailSummary();
    });
  });

  if (beschikbaarOnzeker) {
    beschikbaarOnzeker.addEventListener('change', () => {
      if (beschikbaarOnzeker.checked) {
        dagdeelBoxes.forEach(cb => cb.checked = false);
        updateAvailSummary();
        closeAvailDrop();
      }
    });
  }

  document.addEventListener('click', e => {
    if (!availDrop.contains(e.target)) closeAvailDrop();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAvailDrop();
  });
}

// Netlify Forms AJAX — werkt voor alle formulieren op alle pagina's
document.querySelectorAll('form[data-netlify="true"]').forEach(function (form) {
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const body = new URLSearchParams(new FormData(form)).toString();
    try {
      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      form.innerHTML = '<p class="form__success">Bedankt voor je aanmelding! We nemen zo snel mogelijk contact met je op.</p>';
    } catch {
      alert('Er is iets misgegaan. Probeer het opnieuw of stuur een e-mail naar t.horst@hervormdwoudenberg.nl.');
    }
  });
});

// Foto-carrousel in de agenda-sectie
(function () {
  const track = document.getElementById('carouselTrack');
  const dotsContainer = document.getElementById('carouselDots');
  const btnPrev = document.getElementById('carouselPrev');
  const btnNext = document.getElementById('carouselNext');
  if (!track) return;

  const slides = track.querySelectorAll('.carousel__slide');
  const total = slides.length;
  let current = 0;
  let autoTimer;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'carousel__dot' + (i === 0 ? ' is-active' : '');
    dot.setAttribute('aria-label', 'Foto ' + (i + 1));
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  });

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = 'translateX(-' + (current * 100) + '%)';
    dotsContainer.querySelectorAll('.carousel__dot').forEach((d, i) => {
      d.classList.toggle('is-active', i === current);
    });
  }

  function startAuto() {
    autoTimer = setInterval(() => goTo(current + 1), 4000);
  }

  function resetAuto() {
    clearInterval(autoTimer);
    startAuto();
  }

  btnPrev.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
  btnNext.addEventListener('click', () => { goTo(current + 1); resetAuto(); });

  // Swipe-ondersteuning voor mobiel
  const carousel = document.getElementById('eventsCarousel');
  let touchStartX = null;
  carousel.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  carousel.addEventListener('touchend', e => {
    if (touchStartX === null) return;
    const dx = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 40) {
      goTo(dx > 0 ? current + 1 : current - 1);
      resetAuto();
    }
    touchStartX = null;
  }, { passive: true });

  startAuto();
})();

// "Wat we doen" nav dropdown — keyboard & click support
(function () {
  const dropdown = document.getElementById('watWeDoDropdown');
  if (!dropdown) return;
  const toggle = dropdown.querySelector('.nav__dropdown-toggle');

  function close() {
    dropdown.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', () => {
    if (window.innerWidth <= 768) return;
    const isOpen = dropdown.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
})();

// Smooth scroll met offset voor de vaste navigatie
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const id = anchor.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const navHeight = document.querySelector('.nav').offsetHeight;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 8;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});
