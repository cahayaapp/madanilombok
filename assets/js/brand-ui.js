// Shared public-page navigation; independent of optional CMS data.
const menuButton = document.querySelector('.mobile-toggle');
const mobileMenu = document.querySelector('.mobile-menu');
menuButton?.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(expanded));
  mobileMenu?.classList.toggle('open', expanded);
});
document.querySelectorAll('[data-year]').forEach(element => { element.textContent = new Date().getFullYear(); });
