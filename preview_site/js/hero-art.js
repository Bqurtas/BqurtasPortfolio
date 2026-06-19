/* =====================================================================
   Hero fluid backdrop — a slow, glowing generative canvas behind the name.
   Built for the DARK hero: cool blues/violets + a warm gold spark, additive
   ('lighter') blend so the forms glow on near-black. Pauses off-screen,
   honours prefers-reduced-motion, DPR-capped.
   ===================================================================== */
(function () {
  const hero = document.querySelector('.hero');
  if (!hero || !window.requestAnimationFrame) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-art';
  canvas.setAttribute('aria-hidden', 'true');
  const radial = hero.querySelector('.hero-radial');
  if (radial && radial.nextSibling) hero.insertBefore(canvas, radial.nextSibling);
  else hero.insertBefore(canvas, hero.firstChild);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let W = 0, H = 0, DPR = 1;
  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const r = hero.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  size();
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(size, 150); });

  // glowing fluid forms — deep blue, indigo, violet, teal + a warm gold spark
  const ORBS = [
    { c: [54, 86, 224],  x: 0.42, y: 0.40, r: 0.64, ax: 0.12, ay: 0.09, sx: 0.050, sy: 0.058, px: 0.0, py: 1.4 },
    { c: [120, 72, 214], x: 0.58, y: 0.56, r: 0.56, ax: 0.14, ay: 0.11, sx: 0.043, sy: 0.050, px: 2.0, py: 0.6 },
    { c: [34, 150, 178], x: 0.34, y: 0.64, r: 0.48, ax: 0.13, ay: 0.10, sx: 0.047, sy: 0.044, px: 3.6, py: 2.4 },
    { c: [226, 164, 60], x: 0.66, y: 0.34, r: 0.34, ax: 0.10, ay: 0.12, sx: 0.038, sy: 0.050, px: 1.2, py: 3.1 }
  ];

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    const minWH = Math.min(W, H);
    for (let i = 0; i < ORBS.length; i++) {
      const o = ORBS[i];
      const cx = (o.x + Math.sin(t * o.sx + o.px) * o.ax) * W;
      const cy = (o.y + Math.cos(t * o.sy + o.py) * o.ay) * H;
      const rad = o.r * minWH;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, 'rgba(' + o.c[0] + ',' + o.c[1] + ',' + o.c[2] + ',0.52)');
      g.addColorStop(1, 'rgba(' + o.c[0] + ',' + o.c[1] + ',' + o.c[2] + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  let t = 0, last = 0, running = false, raf = 0;
  function loop(now) { if (!last) last = now; t += Math.min(0.05, (now - last) / 1000); last = now; draw(t); raf = requestAnimationFrame(loop); }
  function play() { if (running || reduce) return; running = true; last = 0; raf = requestAnimationFrame(loop); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); }

  if (reduce) { draw(2.2); return; }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? play() : stop())); }, { threshold: 0.04 }).observe(hero);
  } else { play(); }
})();
