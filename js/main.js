const nav = document.getElementById('nav');
let stuck = false, tick = false;
const onScroll = () => {
  if (tick) return; tick = true;
  requestAnimationFrame(() => { const s = scrollY > 40; if (s !== stuck) { stuck = s; nav.classList.toggle('stuck', s); } tick = false; });
};
addEventListener('scroll', onScroll, { passive: true }); onScroll();

const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .08, rootMargin: '0px 0px -5% 0px' });
document.querySelectorAll('.rv').forEach(el => io.observe(el));

document.getElementById('f').addEventListener('submit', e => {
  e.preventDefault();
  if (!e.target.industry.value) { e.target.industry.classList.add('bad'); return e.target.industry.focus(); }
  const d = Object.fromEntries(new FormData(e.target));
  const body = `Name: ${d.name}\nCompany: ${d.company}\nEmail: ${d.email}\nIndustry: ${d.industry}\n\n${d.needs}`;
  location.href = `mailto:hello@arkfrontline.com?subject=${encodeURIComponent('Free Audit Request - ' + d.company)}&body=${encodeURIComponent(body)}`;
  document.getElementById('sent').textContent = 'Thanks! Your email app should open with your request ready to send.';
});

// Two-step audit form
(() => {
  const f = document.getElementById('f'), panes = [...f.querySelectorAll('.fpane')], tabs = [...document.querySelectorAll('#fsteps span')];
  const show = n => { panes.forEach((p, i) => p.classList.toggle('on', i === n)); tabs.forEach((t, i) => { t.classList.toggle('on', i === n); t.classList.toggle('done', i < n); }); };
  document.getElementById('fnext').addEventListener('click', () => {
    let ok = true;
    panes[0].querySelectorAll('input').forEach(i => { const v = i.checkValidity() && i.value.trim(); i.classList.toggle('bad', !v); if (!v && ok) { ok = false; i.focus(); } });
    if (ok) show(1);
  });
  document.getElementById('fback').addEventListener('click', () => show(0));
  f.addEventListener('input', e => e.target.classList.remove('bad'));
})();

// Mobile drawer
(() => {
  const b = document.getElementById('burger'), d = document.getElementById('drawer'), ov = document.getElementById('drawerOv');
  const set = o => {
    d.classList.toggle('open', o); d.setAttribute('aria-hidden', !o); b.setAttribute('aria-expanded', o);
    document.body.classList.toggle('lock', o);
    if (o) { ov.hidden = false; requestAnimationFrame(() => ov.classList.add('show')); }
    else { ov.classList.remove('show'); setTimeout(() => { if (!d.classList.contains('open')) ov.hidden = true; }, 300); }
  };
  b.setAttribute('aria-controls', 'drawer');
  b.addEventListener('click', () => set(!d.classList.contains('open')));
  document.getElementById('drawerX').addEventListener('click', () => set(false));
  ov.addEventListener('click', () => set(false));
  d.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  matchMedia('(min-width:1101px)').addEventListener('change', e => { if (e.matches) set(false); });
})();
// Ambient video: desktop with a pointer only. Phones, reduced-motion and data-saver get the static gradient.
(() => {
  const v = document.getElementById('bgVid'); if (!v) return;
  const ok = matchMedia('(min-width:901px) and (hover:hover)').matches
    && !matchMedia('(prefers-reduced-motion: reduce)').matches
    && !(navigator.connection && navigator.connection.saveData);
  if (!ok) { v.remove(); return; }
  const go = () => { v.addEventListener('canplay', () => v.play().catch(() => {}), { once: true }); v.src = v.dataset.src; v.load(); };
  ('requestIdleCallback' in window) ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 1200);
  document.addEventListener('visibilitychange', () => { document.hidden ? v.pause() : v.play().catch(() => {}); });
})();
