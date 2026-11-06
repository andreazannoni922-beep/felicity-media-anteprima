(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = matchMedia("(hover: none)").matches;
  const mobile = () => innerWidth <= 820;
  const light = touch || innerWidth <= 820;   // no blur filters here: they are what makes a phone stutter
  const root = document.documentElement;
  const page = document.body.dataset.page;
  window.__fm = window.__fm || {};
  // how much of the arc each section draws (sections name their key in data-fill)
  const G = { intro: 0, dive: 0, nome: .15, arc: .16, foot: .25, form: .2, svc: .2, steps: .25 };
  window.__fm.G = G;

  /* ---------------- which version of "Il nome" (home only) ---------------- */
  const params = new URLSearchParams(location.search);
  const pick = (params.get("nome") || "a").toLowerCase();
  const variant = ["a", "b", "c"].includes(pick) ? pick : "a";
  if (page === "home") {
    $$(".nome").forEach(s => {
      const on = s.dataset.variant === variant;
      s.hidden = !on;
      s.id = on ? "nome" : "nome-" + s.dataset.variant;
    });
    if (params.has("nome")) {
      $("#vswitch").classList.add("is-on");
      $$("#vswitch a").forEach(a => a.setAttribute("aria-current", String(a.textContent.toLowerCase() === variant)));
    }
  }

  /* ---------------- current page in the menu ---------------- */
  $$("[data-nav]").forEach(a => { if (a.dataset.nav === page) a.setAttribute("aria-current", "page"); });

  /* ---------------- faces: loader, curtain, menu and the travelling logo ---------------- */
  const tpl = $("#tpl-face");
  let faceN = 0;
  const faces = {};
  $$("[data-face]").forEach(host => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    const id = "fm" + (faceN++);
    if (host.dataset.face === "loader" || host.dataset.face === "mascot") $$(".face__eye", node).forEach(e => e.style.opacity = 0);   // never flash before the arc
    node.querySelector("mask").id = id;
    node.querySelector(".face__arc").setAttribute("mask", `url(#${id})`);
    host.appendChild(node);
    if (host.dataset.face === "mascot") {
      const ghost = tpl.content.firstElementChild.cloneNode(true);
      ghost.classList.add("face--ghost");
      ghost.querySelector("defs").remove(); ghost.querySelector(".face__arc").removeAttribute("mask");
      host.prepend(ghost);
    }
    faces[host.dataset.face] = {
      svg: node, draw: node.querySelector(".face__draw"), eyes: $$(".face__eye", node),
      fill(p) {
        const v = `${(clamp(p, 0, 1) * .75 + (p >= 1 ? .25 : 0)).toFixed(4)} 1`;
        if (v === this.v) return;
        this.v = v; this.draw.setAttribute("stroke-dasharray", v);
        // a full arc needs no mask: masks are slow to paint on phones
        const full = p >= 1, arc = this.svg.querySelector(".face__arc");
        if (full !== this.full) { this.full = full; if (full) arc.removeAttribute("mask"); else arc.setAttribute("mask", `url(#${id})`); }
      },
      eyesOn(o) { this.eyes.forEach(e => e.style.opacity = o); }
    };
  });

  /* split words for the blur reveal */
  $$(".blur").forEach(p => {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.append(part);
            else { const s = document.createElement("span"); s.className = "w"; s.textContent = part; frag.append(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(p);
  });

  /* ---------------- cursor ---------------- */
  const cursor = $("#cursor");
  addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;
    cursor.classList.add("is-on"); cursor.style.left = e.clientX + "px"; cursor.style.top = e.clientY + "px";
  }, { passive: true });
  document.addEventListener("mouseover", e => cursor.classList.toggle("is-link", !!e.target.closest("a,button,input,textarea,label")));
  document.addEventListener("mouseleave", () => cursor.classList.remove("is-on"));

  /* ---------------- clients ---------------- */
  const CLIENTI = [
    ["comune-di-modena", "Comune di Modena"], ["lapam-confartigianato", "Lapam Confartigianato"], ["fipav-modena", "FIPAV Modena"],
    ["csi-modena", "CSI Modena"], ["more-impresa-festival", "MoRe Impresa Festival"], ["borghetto", "Il Borghetto"],
    ["il-bello-del-pane", "Il Bello del Pane"], ["tim-telepoint", "TIM Telepoint"], ["lorenzo-gelato-e-dessert", "Lorenzo Gelato e Dessert"],
    ["piazza-grande-42", "Piazza Grande 42"]
  ];
  const ALL = ["alceste", "alice-acconciature", "anderlini", "borghetto", "comune-di-modena", "csi-modena", "fipav-modena", "fruit24", "giemme-serramenti", "gruppo-atomix", "iconikon", "il-bello-del-pane", "in-out", "italia-mon-amour", "lampade-relight", "lapam-confartigianato", "longeviness", "lorenzo-gelato-e-dessert", "mercatino-di-beba", "moda-mercato-store", "more-impresa-festival", "piada-mania", "piazza-grande-42", "pollicino", "sottosopra", "tim-telepoint"];
  const col = $("#clientiCol");
  if (col) CLIENTI.forEach(([f, n]) => { const d = document.createElement("div"); d.className = "ccard"; d.innerHTML = `<img src="assets/clienti/${f}.png" alt="${n}">`; col.appendChild(d); });
  // every logo gets the same visual weight and stays well inside the round hole of the face:
  // same area whatever its proportions, and its diagonal never longer than 80% of the hole
  $$(".ccard img").forEach(img => {
    const fit = () => {
      const ar = img.naturalWidth / img.naturalHeight, area = .46 * .46, maxDiag = .8;
      let h = Math.sqrt(area / ar), w = h * ar;
      const k = Math.min(1, maxDiag / Math.hypot(w, h)); w *= k; h *= k;
      img.style.width = (w * 100).toFixed(2) + "%"; img.style.height = (h * 100).toFixed(2) + "%";
    };
    img.complete && img.naturalWidth ? fit() : img.addEventListener("load", fit, { once: true });
  });
  const mq = $("#mq1");
  if (mq) {
    const one = dup => ALL.map(f => `<div class="mlogo"${dup ? ' aria-hidden="true"' : ""}><img src="assets/clienti/${f}.png" alt="" loading="lazy"></div><i class="mq__px"></i>`).join("");
    mq.innerHTML = one(false) + one(true);
    // same visual mass for every logo: equal area, whatever the proportions
    $$(".mlogo img").forEach(img => {
      const fit = () => {
        const ar = img.naturalWidth / img.naturalHeight, A = mobile() ? 2600 : 4200, H = mobile() ? 48 : 64;
        let h = Math.sqrt(A / ar), w = h * ar;
        if (h > H) { h = H; w = h * ar; } if (w > 2.6 * H) { w = 2.6 * H; h = w / ar; }
        img.style.width = w.toFixed(0) + "px"; img.style.height = h.toFixed(0) + "px";
      };
      img.complete && img.naturalWidth ? fit() : img.addEventListener("load", fit, { once: true });
    });
  }

  /* ---------------- swipe rows with arrows (mobile: never driven by the vertical scroll) ---------------- */
  // Each .snav[data-for] follows a horizontal scroller moved only by the finger: native swipe and snap.
  function swipeRow(nav, onMove) {
    const view = document.getElementById(nav.dataset.for);
    const num = $("[data-n]", nav);
    const hint = $("[data-hint]", nav);
    const items = () => [...view.querySelectorAll(":scope > * > :not(.is-dup):not(.mq__px)")];
    const stepW = () => { const it = items(); return it.length > 1 ? it[1].offsetLeft - it[0].offsetLeft : view.clientWidth * .8; };
    const update = () => {
      const max = view.scrollWidth - view.clientWidth;
      const p = max > 0 ? view.scrollLeft / max : 0;
      if (num) num.textContent = Math.round(view.scrollLeft / stepW()) + 1;
      if (hint && view.scrollLeft > 8) hint.classList.add("is-off");
      onMove && onMove(p, view.scrollLeft / stepW());
    };
    view.addEventListener("scroll", update, { passive: true });
    // with a mouse on a narrow window the row is dragged; a finger or a trackpad use the native scroll
    let drag = null;
    view.addEventListener("pointerdown", e => { if (e.pointerType === "mouse" && mobile()) { drag = { x: e.clientX, left: view.scrollLeft }; view.classList.add("is-dragging"); view.setPointerCapture(e.pointerId); } });
    view.addEventListener("pointermove", e => { if (drag) view.scrollLeft = drag.left - (e.clientX - drag.x); });
    const endDrag = () => {
      if (!drag) return;
      const moved = view.scrollLeft - drag.left, w = stepW(), last = items().length - 1;
      const from = Math.round(drag.left / w), to = Math.abs(moved) > w * .12 ? from + Math.sign(moved) : from;
      drag = null;
      view.scrollTo({ left: clamp(to, 0, last) * w, behavior: reduce ? "auto" : "smooth" });
      setTimeout(() => view.classList.remove("is-dragging"), 450);   // snapping comes back once the row has landed
    };
    view.addEventListener("pointerup", endDrag);
    view.addEventListener("pointercancel", endDrag);
    addEventListener("resize", update);
    update();
    return update;
  }

  if (!window.gsap) {
    $("#loader").remove(); $("#curtain").remove();
    Object.values(faces).forEach(f => { f.fill(1); f.eyesOn(1); });
    $$(".blur .w").forEach(w => w.classList.add("on"));
    $$(".ccard").forEach(c => c.classList.add("is-on"));
    $$(".ch").forEach(c => { c.style.opacity = 1; c.style.visibility = "visible"; c.style.position = "relative"; });
    $$(".stp").forEach(c => { c.style.opacity = 1; c.style.position = "relative"; });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  const lenis = window.Lenis && !reduce && !touch ? new Lenis({ lerp: .1, smoothWheel: true }) : null;   // phones keep their native scroll
  window.__fm.lenis = lenis;
  if (lenis) { lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
  const scrollTo = (target, opts = {}) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4), ...opts });
    else if (typeof target === "number") window.scrollTo({ top: target, behavior: reduce || opts.immediate ? "auto" : "smooth" });
    else target.scrollIntoView({ behavior: reduce || opts.immediate ? "auto" : "smooth" });
  };

  /* ---------------- links: same page glides, another page goes behind the curtain ---------------- */
  const curtain = $("#curtain"), cf = faces.curtain;
  const here = location.pathname.replace(/index\.html$/, "").replace(/\.html$/, "");
  document.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    const there = url.pathname.replace(/index\.html$/, "").replace(/\.html$/, "");
    if (there === here && url.search === location.search) {
      e.preventDefault(); closeMenu();
      if (!url.hash || url.hash === "#top") { scrollTo(0); return; }
      const t = $(url.hash);
      if (t) { scrollTo(t, { offset: 0 }); if (t.id === "main") t.focus({ preventScroll: true }); }
      return;
    }
    e.preventDefault();
    leaveTo(url.href);
  });
  let leaving = false, leaveTl = null;
  function leaveTo(href) {
    if (leaving) return; leaving = true;
    if (reduce) { location.href = href; return; }
    cf.fill(0); cf.eyesOn(0);
    curtain.classList.add("is-on");
    leaveTl = gsap.timeline({ onComplete: () => { location.href = href; } })
      .fromTo(curtain, { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", duration: .7, ease: "expo.inOut" })
      .to({ p: 0 }, { p: 1, duration: .45, ease: "power2.inOut", onUpdate() { cf.fill(this.targets()[0].p); } }, "-=.3");
  }
  addEventListener("pageshow", e => {
    if (!e.persisted) return;
    // back from the browser's memory: the page is simply there, no curtain and no menu closing
    root.classList.add("no-anim");
    if (leaveTl) { leaveTl.kill(); leaveTl = null; }
    leaving = false; gsap.killTweensOf(curtain); curtain.classList.remove("is-on"); gsap.set(curtain, { clipPath: "inset(0 0 100% 0)" });
    closeMenu();
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("no-anim")));
  });

  /* ---------------- the travelling logo ---------------- */
  // It sits on an anchor in each section (or parks in a corner), keeps its original tilt,
  // and only ever changes size, place, colour, opacity and how much of the arc is drawn.
  // Once it has arrived it is moved INSIDE its anchor, so it scrolls with the page natively:
  // on a phone a fixed element chased from JS always trembles behind the finger.
  // It only goes back to a fixed layer to fly between two anchors, and in the home hero.
  const mascot = $("#mascot"), mf = faces.mascot, mascotNext = mascot.nextSibling;
  const sections = $$("[data-gl]"), withLogo = $$("[data-with-logo]");
  const M = { x: innerWidth * .74, y: innerHeight * .47, w: 0, o: 0, s: 1 };
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let curKey, curBg = null, mFill = 0, mEyes = -1, tr = null, docked = null, vel = 0, velY = scrollY, keep = null, resizing = false;
  const painted = {};
  const put = (prop, v) => { if (painted[prop] !== v) { painted[prop] = v; mascot.style[prop] = v; } };
  function activeSection() {
    const mid = innerHeight * .5;
    for (const s of sections) { if (s.hidden) continue; const r = s.getBoundingClientRect(); if (r.height && r.top <= mid && r.bottom >= mid) return s; }
    return null;
  }
  function anchorOf(sec) {
    const mode = sec ? sec.dataset.gl : "none";
    if (mode.startsWith("anchor:")) { const h = $(mode.slice(7), sec); if (h && h.getBoundingClientRect().width > 0) return h; }
    if (mode === "park" && innerWidth >= 820) return "park";
    return null;
  }
  function rectOf(a) {
    if (a === "park") return { x: innerWidth - 84, y: innerHeight - 84, w: 300 };
    const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
  }
  const canDock = a => a && a !== "park" && !a.closest("#hero");
  function dock(a) {
    if (docked === a) return;
    a.appendChild(mascot); mascot.classList.add("is-docked"); docked = a;
    put("width", ""); put("transform", "");
  }
  function undock() {
    if (!docked) return;
    const r = mascot.getBoundingClientRect();
    M.x = r.left + r.width / 2; M.y = r.top + r.height / 2; M.w = r.width;
    document.body.insertBefore(mascot, mascotNext); mascot.classList.remove("is-docked"); docked = null;
  }
  // while it fades out away from a fixed place it stays on the anchor it is leaving
  function follow(a) { if (!docked && a && (a === "park" || a.isConnected) && !(a.closest && a.closest("#hero"))) { const r = rectOf(a); if (r.w > 0) { M.x = r.x; M.y = r.y; M.w = r.w; } } }
  function fillOf(sec) { const k = sec && sec.dataset.fill; return k ? clamp(G[k] ?? 1, 0, 1) : 1; }
  const widthCap = touch ? 800 : 3000;   // past this it grows by scale only: no repaint of a huge SVG at every frame
  function paint() {
    if (docked) put("transform", M.s < .999 ? `scale(${M.s.toFixed(3)})` : "");
    else {
      const full = M.w * M.s, w = Math.min(full, widthCap), sc = full / Math.max(w, .001);
      put("width", w.toFixed(1) + "px");
      put("transform", `translate(${(M.x - full / 2).toFixed(1)}px,${(M.y - full / 2).toFixed(1)}px) scale(${sc.toFixed(4)})`);
    }
    put("opacity", M.o.toFixed(3));
    put("visibility", M.o < .01 || (!docked && M.w < 2) ? "hidden" : "visible");
  }
  function setGround(bg) {
    if (bg === curBg) return;
    curBg = bg; mascot.style.color = bg === "ink" ? "var(--paper)" : "var(--ink)";
  }
  gsap.ticker.add((time, dtMs) => {
    const dt = Math.min(dtMs / 1000, 1 / 20), now = performance.now() / 1000;
    const sec = activeSection();
    vel = lerp(vel, Math.abs(scrollY - velY) / Math.max(dt, .001), .35); velY = scrollY;
    if (sec && !resizing) { const r = sec.getBoundingClientRect(); keep = { s: sec, rel: (innerHeight * .5 - r.top) / r.height }; }
    const anchor = anchorOf(sec), bg = sec ? sec.dataset.bg : "paper";
    let t = anchor && docked !== anchor ? rectOf(anchor) : null;
    const fill = fillOf(sec);
    // home hero: the camera goes into the black of the arc, the logo keeps its tilt
    if (sec && sec.id === "hero" && t && G.dive >= .015) {
      const d = G.dive, s = 1 + 15 * Math.pow(smooth(.04, 1, d), 3), c = smooth(0, .35, d);
      const ox = lerp(t.x - .15 * t.w, innerWidth / 2, c), oy = lerp(t.y + .02 * t.w, innerHeight / 2, c);
      const w = t.w * s;
      t = { x: ox + .15 * w, y: oy - .02 * w, w };
    }
    if (curKey === undefined) { curKey = anchor; if (t) Object.assign(M, t); setGround(bg); }
    // a new anchor: decide how to get there
    if (anchor !== curKey) {
      const prev = curKey, el = prev && prev.closest ? prev : null;
      let prevOn = false;
      if (prev && M.o > .05) { const r = rectOf(prev); prevOn = r.y + r.w / 2 > 0 && r.y - r.w / 2 < innerHeight; }
      const fromHero = !!(el && el.closest("#hero") && G.dive > .5);
      const sameSec = !!(el && anchor && anchor.closest && el.closest("[data-gl]") === sec);
      if (!anchor) tr = prevOn ? { kind: "out", t0: now, o0: M.o, prev } : null;
      else if (fromHero) tr = { kind: "in", t0: now, dur: .3 };                               // out of the black: appear in place
      else if (sameSec && sec.dataset.move === "fade") tr = { kind: "in", t0: now, dur: .22 };  // big blocks: it passes to the next title
      else if (sameSec && prevOn && fill >= mFill - .08) {
        // rows: it walks to the next one; scrolling fast it simply lands there, it never trails behind
        if (vel > 150 || (tr && tr.kind === "fly")) tr = null;
        else { undock(); tr = { kind: "fly", t0: now, from: { x: M.x, y: M.y, w: M.w }, o0: M.o }; }
      }
      else tr = { kind: prevOn ? "swap" : "in", t0: now, o0: M.o, prev, dur: .28 };           // another section: fade, then appear there
      curKey = anchor;
      if (anchor && !t) t = rectOf(anchor);
    }
    if (tr) {
      const e = now - tr.t0;
      if (tr.kind === "fly") {
        if (!t) t = rectOf(anchor);
        const p = easeIO(clamp(e / .35, 0, 1));
        M.x = lerp(tr.from.x, t.x, p); M.y = lerp(tr.from.y, t.y, p); M.w = lerp(tr.from.w, t.w, p);
        M.o = lerp(tr.o0, 1, p); M.s = 1; setGround(bg);
        if (p >= 1) tr = null;
      } else if (tr.kind === "out") {
        follow(tr.prev);
        M.o = tr.o0 * (1 - smooth(0, .2, e)); M.s = 1 - .04 * smooth(0, .2, e);
        if (e >= .2) { tr = null; undock(); }
      } else {
        // swap: fade out where it is, then appear at the new anchor; in: just appear
        const outT = tr.kind === "swap" ? .12 : 0;
        if (e < outT) { follow(tr.prev); M.o = tr.o0 * (1 - e / outT); }
        else {
          if (!tr.jumped) {
            tr.jumped = true; setGround(bg); mFill = fill; mf.fill(fill);
            if (canDock(anchor)) dock(anchor); else undock();
          }
          const p = smooth(0, tr.dur, e - outT);
          if (!docked && (t || anchor)) { const q = t || rectOf(anchor); M.x = q.x; M.y = q.y; M.w = q.w; }
          M.o = p; M.s = .96 + .04 * easeIO(p);
          if (p >= 1) tr = null;
        }
      }
    } else if (anchor) {
      if (canDock(anchor)) dock(anchor);
      else if (t) { undock(); M.x = t.x; M.y = t.y; M.w = t.w; }
      M.o = 1; M.s = 1; setGround(bg);
    } else { undock(); M.o = 0; }
    paint();
    // things that live inside the logo (the clients) are only there when the logo is
    const settled = !(tr && tr.kind === "swap" && !tr.jumped);
    withLogo.forEach(el => { const on = settled && curKey && curKey.closest && el.closest("section") === curKey.closest("section"); el.style.opacity = on ? M.o.toFixed(3) : "0"; });
    // how much of the arc is drawn: it follows smoothly; it only goes back while hidden, in a swap
    if (!tr || tr.kind !== "swap" || tr.jumped) mFill = lerp(mFill, fill, 1 - Math.pow(.004, dt));
    mf.fill(Math.abs(mFill - fill) < .002 ? fill : mFill);
    mascot.classList.toggle("is-filling", fill < .999 || mFill < .995);
    const eyes = fill >= .985 && mFill >= .985 ? 1 : 0;
    if (eyes !== mEyes) { mEyes = eyes; mf.eyesOn(eyes); }
  });

  /* ---------------- scenes ---------------- */
  function buildScenes() {
    const mm = gsap.matchMedia();

    /* HOME HERO: into the black of the arc */
    if ($("#hero")) {
      gsap.timeline({
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom bottom", scrub: true, onUpdate: s => { G.dive = s.progress; } }
      })
        .to(".hero__copy", { y: -60, autoAlpha: 0, ease: "power2.in", duration: .3 }, 0)
        .to(".hero__title .ln > span", { yPercent: -40, autoAlpha: 0, stagger: .04, ease: "power2.in", duration: .3 }, .02)
        .to(".hero__corner", { autoAlpha: 0, duration: .2 }, 0)
        .to("#heroInk", { opacity: 1, duration: .12, ease: "none" }, .42)
        .fromTo("#heroQ", light ? { opacity: 0 } : { opacity: 0, filter: "blur(10px)" }, light ? { opacity: 1, duration: .16, ease: "power2.out" } : { opacity: 1, filter: "blur(0px)", duration: .16, ease: "power2.out" }, .5)
        .to({}, { duration: .05 });
    }

    /* PAGE HERO: the title leaves, the logo shrinks towards the next section */
    if ($(".phero")) {
      gsap.timeline({ scrollTrigger: { trigger: ".phero", start: "top top", end: "bottom top", scrub: true } })
        .to(".phero__title .ln > span", { yPercent: -30, autoAlpha: 0, ease: "power2.in", duration: .5 }, .1)
        .to(".phero__sub, .phero__index", { y: -40, autoAlpha: 0, ease: "power2.in", duration: .4 }, 0)
        .to(".phero__face", { scale: .5, yPercent: -30, ease: "power1.in", duration: 1 }, 0);
    }

    /* IL NOME */
    if (page === "home") { if (variant === "a") sceneA(); else if (variant === "b") sceneB(); else sceneC($("#nome")); }
    else if ($(".nomeC")) sceneC($(".nomeC"));

    /* HOME SERVIZI: the row in the middle of the screen lights up, the pointer can take over */
    walkRows($$(".srv__row"));
    $$(".srv__word span").forEach(s => gsap.from(s, { yPercent: 105, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: s, start: "top 92%" } }));

    /* words out of the blur, tied to the scroll */
    $$(".blur").forEach(p => {
      if (p.closest(".nomeA")) return;
      const words = $$(".w", p), last = !!p.closest(".ftr");   // the last sentence must be whole before the page ends
      ScrollTrigger.create({
        trigger: p, start: last ? "top 92%" : "top 88%", end: last ? "top 40%" : "top 42%", scrub: true,
        onUpdate: s => { const n = Math.ceil(s.progress * words.length * 1.1); if (n === p._n) return; p._n = n; words.forEach((w, i) => w.classList.toggle("on", i < n)); }
      });
    });

    /* HOME METODO: desktop slides with the scroll; on a phone it is a row you swipe */
    const track = $("#metodoTrack");
    if (track) {
      const nav = $(".metodo__nav");
      mm.add("(min-width: 821px)", () => {
        const st = ScrollTrigger.create({
          trigger: "#metodo", start: "top top", end: "bottom bottom", scrub: true, invalidateOnRefresh: true,
          onUpdate: s => {
            const p = smooth(.04, .86, s.progress);
            const steps = track.children, stepW = steps.length > 1 ? steps[1].offsetLeft - steps[0].offsetLeft : 0;
            const raw = p * (steps.length - 1), base = Math.floor(raw);
            const idx = Math.min(steps.length - 1, base + smooth(.25, .75, raw - base));   // each step rests in the same place
            gsap.set(track, { x: -stepW * idx });
            gsap.set("#metodoBar", { scaleX: p });
            G.arc = .16 + .84 * smooth(.04, .9, s.progress);
          }
        });
        return () => { st.kill(); gsap.set(track, { clearProps: "transform" }); };
      });
      swipeRow(nav, p => {
        if (!mobile()) return;
        G.arc = .16 + .84 * p;
        gsap.set("#metodoBar", { scaleX: .08 + .92 * p });
      });
    }

    /* HOME CLIENTI: one logo at a time inside the face */
    const cards = $$(".ccard"), nameEl = $("#clientiName");
    if (cards.length) {
      let current = 0;
      cards[0].classList.add("is-on");
      const win = $(".clienti__win");
      gsap.set(col, { y: win.clientHeight / 2 - cards[0].offsetHeight / 2 });
      ScrollTrigger.create({
        trigger: "#clienti", start: "top top", end: "bottom bottom", scrub: true, invalidateOnRefresh: true,
        onUpdate: s => {
          const step = cards[1].offsetTop - cards[0].offsetTop;
          const c0 = win.clientHeight / 2 - cards[0].offsetHeight / 2;
          const raw = s.progress * (cards.length - 1), base = Math.floor(raw);
          const idx = Math.min(cards.length - 1, base + smooth(.3, .7, raw - base));
          gsap.set(col, { y: c0 - idx * step });
          const k = Math.round(raw);
          if (k !== current) {
            current = k; cards.forEach((c, i) => c.classList.toggle("is-on", i === k));
            nameEl.textContent = CLIENTI[k][1];
            gsap.fromTo(nameEl, { yPercent: 40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: .5, ease: "expo.out", overwrite: true });
          }
        }
      });
    }
    /* SERVIZI PAGE: every area draws a fifth of the logo */
    const svcs = $$(".svc");
    if (svcs.length) {
      svcs.forEach((sv, i) => {
        ScrollTrigger.create({
          trigger: sv, start: "top 40%", end: "bottom 40%",
          onToggle: s => { if (s.isActive) svcs.forEach(o => o.classList.toggle("is-current", o === sv)); },
          onUpdate: s => { G.svc = clamp((i + .25 + .75 * s.progress) / svcs.length, .1, 1); }
        });
        gsap.from($(".svc__word", sv), { yPercent: 40, autoAlpha: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: sv, start: "top 80%" } });
        const lis = $$(".svc__list li", sv);
        ScrollTrigger.create({
          trigger: $(".svc__list", sv), start: "top 85%", end: "top 40%", scrub: true,
          onUpdate: s => lis.forEach((li, j) => li.classList.toggle("on", s.progress * lis.length * 1.15 > j))
        });
      });
    }

    /* METODO PAGE: four steps, the arc fills a quarter at a time */
    const stps = $$(".stp");
    if (stps.length) {
      const n = stps.length, bar = $("#stepsBar");
      ScrollTrigger.create({
        trigger: ".steps", start: "top top", end: "bottom bottom", scrub: true,
        onUpdate: s => {
          const p = s.progress * n;
          stps.forEach((c, i) => {
            const local = p - i;
            const op = (i === 0 ? 1 : smooth(-.02, .16, local)) * (i === n - 1 ? 1 : 1 - smooth(.84, 1.0, local));
            if (c._op === op) return;
            c._op = op;
            c.style.opacity = op.toFixed(3);
            c.style.visibility = op > .01 ? "visible" : "hidden";
            if (!light) c.style.filter = `blur(${((1 - op) * 8).toFixed(2)}px)`;
            c.style.transform = `translateY(${((1 - op) * (local < .5 ? 40 : -40)).toFixed(1)}px)`;
          });
          gsap.set(bar, { scaleX: s.progress });
          G.steps = .1 + .9 * smooth(0, .9, s.progress);
        }
      });
    }

    /* CHI SIAMO: the team, the logo walks down the names; the years count up */
    walkRows($$(".crew__row"));
    $$("[data-count]").forEach(el => {
      const to = +el.dataset.count, from = 0, o = { v: from };
      el.textContent = from;
      gsap.to(o, { v: to, duration: 1.6, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" }, onUpdate: () => { el.textContent = Math.round(o.v); } });
    });
    if ($(".founder")) gsap.from(".founder__who > *", { y: 30, autoAlpha: 0, duration: 1, ease: "expo.out", stagger: .08, scrollTrigger: { trigger: ".founder", start: "top 75%" } });
    if ($(".crew")) gsap.from(".crew__name", { x: -24, autoAlpha: 0, duration: 1, ease: "expo.out", stagger: .06, scrollTrigger: { trigger: ".crew__list", start: "top 80%" } });

    /* HOME TEAM, CONTATTI, NEXT, CTA */
    if ($(".team")) {
      gsap.from(".team__title", { y: 50, autoAlpha: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".team", start: "top 75%" } });
      gsap.from(".person", { y: 30, autoAlpha: 0, duration: .9, ease: "expo.out", stagger: .06, scrollTrigger: { trigger: ".people", start: "top 80%" } });
    }
    if ($(".contatti") && page !== "contatti") gsap.from(".contatti__title", { yPercent: 30, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".contatti", start: "top 70%" } });
    if ($(".form")) gsap.from(".form > *", { y: 24, opacity: 0, duration: .9, ease: "expo.out", stagger: .05, scrollTrigger: { trigger: ".form", start: "top 92%" } });
    $$(".cta, .next, .info").forEach(el => gsap.from(el.children, { y: 40, opacity: 0, duration: 1.1, ease: "expo.out", stagger: .08, scrollTrigger: { trigger: el, start: "top 80%" } }));
    ScrollTrigger.create({ trigger: "#footer", start: "top 60%", end: "bottom bottom", scrub: true, onUpdate: s => { G.foot = .25 + .75 * smooth(.1, .92, s.progress); } });
  }

  /* rows that light up in the middle of the screen (home services, team) */
  function walkRows(rows) {
    if (!rows.length) return;
    let hovering = false;
    const setActive = row => rows.forEach(o => o.classList.toggle("is-active", o === row));
    rows.forEach(row => {
      ScrollTrigger.create({ trigger: row, start: "top 55%", end: "bottom 55%", onToggle: s => { if (s.isActive && !hovering) setActive(row); } });
      row.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") { hovering = true; setActive(row); } });
      row.addEventListener("pointerleave", () => { hovering = false; });
      row.addEventListener("focusin", () => setActive(row));
    });
  }

  /* A · six chapters, one idea per screen */
  function sceneA() {
    const chs = $$(".nomeA .ch"), n = chs.length;
    const list = $$(".nomeA .ch__list li"), ctx = $$(".nomeA .ch__ctx li");
    const quote = $(".nomeA .ch__quote"), other = $(".nomeA .ch__else");
    const num = $("#aNum"), bar = $("#aBar");
    ScrollTrigger.create({
      trigger: "#nome", start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: s => {
        const p = s.progress * n;
        chs.forEach((c, i) => {
          const local = p - i;                       // 0..1 while this chapter is on screen
          const op = (i === 0 ? 1 : smooth(-.05, .08, local)) * (i === n - 1 ? 1 : 1 - smooth(.92, 1.05, local));
          if (c._op === op) return;
          c._op = op;
          c.style.opacity = op.toFixed(3);
          c.style.visibility = op > .01 ? "visible" : "hidden";
          if (!light) c.style.filter = `blur(${((1 - op) * 8).toFixed(2)}px)`;
          c.style.transform = `translateY(calc(${mobile() ? "0px" : "-50%"} + ${((1 - op) * (local < .5 ? 30 : -30)).toFixed(1)}px))`;
        });
        const k = clamp(Math.floor(p), 0, n - 1);
        num.textContent = k + 1;
        gsap.set(bar, { scaleX: s.progress });
        // chapter 3: the three conditions one after another
        list.forEach((li, i) => li.classList.toggle("on", p - 2 > .22 + i * .2));
        // chapter 4: the conditions come true, the sentence works; then the same words out of context
        const e = p - 3;
        ctx.forEach((li, i) => li.classList.toggle("on", e > .1 + i * .1 && e < .62));
        quote.classList.toggle("is-dim", e < .4);
        quote.classList.toggle("is-void", e >= .62);
        other.classList.toggle("on", e >= .62);
        G.nome = .15 + .85 * smooth(0, .93, s.progress);
      }
    });
  }

  /* B · the story flows, the sentence takes the stage */
  function sceneB() {
    const lines = $$("#bLines p"), quote = $("#bQuote");
    ScrollTrigger.create({
      trigger: "#bPin", start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: s => {
        const p = s.progress * 6;
        lines.forEach((l, i) => l.classList.toggle("on", p > .5 + i * (i < 4 ? 1 : 1.2)));
        quote.classList.toggle("is-on", p > 4 && p < 5.3);
        quote.classList.toggle("is-void", p >= 5.3);
      }
    });
    ScrollTrigger.create({ trigger: "#nome", start: "top 60%", end: "bottom bottom", scrub: true, onUpdate: s => { G.nome = .15 + .85 * s.progress; } });
  }

  /* C · a dictionary entry, the logo fills while you read */
  function sceneC(sec) {
    $$(".entry", sec).forEach(en => gsap.from(en, { y: 40, autoAlpha: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: en, start: "top 85%" } }));
    gsap.from($(".nomeC__word", sec), { yPercent: 30, autoAlpha: 0, ...(light ? {} : { filter: "blur(10px)" }), duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: sec, start: "top 70%" } });
    ScrollTrigger.create({ trigger: sec, start: "top 40%", end: "bottom 80%", scrub: true, onUpdate: s => { G.nome = .15 + .85 * s.progress; } });
  }

  function holdScroll(on) { root.classList.toggle("no-scroll", on); if (lenis) on ? lenis.stop() : lenis.start(); }

  /* ---------------- menu ---------------- */
  const menuBtn = $("#menuBtn"), menuLabel = $("#menuLabel");
  let menuOpen = false;
  // the header takes the menu's colours only when the panel is actually behind it
  let hdrOnMenu = false, hdrT = 0;
  const setHdrOnMenu = on => { clearTimeout(hdrT); hdrT = setTimeout(() => { hdrOnMenu = on; document.body.classList.toggle("hdr-on-menu", on); hdrGround(); }, root.classList.contains("no-anim") ? 0 : on ? 240 : 530); };
  const pageParts = () => [$("#main"), $("#footer")];
  function openMenu() { menuOpen = true; document.body.classList.add("menu-open"); menuBtn.setAttribute("aria-expanded", "true"); menuLabel.textContent = "Chiudi"; holdScroll(true); pageParts().forEach(el => el.inert = true); setHdrOnMenu(true); }
  function closeMenu() { if (!menuOpen) return; menuOpen = false; document.body.classList.remove("menu-open"); menuBtn.setAttribute("aria-expanded", "false"); menuLabel.textContent = "Menu"; holdScroll(false); pageParts().forEach(el => el.inert = false); setHdrOnMenu(false); }
  menuBtn.addEventListener("click", () => menuOpen ? closeMenu() : openMenu());
  addEventListener("keydown", e => { if (e.key === "Escape" && menuOpen) { closeMenu(); menuBtn.focus(); } });
  $("#toTop").addEventListener("click", () => scrollTo(0));

  /* header: hides while reading downward */
  // once you leave the top it gets a solid ground in the colour of the section below it, so it never sits on a big title
  const hdr = $(".hdr"); let lastY = 0, hdrFree = 0;
  const hdrGround = () => {
    const solid = scrollY > 80 && !hdrOnMenu;
    hdr.classList.toggle("is-solid", solid);
    const probe = hdr.offsetHeight / 2;
    const sec = sections.find(s => { if (s.hidden) return false; const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom > probe; });
    let bg = sec ? sec.dataset.bg : "paper";
    if (sec && sec.id === "hero" && G.dive > .45) bg = "ink";
    hdr.dataset.ground = bg;
  };
  addEventListener("scroll", () => {
    const y = scrollY;
    if (performance.now() < hdrFree) hdr.classList.remove("is-hidden");
    else if (!menuOpen && y > 240 && y > lastY + 2) hdr.classList.add("is-hidden");
    else if (y < lastY - 2 || y < 240) hdr.classList.remove("is-hidden");
    if (Math.abs(y - lastY) > 2) lastY = y;   // the last slow pixels of a smooth scroll are not a change of direction
    hdrGround();
  }, { passive: true });

  hdrGround();
  hdr.addEventListener("focusin", () => { hdr.classList.remove("is-hidden"); hdrFree = performance.now() + 400; });   // a focused link is never out of sight

  /* ---------------- form: the logo fills while you write ---------------- */
  const form = $("#form");
  if (form) {
    const checks = [() => $("#f-nome").value.trim().length > 1, () => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($("#f-email").value), () => $("#f-msg").value.trim().length > 4, () => $("#f-privacy").checked];
    const formFill = () => {
      G.form = .2 + .8 * checks.filter(c => c()).length / checks.length;
      // a message goes away as soon as what it asks for is done
      [["f-nome", checks[0]], ["f-email", checks[1]], ["f-msg", checks[2]]].forEach(([id, test]) => { const f = $("#" + id).closest(".field"); if (f.classList.contains("is-error") && test()) { f.classList.remove("is-error"); $(".field__err", f).textContent = ""; } });
      if (checks[3]() && $("#formMsg").textContent.startsWith("Serve")) $("#formMsg").textContent = "";
    };
    form.addEventListener("input", formFill); form.addEventListener("change", formFill);
    form.addEventListener("submit", e => {
      e.preventDefault();
      let ok = true;
      [["f-nome", checks[0], "Scrivi il tuo nome."], ["f-email", checks[1], "Controlla l'indirizzo email."], ["f-msg", checks[2], "Raccontaci qualcosa in più."]].forEach(([id, test, msg]) => {
        const el = $("#" + id), f = el.closest(".field"), err = $(".field__err", f);
        const good = test(); f.classList.toggle("is-error", !good); err.textContent = good ? "" : msg; if (!good && ok) { el.focus(); ok = false; }
      });
      if (ok && !checks[3]()) { ok = false; $("#formMsg").textContent = "Serve il consenso alla privacy."; $("#f-privacy").focus(); }
      if (!ok) return;
      const msg = $("#formMsg"), btn = $("button[type=submit]", form);
      const val = id => $("#" + id).value.trim();
      if (window.FM_FORM) {
        btn.disabled = true; msg.textContent = "Invio…";
        fetch(window.FM_FORM, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: val("f-nome"), email: val("f-email"), telefono: val("f-tel"), messaggio: val("f-msg"), privacy: true, website: form.elements.website.value })
        }).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(d => {
          if (!d.ok) throw 0;
          form.reset(); formFill(); G.form = 1;
          msg.textContent = "Messaggio inviato. Ti rispondiamo entro 24 ore.";
        }).catch(() => {
          msg.innerHTML = 'Non è partito. Scrivici a <a href="mailto:info@felicitymedia.it">info@felicitymedia.it</a>.';
        }).finally(() => { btn.disabled = false; });
        return;
      }
      // no mail server here: the visitor's own mail app opens with the message ready to send
      const subject = "Richiesta dal sito · " + val("f-nome");
      const body = [val("f-msg"), "", val("f-nome"), val("f-email"), val("f-tel")].filter((l, n) => n < 2 || l).join("\n");
      location.href = `mailto:info@felicitymedia.it?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      msg.textContent = "Si apre la tua email con il messaggio pronto: premi invio per spedirlo.";
    });
  }

  /* ---------------- boot ---------------- */
  const first = !root.classList.contains("seen");
  try { sessionStorage.setItem("fm-seen", "1"); } catch (e) {}
  const lf = faces.loader;
  lf.fill(0); lf.eyesOn(0); faces.menu.fill(1); mf.fill(0); mf.eyesOn(0);
  cf.fill(1); cf.eyesOn(1);
  holdScroll(true);
  const fontsReady = Promise.all([document.fonts.load('300 100px "Funnel Display"'), document.fonts.ready]).catch(() => {});
  const goToHash = () => {
    const t = location.hash && location.hash.length > 1 && $(location.hash);
    if (!t) return;
    holdScroll(false); hdrFree = performance.now() + 500;
    const y = () => Math.round(t.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(t).scrollMarginTop) || 0));
    const go = () => { if (lenis) lenis.scrollTo(y(), { immediate: true, force: true }); else window.scrollTo(0, y()); lastY = scrollY; };
    go();
    // the phone can still restore its old position or change the layout: check again once things are settled
    requestAnimationFrame(() => requestAnimationFrame(go));
    addEventListener("load", go, { once: true });
  };

  // what each page does when it is revealed
  function intro(tl, at) {
    tl.to(G, { intro: 1, duration: reduce ? 0 : 1.3, ease: "power3.inOut" }, at);
    const lines = $$(".hero__title .ln > span, .phero__title .ln > span, .contatti--page .contatti__title .ln > span");
    if (lines.length) tl.from(lines, { yPercent: 105, duration: 1.2, stagger: .08, ease: "expo.out" }, at);
    const soft = $$(".hero__copy > *, .phero__sub, .phero__index, .contatti--page .contatti__lead, .legal > *");
    if (soft.length) tl.from(soft, { y: 24, autoAlpha: 0, duration: 1, stagger: .08, ease: "expo.out" }, `${at}+=.2`);
    tl.from(".hdr", { autoAlpha: 0, duration: .8 }, at);
  }

  if (first && page === "home") {
    gsap.set(curtain, { clipPath: "inset(100% 0 0 0)" });   // not needed now, but it comes down when leaving
    const minWait = new Promise(r => setTimeout(r, reduce ? 0 : 1300));
    gsap.to({ p: 0 }, { p: 1, duration: reduce ? 0 : 1.1, ease: "power3.inOut", onUpdate() { lf.fill(this.targets()[0].p); }, onComplete() { lf.eyesOn(1); } });
    gsap.to("#loaderWord", { opacity: 1, duration: .8, delay: .5, ease: "power2.out" });
    Promise.all([fontsReady, minWait]).then(() => {
      buildScenes();
      const tl = gsap.timeline({ onComplete: () => { $("#loader").remove(); holdScroll(false); ScrollTrigger.refresh(); goToHash(); } })
        .to("#loader", { clipPath: "inset(0 0 100% 0)", duration: reduce ? 0 : 1, ease: "expo.inOut" })
        .call(() => holdScroll(false), null, reduce ? 0 : .7);   // the wheel answers as soon as the page shows
      intro(tl, "-=.7");
    });
  } else {
    $("#loader").remove();
    // arriving from another page: the curtain is already down, it lifts
    curtain.classList.add("is-on");
    fontsReady.then(() => {
      buildScenes();
      ScrollTrigger.refresh();
      goToHash();
      const tl = gsap.timeline({ onComplete: () => { curtain.classList.remove("is-on"); holdScroll(false); } })
        .fromTo(curtain, { clipPath: "inset(0 0 0% 0)" }, { clipPath: "inset(0 0 100% 0)", duration: reduce ? 0 : .9, ease: "expo.inOut" })
        .call(() => holdScroll(false), null, reduce ? 0 : .6);
      // reloaded further down the page, or landing on a section: nothing to draw again
      if (location.hash.length > 1 || scrollY > 40) { gsap.set(G, { intro: 1 }); tl.from(".hdr", { autoAlpha: 0, duration: .6 }, .3); }
      else intro(tl, .25);
    });
  }

  // images and late fonts can change the page height: measure again once everything is in
  addEventListener("load", () => ScrollTrigger.refresh());
  let rt, lastW = innerWidth;
  addEventListener("resize", () => {
    if (touch && innerWidth === lastW) return;   // only the browser bars moved
    lastW = innerWidth;
    resizing = true;
    clearTimeout(rt); rt = setTimeout(() => {
      if (lenis) lenis.resize();   // its scroll limit must be the new one before going back
      ScrollTrigger.refresh();
      // sections are sized on the window: stay at the same point of the same section
      if (keep && keep.s.isConnected && !keep.s.hidden) {
        const r = keep.s.getBoundingClientRect(), y = Math.round(scrollY + r.top + keep.rel * r.height - innerHeight * .5);
        hdrFree = performance.now() + 400;
        if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
        lastY = scrollY;
      }
      resizing = false;
    }, 160);
  });
})();
