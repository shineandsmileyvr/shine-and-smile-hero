// Shine + Smile: before/after slider, treatment finder, eligibility check. Shared by both previews.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const BOOK = 'https://www.shineandsmile.ca/s/appointments';

const header = $('.header');
const onScroll = () => header.classList.toggle('scrolled', scrollY > 10);
addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* ---------- before / after ---------- */
const ba = $('[data-ba]');
if (ba) {
  const stage = $('.ba-stage', ba);
  let pos = 50;
  const setPos = v => {
    pos = Math.min(100, Math.max(0, v));
    stage.style.setProperty('--pos', pos + '%');
    stage.setAttribute('aria-valuenow', String(Math.round(pos)));
    stage.setAttribute('aria-valuetext', `${Math.round(pos)}% before`);
  };
  // the whole frame is the control: press anywhere to move the line, then drag
  let dragging = false;
  const fromEvent = e => { const r = stage.getBoundingClientRect(); setPos((e.clientX - r.left) / r.width * 100); };
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (e.pointerType === 'mouse') e.preventDefault(); // stops text selection / native image drag
    dragging = true; stage.setPointerCapture(e.pointerId); stage.classList.add('dragging'); fromEvent(e);
  });
  stage.addEventListener('pointermove', e => { if (dragging) fromEvent(e); });
  const stop = () => { dragging = false; stage.classList.remove('dragging'); };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => stage.addEventListener(t, stop));
  stage.addEventListener('dragstart', e => e.preventDefault());
  stage.addEventListener('keydown', e => {
    const step = e.shiftKey ? 20 : 5;
    const map = { ArrowLeft: pos - step, ArrowDown: pos - step, ArrowRight: pos + step, ArrowUp: pos + step, Home: 0, End: 100, PageDown: pos - 20, PageUp: pos + 20 };
    if (e.key in map) { e.preventDefault(); setPos(map[e.key]); }
  });
  $$('.ba-thumbs button', ba).forEach(b => b.addEventListener('click', () => {
    const n = b.dataset.pair;
    $$('.ba-thumbs button', ba).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const after = $('.ba-after', ba), before = $('.ba-before', ba), h = n < 4 ? 353 : 439;
    after.height = before.height = h;
    after.src = `./img/ba${n}-after.webp`; before.src = `./img/ba${n}-before.webp`;
    $('#ba-name').textContent = b.dataset.name; $('#ba-note').textContent = b.dataset.note ? '· ' + b.dataset.note : '';
    setPos(50);
  }));
  $('#ba-note').textContent = '· ' + $('.ba-thumbs button').dataset.note;
}

/* ---------- treatment finder ---------- */
// Descriptions are from her services page; the matching rules follow what each treatment says it is for.
const TREAT = {
  lite: { name: 'Lite White', price: '$140', time: '45 min session', why: 'A gentle refresh that lifts surface stains. Ideal if you whitened in the last year, have very light stains or sensitive teeth.' },
  classic: { name: 'Classic White', price: '$155', time: '60 min session', why: 'Our most popular treatment. Targets deeper stains for a visibly whiter smile with zero to minimal sensitivity. Great for first-timers.' },
  signature: { name: 'Signature White', price: '$170', time: '75 min session', why: 'Our most intensive treatment, for the biggest lift in one session. Not suitable for sensitive teeth.' },
  ultra: { name: 'Ultra White Package', price: '$245', time: 'Classic session + touch-up within 6 months', why: 'For deeper stains and ultra-white results, while keeping sensitivity to a minimum.' },
  blended: { name: 'Ultra White Blended Package', price: '$250', time: 'Classic session + take-home whitening kit', why: 'Ultra-white results, then keep your smile bright from home with monthly touch-ups.' },
};
function recommend({ recent, sens, goal }) {
  const sensitive = sens !== 'no';
  if (goal === 'home') return 'blended';
  if (goal === 'max') return sensitive ? 'ultra' : 'signature';
  if (goal === 'noticeable') return sensitive && recent === 'yes' ? 'lite' : 'classic';
  return recent === 'no' && !sensitive ? 'classic' : 'lite';
}
const quiz = $('#quiz'), out = $('#match-result');
if (quiz) quiz.addEventListener('change', () => {
  const f = new FormData(quiz), a = { recent: f.get('recent'), sens: f.get('sens'), goal: f.get('goal') };
  const answered = ['recent', 'sens', 'goal'].filter(k => a[k]).length;
  if (answered < 3) { out.innerHTML = `<p class="mr-empty">${3 - answered} more to go.</p>`; return; }
  const k = recommend(a), t = TREAT[k];
  const notes = [];
  if (a.sens === 'unsure') notes.push('Not sure about sensitivity? Mention it at your free consultation and your technician will adjust.');
  if (f.get('event')) notes.push('Coming in for an event? Book at least one week before so the tones in your teeth can even out.');
  out.innerHTML = `<p class="kicker">Your match</p><h3></h3><p class="mr-meta"></p><p class="mr-why"></p>${notes.map(() => '<p class="mr-note"></p>').join('')}
    <div class="btn-row"><a class="btn btn-ink" href="${BOOK}">Book ${t.name}</a><a class="btn btn-line" href="#eligible">Check I’m eligible</a></div>`;
  $('h3', out).textContent = t.name; $('.mr-meta', out).textContent = `${t.price} · ${t.time}`; $('.mr-why', out).textContent = t.why;
  $$('.mr-note', out).forEach((p, i) => { p.textContent = notes[i]; });
  out.classList.add('has-result');
});

/* ---------- eligibility ---------- */
const checks = $('#checks'), res = $('#check-result'), ans = {};
if (checks) checks.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  ans[b.dataset.k] = b.dataset.v === '1';
  $$(`button[data-k="${b.dataset.k}"]`, checks).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  b.closest('li').dataset.state = ans[b.dataset.k] ? 'yes' : 'no';
  const keys = ['age', 'preg', 'clean'];
  if (keys.some(k => ans[k] === false)) {
    const tips = [];
    if (ans.age === false || ans.preg === false) tips.push('Whitening isn’t recommended under 16 or during pregnancy, so we’ll hold off for now.');
    if (ans.clean === false) tips.push('Book a cleaning with your dentist first, then come see us. Clean teeth whiten more evenly and stay brighter.');
    res.innerHTML = `<div class="cr cr-no"><b>Let’s talk first.</b>${tips.map(t => `<p>${t}</p>`).join('')}<div class="btn-row"><a class="btn btn-line btn-sm" href="sms:+16047571661">Text us</a><a class="btn btn-line btn-sm" href="mailto:info@shineandsmile.ca">Email us</a></div></div>`;
  } else if (keys.every(k => ans[k])) {
    res.innerHTML = `<div class="cr cr-yes"><b>You’re all set to book.</b><p>Pick your treatment and location on the next page.</p><a class="btn btn-ink" href="${BOOK}">Book now</a></div>`;
  } else res.innerHTML = '';
});
