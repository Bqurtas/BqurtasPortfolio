/* =====================================================================
   Hero "abstract moving" backdrop — a slow, generative canvas of soft warm
   forms drifting behind the name. Light/dark aware, pauses off-screen,
   honours prefers-reduced-motion. No video file, tiny CPU.
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

  const isDark = () => document.documentElement.dataset.theme === 'dark';
  // warm, on-brand forms — clay, brass, terracotta, a cool slate for contrast
  const ORBS = [
    { c: [189, 74, 44],  x: 0.28, y: 0.34, r: 0.58, ax: 0.10, ay: 0.07, sx: 0.055, sy: 0.061, px: 0.0, py: 1.7 },
    { c: [156, 123, 70], x: 0.72, y: 0.30, r: 0.52, ax: 0.12, ay: 0.10, sx: 0.047, sy: 0.052, px: 2.1, py: 0.5 },
    { c: [201, 120, 90], x: 0.55, y: 0.72, r: 0.50, ax: 0.13, ay: 0.09, sx: 0.041, sy: 0.049, px: 4.0, py: 2.2 },
    { c: [91, 110, 106], x: 0.24, y: 0.74, r: 0.44, ax: 0.10, ay: 0.12, sx: 0.050, sy: 0.043, px: 1.0, py: 3.3 },
    { c: [156, 123, 70], x: 0.82, y: 0.66, r: 0.40, ax: 0.09, ay: 0.10, sx: 0.038, sy: 0.045, px: 3.0, py: 1.0 }
  ];

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = isDark() ? 'screen' : 'multiply';
    const a0 = isDark() ? 0.42 : 0.28;
    const minWH = Math.min(W, H);
    for (let i = 0; i < ORBS.length; i++) {
      const o = ORBS[i];
      const cx = (o.x + Math.sin(t * o.sx + o.px) * o.ax) * W;
      const cy = (o.y + Math.cos(t * o.sy + o.py) * o.ay) * H;
      const rad = o.r * minWH;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, 'rgba(' + o.c[0] + ',' + o.c[1] + ',' + o.c[2] + ',' + a0 + ')');
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

  if (reduce) { draw(2.4); return; }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? play() : stop())); }, { threshold: 0.04 }).observe(hero);
  } else { play(); }
})();
