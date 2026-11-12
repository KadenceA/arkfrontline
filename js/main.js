const nav = document.getElementById("nav");
let stuck = false,
  tick = false;
const onScroll = () => {
  if (tick) return;
  tick = true;
  requestAnimationFrame(() => {
    const s = scrollY > 40;
    if (s !== stuck) {
      stuck = s;
      nav.classList.toggle("stuck", s);
    }
    tick = false;
  });
};
addEventListener("scroll", onScroll, { passive: true });
onScroll();

const io = new IntersectionObserver(
  (es) =>
    es.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }),
  { threshold: 0.08, rootMargin: "0px 0px -5% 0px" },
);
document.querySelectorAll(".rv").forEach((el) => io.observe(el));

const formEl = document.getElementById("f");
if (formEl) {
  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!e.target.industry.value) {
      e.target.industry.classList.add("bad");
      return e.target.industry.focus();
    }
    const d = Object.fromEntries(new FormData(e.target));
    const body = `Name: ${d.name}\nCompany: ${d.company}\nEmail: ${d.email}\nIndustry: ${d.industry}\n\n${d.needs}`;
    location.href = `mailto:hello@arkfrontline.com?subject=${encodeURIComponent("Free Audit Request - " + d.company)}&body=${encodeURIComponent(body)}`;
    document.getElementById("sent").textContent =
      "Thanks! Your email app should open with your request ready to send.";
  });
}

// Two-step audit form
(() => {
  const f = document.getElementById("f");
   if (!f) return;
    const panes = [...f.querySelectorAll(".fpane")],
    tabs = [...document.querySelectorAll("#fsteps span")];
  const show = (n) => {
    panes.forEach((p, i) => p.classList.toggle("on", i === n));
    tabs.forEach((t, i) => {
      t.classList.toggle("on", i === n);
      t.classList.toggle("done", i < n);
    });
  };
  document.getElementById("fnext").addEventListener("click", () => {
    let ok = true;
    panes[0].querySelectorAll("input").forEach((i) => {
      const v = i.checkValidity() && i.value.trim();
      i.classList.toggle("bad", !v);
      if (!v && ok) {
        ok = false;
        i.focus();
      }
    });
    if (ok) show(1);
  });
  document.getElementById("fback").addEventListener("click", () => show(0));
  f.addEventListener("input", (e) => e.target.classList.remove("bad"));
})();

// Mobile drawer
(() => {
  const b = document.getElementById("burger"),
    d = document.getElementById("drawer"),
    ov = document.getElementById("drawerOv");
  const set = (o) => {
    d.classList.toggle("open", o);
    d.setAttribute("aria-hidden", !o);
    b.setAttribute("aria-expanded", o);
    document.body.classList.toggle("lock", o);
    if (o) {
      ov.hidden = false;
      requestAnimationFrame(() => ov.classList.add("show"));
    } else {
      ov.classList.remove("show");
      setTimeout(() => {
        if (!d.classList.contains("open")) ov.hidden = true;
      }, 300);
    }
  };
  b.setAttribute("aria-controls", "drawer");
  b.addEventListener("click", () => set(!d.classList.contains("open")));
  document
    .getElementById("drawerX")
    .addEventListener("click", () => set(false));
  ov.addEventListener("click", () => set(false));
  d.addEventListener("click", (e) => {
    if (e.target.closest("a")) set(false);
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") set(false);
  });
  matchMedia("(min-width:1101px)").addEventListener("change", (e) => {
    if (e.matches) set(false);
  });
})();
// Ambient video: desktop with a pointer only. Phones, reduced-motion and data-saver get the static gradient.
(() => {
  const v = document.getElementById("bgVid");
  if (!v) return;
  const ok =
    matchMedia("(min-width:901px) and (hover:hover)").matches &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !(navigator.connection && navigator.connection.saveData);
  if (!ok) {
    v.remove();
    return;
  }
  const go = () => {
    v.addEventListener("canplay", () => v.play().catch(() => {}), {
      once: true,
    });
    v.src = v.dataset.src;
    v.load();
  };
  "requestIdleCallback" in window
    ? requestIdleCallback(go, { timeout: 2500 })
    : setTimeout(go, 1200);
  document.addEventListener("visibilitychange", () => {
    document.hidden ? v.pause() : v.play().catch(() => {});
  });
})();


// Testimonials: seamless auto-scroll + center-active + prev/next
(() => {
  const rail = document.getElementById('tstRail');
  const track = rail?.querySelector('.tst-track');
  if (!rail || !track) return;

  // 1. Duplicate the cards once for a seamless loop
  const originals = [...track.children];
  originals.forEach(c => {
    const clone = c.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('a,button,input').forEach(el => el.setAttribute('tabindex', '-1'));
    track.appendChild(clone);
  });

  const cards = [...track.children];
  const prev = document.getElementById('tstPrev');
  const next = document.getElementById('tstNext');

  // 2. Center-active marker
  const setActive = () => {
    const center = rail.scrollLeft + rail.clientWidth / 2;
    let best = null, bestD = Infinity;
    cards.forEach(c => {
      const mid = c.offsetLeft + c.offsetWidth / 2;
      const d = Math.abs(mid - center);
      if (d < bestD) { bestD = d; best = c; }
    });
    cards.forEach(c => c.classList.toggle('is-active', c === best));
  };

  // 3. Geometry: width of one "set" (originals only)
  const setWidth = () => {
    const gap = parseFloat(getComputedStyle(track).gap) || 24;
    const first = originals[0], last = originals[originals.length - 1];
    if (!first || !last) return 0;
    return (last.offsetLeft + last.offsetWidth) - first.offsetLeft + gap;
  };

  // 4. Auto-scroll loop
  const SPEED = 0.4;              // px per frame — tweak: 0.25 slow, 0.7 fast
  let running = true;
  let rafId = null;
  let pausedUntil = 0;

  const tick = () => {
    if (!running) return;
    if (performance.now() < pausedUntil) { rafId = requestAnimationFrame(tick); return; }

    rail.scrollLeft += SPEED;

    // seamless wrap: when we've scrolled past one full set, shift back
    const w = setWidth();
    if (w > 0 && rail.scrollLeft >= w) {
      rail.scrollLeft -= w;
    }

    setActive();
    rafId = requestAnimationFrame(tick);
  };

  const start = () => { if (!rafId) { running = true; rafId = requestAnimationFrame(tick); } };
  const stop  = () => { running = false; if (rafId) { cancelAnimationFrame(rafId); rafId = null; } };

  // 5. Pause on interaction, resume after idle
  const pause = (ms = 2500) => {
    pausedUntil = performance.now() + ms;
    rail.classList.add('tst-user');
    clearTimeout(pause._t);
    pause._t = setTimeout(() => {
      rail.classList.remove('tst-user');
      pausedUntil = 0;
    }, ms);
  };

  rail.addEventListener('mouseenter', () => pause(4000), { passive: true });
  rail.addEventListener('focusin',    () => pause(4000));
  rail.addEventListener('touchstart', () => pause(4000), { passive: true });
  rail.addEventListener('wheel',      () => pause(2000), { passive: true });
  rail.addEventListener('scroll',     () => { setActive(); }, { passive: true });

  // prev/next: scroll one card, then resume
  const step = dir => {
    const gap = parseFloat(getComputedStyle(track).gap) || 24;
    const w = originals[0].offsetWidth + gap;
    rail.scrollBy({ left: dir * w, behavior: 'smooth' });
    pause(2500);
  };
  prev?.addEventListener('click', () => step(-1));
  next?.addEventListener('click', () => step(1));
  rail.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); step(-1); }
  });

  // 6. Respect reduced motion + tab visibility
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const applyMotion = () => {
    if (reduce.matches) { stop(); }
    else { start(); }
  };
  reduce.addEventListener('change', applyMotion);

  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : applyMotion();
  });

  // 7. Initial
  requestAnimationFrame(() => requestAnimationFrame(() => {
    setActive();
    applyMotion();
  }));
})();

// ===== Nav scroll-spy (index only) =====
(() => {
  const links = [...document.querySelectorAll('.links a[href^="#"]')];
  if (!links.length) return;

  // map href="#id" → section element
  const map = new Map();
  links.forEach(a => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) map.set(el, a);
  });
  if (!map.size) return;

  const setActive = id => {
    links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
  };

  // Observe each section; pick the one with the largest visible ratio
  const ratios = new Map();
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0));
    let best = null, bestR = 0;
    ratios.forEach((r, el) => { if (r > bestR) { bestR = r; best = el; } });
    if (best) setActive(best.id);
  }, {
    rootMargin: '-40% 0px -55% 0px',  // active when section crosses the middle band
    threshold: [0, .15, .35, .6, .85, 1]
  });

  map.forEach((_, el) => io.observe(el));

  // Click → instant active (before smooth scroll settles)
  links.forEach(a => {
    a.addEventListener('click', () => {
      const id = a.getAttribute('href').slice(1);
      setActive(id);
    });
  });

  // Clear active when scrolled back to top (hero)
  addEventListener('scroll', () => {
    if (scrollY < 120) links.forEach(a => a.classList.remove('is-active'));
  }, { passive: true });
})();