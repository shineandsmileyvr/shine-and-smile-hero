// Shine + Smile preview: scroll-scrubbed hero + small page helpers. No third-party scripts.
const SETS = { desk: { dir: 'desk', count: 144 }, phone: { dir: 'phone', count: 144 } };
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = !!navigator.connection?.saveData;
const hero = $('#hero'), canvas = $('.hero canvas'), ctx = canvas.getContext('2d', { alpha: false });
const copy = $('.hero-copy'), points = $$('.hero-points li');

/* frames: poster shows first; frames stream in coarse-to-fine, canvas fades in once frame 1 is ready */
let set = null, imgs = [], drawn = null, current = 0;
function pickSet() { return innerWidth / innerHeight < 0.8 ? SETS.phone : SETS.desk; }
function load(s) {
  set = s; imgs = new Array(s.count); drawn = null;
  const order = [], seen = new Set();
  for (const step of [16, 4, 1]) for (let i = 0; i < s.count; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
  let next = 0, active = 0;
  const limit = s === SETS.phone ? 4 : 6, mine = s;
  const pump = () => {
    while (active < limit && next < order.length) {
      const i = order[next++], img = new Image(); active++;
      img.decoding = 'async';
      img.src = `./frames/${s.dir}/f${String(i + 1).padStart(3, '0')}.webp?v=shade1`;
      img.decode().then(() => { if (set === mine) imgs[i] = img; }, () => {}).finally(() => { active--; pump(); });
    }
  };
  pump();
}
function nearest(i) {
  for (let d = 0; d < set.count; d++) { if (imgs[i - d]) return imgs[i - d]; if (imgs[i + d]) return imgs[i + d]; }
  return null;
}
function draw(img) {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (!w || !h) return;
  const resized = canvas.width !== w || canvas.height !== h;
  if (resized) { canvas.width = w; canvas.height = h; }
  if (!resized && img === drawn) return;
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight), iw = img.naturalWidth * s, ih = img.naturalHeight * s;
  ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
  drawn = img; hero.classList.add('has-frame');
}

/* Lenis only smooths mouse wheels; touch scrolling stays native so nothing traps a thumb */
const lenis = !reduced && matchMedia('(pointer: fine)').matches && window.Lenis ? new window.Lenis({ duration: 1, smoothWheel: true, syncTouch: false }) : null;

let last = 0, lastPoint = -2;
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(64, now - (last || now)); last = now;
  lenis?.raf(now);
const header = $('.header'); if (header) header.classList.toggle('scrolled', scrollY > 10);
  if (!set) return;
  const r = hero.getBoundingClientRect();
  if (r.bottom < 0) return;
  const target = clamp(-r.top / (r.height - innerHeight));
  current += (target - current) * (1 - Math.exp(-dt / 70));
  if (Math.abs(target - current) < 1e-4) current = target;
  const img = nearest(Math.round(current * (set.count - 1)));
  if (img) draw(img);
  const a = 1 - ease((current - .3) / .35);
  copy.style.opacity = a; copy.style.transform = `translateY(${-24 * (1 - a)}px)`;
  copy.inert = a < .05;
  const p = current < .12 ? -1 : current < .4 ? 0 : current < .68 ? 1 : 2;
  if (p !== lastPoint) { lastPoint = p; points.forEach((li, i) => li.classList.toggle('on', i <= p)); }
}

if (!reduced && !saveData) {
  load(pickSet());
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { const s = pickSet(); if (s !== set) load(s); drawn = null; }, 200);
  });
  requestAnimationFrame(tick);
} else {
  points.forEach(li => li.classList.add('on'));
  addEventListener('scroll', () => $('.header').classList.toggle('scrolled', scrollY > 10), { passive: true });
}

// in-page links through Lenis when it is running
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const t = document.querySelector(a.getAttribute('href')); if (!t || !lenis) return;
  e.preventDefault(); lenis.scrollTo(t, { offset: -100 });
}));
