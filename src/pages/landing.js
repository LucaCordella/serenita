// landing.js - simple scroll animations + back-to-top + mobile nav toggle
(function(){
  // mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const navList = document.querySelector('.nav-list');
  if(toggle && navList){
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      navList.style.display = expanded ? 'none' : 'flex';
    });
  }

  // top-padding to avoid header overlap
  function adjustTopPadding(){
    const header = document.querySelector('.site-header');
    const main = document.querySelector('main') || document.querySelector('.hero');
    if(header && main){
      const h = header.getBoundingClientRect().height;
      main.style.paddingTop = (h + 20) + 'px';
    }
  }
  window.addEventListener('load', adjustTopPadding);
  window.addEventListener('resize', adjustTopPadding);

  // IntersectionObserver for reveal animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.card, .section-title, .hero-inner').forEach(el => observer.observe(el));

  // back to top control
  const btn = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    if(!btn) return;
    if(window.scrollY > 400) btn.style.display = 'flex';
    else btn.style.display = 'none';
  });
  if(btn){
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
})();
