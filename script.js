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

// Beschikbaarheid: vinkje "weet ik nog niet" schakelt dropdown uit
const beschikbaarSelect = document.getElementById('beschikbaar');
const beschikbaarOnzeker = document.querySelector('input[name="beschikbaar_onzeker"]');
if (beschikbaarSelect && beschikbaarOnzeker) {
  beschikbaarOnzeker.addEventListener('change', () => {
    beschikbaarSelect.disabled = beschikbaarOnzeker.checked;
    if (beschikbaarOnzeker.checked) {
      beschikbaarSelect.value = '';
    }
  });
}

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
