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
// Als data-redirect aanwezig is, wordt daarheen doorgestuurd na verzending
document.querySelectorAll('form[data-netlify="true"]').forEach(function (form) {
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const body = new URLSearchParams(new FormData(form)).toString();
    const redirectUrl = form.dataset.redirect;
    try {
      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        form.innerHTML = '<p class="form__success">Bedankt voor je aanmelding! We nemen zo snel mogelijk contact met je op.</p>';
      }
    } catch {
      alert('Er is iets misgegaan. Probeer het opnieuw of stuur een e-mail naar t.horst@hervormdwoudenberg.nl.');
    }
  });
});

// Conditionele lijn-keuze bij Onderbouwcatechese aanmeldformulier
(function () {
  var groepSelect = document.getElementById('groep');
  var lijnRow = document.getElementById('lijn-row');
  if (!groepSelect || !lijnRow) return;
  groepSelect.addEventListener('change', function () {
    lijnRow.hidden = groepSelect.value !== 'Onderbouwcatechese';
  });
})();

// Conditionele groepskeuze bij Bijbeluur in het "Ik wil meehelpen"-formulier
(function () {
  var interesseSelect = document.getElementById('interesse');
  var bijbeluurGroepRow = document.getElementById('bijbeluur-groep-row');
  if (!interesseSelect || !bijbeluurGroepRow) return;
  function toggleBijbeluurGroep() {
    bijbeluurGroepRow.hidden = interesseSelect.value.indexOf('bijbeluur') !== 0;
  }
  interesseSelect.addEventListener('change', toggleBijbeluurGroep);
  toggleBijbeluurGroep();
})();

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

// Nav dropdowns — keyboard & click support (handles all .nav__item--dropdown)
(function () {
  const dropdowns = Array.from(document.querySelectorAll('.nav__item--dropdown'));
  if (!dropdowns.length) return;

  function closeAll() {
    dropdowns.forEach(d => {
      d.classList.remove('is-open');
      const t = d.querySelector('.nav__dropdown-toggle');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  }

  dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.nav__dropdown-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      if (window.innerWidth <= 768) return;
      const isOpen = dropdown.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      dropdowns.filter(d => d !== dropdown).forEach(d => {
        d.classList.remove('is-open');
        const t = d.querySelector('.nav__dropdown-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav__item--dropdown')) closeAll();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
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

// Feedback systeem — popup na 10 seconden, modal formulier, footer-knop
(function () {
  var POPUP_KEY = 'feedbackDismissed';

  var modalHTML = '<div class="feedback-modal" id="feedbackModal" role="dialog" aria-modal="true" aria-labelledby="feedbackModalTitle">'
    + '<div class="feedback-modal__dialog">'
    + '<button class="feedback-modal__close" id="feedbackModalClose" aria-label="Sluiten">&times;</button>'
    + '<h2 class="feedback-modal__title" id="feedbackModalTitle">Geef feedback</h2>'
    + '<p class="feedback-modal__sub">Wat vind je van de website? Jouw mening helpt ons het jeugdwerk beter te presenteren.</p>'
    + '<form class="form" id="feedbackForm">'
    + '<input type="hidden" name="form-name" value="feedback">'
    + '<div class="form__row">'
    + '<label for="feedbackNaam">Naam <span style="font-weight:400;text-transform:none;font-size:0.75rem;color:#999">(optioneel)</span></label>'
    + '<input type="text" id="feedbackNaam" name="naam" placeholder="Je naam">'
    + '</div>'
    + '<div class="form__row">'
    + '<label for="feedbackEmail">E-mail <span style="font-weight:400;text-transform:none;font-size:0.75rem;color:#999">(optioneel)</span></label>'
    + '<input type="email" id="feedbackEmail" name="email" placeholder="je@email.nl">'
    + '</div>'
    + '<div class="form__row">'
    + '<label for="feedbackBericht">Jouw feedback *</label>'
    + '<textarea id="feedbackBericht" name="bericht" rows="4" placeholder="Wat vind je goed? Wat kan beter? Mis je informatie?" required></textarea>'
    + '</div>'
    + '<button type="submit" class="btn">Verstuur feedback</button>'
    + '</form>'
    + '</div>'
    + '</div>';

  var popupHTML = '<div class="feedback-popup" id="feedbackPopup">'
    + '<button class="feedback-popup__close" id="feedbackPopupClose" aria-label="Sluiten">&times;</button>'
    + '<p class="feedback-popup__title">Wat vind jij van de website?</p>'
    + '<p class="feedback-popup__text">Help ons de site te verbeteren. Je feedback is erg waardevol!</p>'
    + '<button class="feedback-popup__btn js-feedback-open">Geef feedback</button>'
    + '</div>';

  document.body.insertAdjacentHTML('beforeend', modalHTML + popupHTML);

  var modal = document.getElementById('feedbackModal');
  var popup = document.getElementById('feedbackPopup');
  var form = document.getElementById('feedbackForm');

  function openModal() {
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    hidePopup();
    setTimeout(function () {
      var ta = document.getElementById('feedbackBericht');
      if (ta) ta.focus();
    }, 50);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function showPopup() {
    if (sessionStorage.getItem(POPUP_KEY)) return;
    popup.classList.add('is-visible');
  }

  function hidePopup() {
    popup.classList.remove('is-visible');
  }

  function dismissPopup() {
    hidePopup();
    sessionStorage.setItem(POPUP_KEY, '1');
  }

  // Popup na 10 seconden
  setTimeout(showPopup, 10000);

  document.getElementById('feedbackPopupClose').addEventListener('click', dismissPopup);

  document.getElementById('feedbackModalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });

  // Delegated click for all "open feedback" triggers
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('js-feedback-open')) openModal();
  });

  // Footer feedback kolom op alle pagina's
  var footerInner = document.querySelector('.footer__inner');
  if (footerInner) {
    footerInner.classList.add('footer__inner--with-feedback');
    var col = document.createElement('div');
    col.className = 'footer__feedback';
    col.innerHTML = '<h3>Feedback</h3>'
      + '<p>Heb je op- of aanmerkingen over de website? We horen het graag!</p>'
      + '<button class="feedback-footer-btn js-feedback-open">Geef feedback</button>';
    footerInner.appendChild(col);
  }

  // Formulier versturen via Netlify Forms
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var body = new URLSearchParams(new FormData(form)).toString();
    try {
      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
      });
      form.innerHTML = '<p class="form__success" style="margin-top:16px;">Bedankt voor je feedback! We gaan er goed naar kijken.</p>';
      sessionStorage.setItem(POPUP_KEY, '1');
      setTimeout(closeModal, 3000);
    } catch {
      alert('Er is iets misgegaan. Stuur je feedback naar t.horst@hervormdwoudenberg.nl.');
    }
  });
})();
