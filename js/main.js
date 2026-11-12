/* ===================================================================
   ARK Frontline — main.js (cleaned + guarded)
   Fixes:
   - Form block guarded (was throwing on index.html, killing every
     IIFE below it → carousel stuck / arrows dead).
   - Two-step form + drawer guarded.
   - Carousel: no more self-fighting snap toggles; re-measures after
     fonts/images settle; logs to console for easy debugging.
   =================================================================== */

/* ---------- 1. nav stuck ---------- */
const nav = document.getElementById("nav");
if (nav) {
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
}

/* ---------- 2. reveal-on-scroll ---------- */
(() => {
  const els = document.querySelectorAll(".rv");
  if (!els.length) return;
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("in"));
    return;
  }
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
  els.forEach((el) => io.observe(el));
})();

/* ---------- 3. contact form (contact.html only) ---------- */
(() => {
  const formEl = document.getElementById("f");
  if (!formEl) return; // ← guard: #f only exists on contact.html

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const ind = e.target.industry;
    if (!ind.value) {
      ind.classList.add("bad");
      ind.focus();
      return;
    }
    const d = Object.fromEntries(new FormData(e.target));
    const body = `Name: ${d.name}\nCompany: ${d.company}\nEmail: ${d.email}\nIndustry: ${d.industry}\n\n${d.needs}`;
    location.href = `mailto:hello@arkfrontline.com?subject=${encodeURIComponent("Free Audit Request - " + d.company)}&body=${encodeURIComponent(body)}`;
    const sent = document.getElementById("sent");
    if (sent)
      sent.textContent =
        "Thanks! Your email app should open with your request ready to send.";
  });

  /* two-step form */
  const panes = [...formEl.querySelectorAll(".fpane")];
  const tabs = [...document.querySelectorAll("#fsteps span")];
  if (!panes.length || !tabs.length) return;

  const show = (n) => {
    panes.forEach((p, i) => p.classList.toggle("on", i === n));
    tabs.forEach((t, i) => {
      t.classList.toggle("on", i === n);
      t.classList.toggle("done", i < n);
    });
  };
  const nextBtn = document.getElementById("fnext");
  const backBtn = document.getElementById("fback");
  if (nextBtn)
    nextBtn.addEventListener("click", () => {
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
  if (backBtn) backBtn.addEventListener("click", () => show(0));
  formEl.addEventListener("input", (e) => e.target.classList.remove("bad"));
})();

/* ---------- 4. mobile drawer ---------- */
(() => {
  const b = document.getElementById("burger");
  const d = document.getElementById("drawer");
  const ov = document.getElementById("drawerOv");
  const x = document.getElementById("drawerX");
  if (!b || !d || !ov || !x) return; // ← guard

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
  x.addEventListener("click", () => set(false));
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

/* ---------- 5. ambient background video ---------- */
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

/* ---------- 6. testimonials carousel ---------- */
(() => {
  const rail = document.getElementById("tstRail");
  const track = rail?.querySelector(".tst-track");
  const prev = document.getElementById("tstPrev");
  const next = document.getElementById("tstNext");

  if (!rail) {
    console.info("[tst] no #tstRail");
    return;
  }
  if (!track) {
    console.info("[tst] no .tst-track");
    return;
  }
  if (track.dataset.init === "1") {
    console.info("[tst] already init");
    return;
  }
  track.dataset.init = "1";

  if (rail.querySelectorAll(".tst-track").length > 1)
    console.warn("[tst] multiple .tst-track — delete the data-dup one in HTML");

  // snap off during auto-scroll; JS toggles it on only while user interacts
  rail.style.scrollSnapType = "none";

  /* clone originals once */
  const originals = [...track.children];
  if (!originals.length) {
    console.warn("[tst] no cards");
    return;
  }
  originals.forEach((card) => {
    const clone = card.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone
      .querySelectorAll("a,button,input,[tabindex]")
      .forEach((el) => el.setAttribute("tabindex", "-1"));
    track.appendChild(clone);
  });
  const cards = [...track.children];
  console.info(
    "[tst] cards:",
    cards.length,
    "(originals:",
    originals.length + ")",
  );

  /* geometry */
  const gap = () => parseFloat(getComputedStyle(track).gap) || 24;
  const setWidth = () => {
    const first = originals[0],
      last = originals[originals.length - 1];
    return last.offsetLeft + last.offsetWidth - first.offsetLeft + gap();
  };

  /* centre-active */
  const markActive = () => {
    const center = rail.scrollLeft + rail.clientWidth / 2;
    let best = cards[0],
      bestD = Infinity;
    for (const c of cards) {
      const mid = c.offsetLeft + c.offsetWidth / 2;
      const d = Math.abs(mid - center);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    cards.forEach((c) => c.classList.toggle("is-active", c === best));
  };

  /* auto-scroll loop */
  const SPEED = 0.6; // px/frame @60fps ≈ 36 px/s
  let pausedUntil = 0,
    lastT = performance.now(),
    raf = 0;

  const tick = (now) => {
    const dt = Math.min(now - lastT, 64);
    lastT = now;
    if (now >= pausedUntil) {
      rail.scrollLeft += (SPEED * dt) / 16.67;
      const w = setWidth();
      if (w > 0 && rail.scrollLeft >= w) rail.scrollLeft -= w; // seamless wrap
      markActive();
    }
    raf = requestAnimationFrame(tick);
  };
  const start = () => {
    lastT = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
  };

  /* pause on interaction */
  const pause = (ms = 3000) => {
    pausedUntil = performance.now() + ms;
    rail.classList.add("tst-user");
    rail.style.scrollSnapType = "x mandatory";
    clearTimeout(pause._t);
    pause._t = setTimeout(() => {
      rail.classList.remove("tst-user");
      rail.style.scrollSnapType = "none";
      lastT = performance.now();
    }, ms);
  };
  rail.addEventListener("mouseenter", () => pause(4000), { passive: true });
  rail.addEventListener("pointerdown", () => pause(5000), { passive: true });
  rail.addEventListener("touchstart", () => pause(5000), { passive: true });
  rail.addEventListener("focusin", () => pause(4000));
  rail.addEventListener("wheel", () => pause(2000), { passive: true });
  rail.addEventListener("scroll", markActive, { passive: true });

  /* arrows */
  const go = (dir) => {
    const w = originals[0].offsetWidth + gap();
    console.info("[tst] arrow", dir > 0 ? "next" : "prev", "by", w, "px");
    rail.scrollBy({ left: dir * w, behavior: "smooth" });
    pause(2500);
  };
  if (prev) prev.addEventListener("click", () => go(-1));
  else console.warn("[tst] #tstPrev not found");
  if (next) next.addEventListener("click", () => go(1));
  else console.warn("[tst] #tstNext not found");

  rail.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  });

  /* reduced motion / tab visibility */
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const applyMotion = () => {
    if (reduce.matches) {
      stop();
      console.info("[tst] reduced-motion → off");
    } else {
      start();
      console.info("[tst] auto-scroll on");
    }
  };
  reduce.addEventListener("change", applyMotion);
  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : applyMotion();
  });

  /* go */
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      markActive();
      applyMotion();
      // re-measure once fonts/images settle, so wrap math is exact
      setTimeout(() => {
        markActive();
      }, 600);
    }),
  );
})();
