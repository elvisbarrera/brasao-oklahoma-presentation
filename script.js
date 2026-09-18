/* ---------- split headline text into animated word spans ---------- */
document.querySelectorAll('[data-split]').forEach(el => {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map(w => `<span class="word"><span>${w}</span></span>`).join(' ');
});

/* ---------- deck state ---------- */
const total = 10;
let current = 0;
let animating = false;
const slides = document.querySelectorAll('.slide');
const dotsWrap = document.getElementById('dots');
const counterEl = document.getElementById('counter-current');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const streak = document.getElementById('streak');
const progressFill = document.getElementById('progress-fill');

for (let i = 0; i < total; i++) {
  const d = document.createElement('button');
  d.className = 'dot' + (i === 0 ? ' active' : '');
  d.addEventListener('click', () => goTo(i));
  dotsWrap.appendChild(d);
}
const dots = document.querySelectorAll('.dot');

function updateTheme(i) {
  const isLight = slides[i].classList.contains('light-slide');
  document.body.classList.toggle('on-light-slide', isLight);
  const navLogo = document.getElementById('nav-logo');
  if (navLogo) {
    navLogo.src = isLight ? 'img/logo.png' : 'img/logo_light.png';
  }
}
updateTheme(0);

const urlParams = new URLSearchParams(window.location.search);
const hashMatch = window.location.hash.match(/\d+/);
const initialSlide = urlParams.get('slide') ? parseInt(urlParams.get('slide'), 10) - 1 : (hashMatch ? parseInt(hashMatch[0], 10) - 1 : 0);
if (initialSlide > 0 && initialSlide < total) {
  slides[0].classList.remove('active');
  dots[0].classList.remove('active');
  slides[initialSlide].classList.add('active');
  dots[initialSlide].classList.add('active');
  counterEl.textContent = String(initialSlide + 1).padStart(2, '0');
  prevBtn.disabled = initialSlide === 0;
  nextBtn.disabled = initialSlide === total - 1;
  if (progressFill) progressFill.style.width = ((initialSlide + 1) / total * 100) + '%';
  current = initialSlide;
  updateTheme(initialSlide);
}
statsOnSlide(current);
if (current === 5) startGoogleLiveTicker();

function statsOnSlide(i) {
  slides[i].querySelectorAll('.num[data-target], .mega-num[data-target]').forEach(el => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = parseFloat(el.dataset.target);
    const decimals = parseInt(el.dataset.decimal || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const duration = 1300;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = prefix + (target * eased).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    setTimeout(() => requestAnimationFrame(tick), 550);
  });
}

function goTo(i) {
  if (i < 0 || i >= total || i === current || animating) return;
  animating = true;
  playSwoosh();

  const dir = i > current ? 1 : -1;
  const outgoing = slides[current];
  const incoming = slides[i];

  incoming.style.setProperty('--enter-x', (dir > 0 ? 4 : -4) + '%');
  outgoing.style.setProperty('--exit-x', (dir > 0 ? -4 : 4) + '%');

  streak.classList.remove('fire');
  void streak.offsetWidth;
  streak.classList.add('fire');

  incoming.classList.add('pre-enter');
  void incoming.offsetWidth;

  requestAnimationFrame(() => {
    outgoing.classList.add('leaving');
    incoming.classList.remove('pre-enter');
    incoming.classList.add('active');

    updateTheme(i);

    if (current === 1 && typeof explainerPlayer !== 'undefined' && explainerPlayer && explainerPlayer.pauseVideo) {
      explainerPlayer.pauseVideo();
    }
    dots[current].classList.remove('active');
    dots[i].classList.add('active');
    counterEl.textContent = String(i + 1).padStart(2, '0');
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === total - 1;
    if (progressFill) progressFill.style.width = ((i + 1) / total * 100) + '%';
    statsOnSlide(i);
    if (i === 5) {
      startGoogleLiveTicker();
    } else {
      stopGoogleLiveTicker();
    }
    current = i;
  });

  setTimeout(() => {
    outgoing.classList.remove('active', 'leaving');
    streak.classList.remove('fire');
    animating = false;
  }, 640);
}
function nextSlide() { goTo(current + 1); }
function prevSlide() { goTo(current - 1); }
function restartDeck() { if (!animating && current !== 0) goTo(0); }

/* ---------- synthesized sound effects (Web Audio API, no external files) ---------- */
let audioCtx;
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playSwoosh() {
  const ctx = ensureAudio();
  const t0 = ctx.currentTime;
  const dur = 0.55;
  const bufferSize = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 0.7;
  band.frequency.setValueAtTime(1900, t0);
  band.frequency.exponentialRampToValueAtTime(260, t0 + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.09);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  noise.connect(band).connect(gain).connect(ctx.destination);
  noise.start(t0);
  noise.stop(t0 + dur);
}


document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') nextSlide();
  if (e.key === 'ArrowLeft') prevSlide();
});
prevBtn.disabled = true;
progressFill.style.width = (1 / total * 100) + '%';

/* ---------- contact form ---------- */
const openFormBtn = document.getElementById('open-form');
const contactForm = document.getElementById('contact-form');
const formNote = document.getElementById('form-note');
openFormBtn.addEventListener('click', () => {
  contactForm.classList.toggle('open');
  if (contactForm.classList.contains('open')) contactForm.querySelector('input').focus();
});
contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  formNote.textContent = 'Thank you for your message. The Brasão executive team will be in touch promptly.';
});

/* ---------- tilt-on-hover for cards ---------- */
document.querySelectorAll('.tilt-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(700px) rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg) translateY(-4px)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

/* ---------- magnetic buttons ---------- */
document.querySelectorAll('.magnetic').forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    btn.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`;
  });
  btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
});


/* ---------- hero background video — YouTube IFrame API ---------- */
const YT_VIDEO_ID = '1l95c-YNgv8';
function sizeYtFrame() {
  const hero = document.getElementById('slide-1');
  const frame = document.getElementById('yt-bg-frame');
  const w = hero.offsetWidth, h = hero.offsetHeight;
  const ratio = 16 / 9;
  let frameW, frameH;
  if (w / h > ratio) { frameW = w * 1.15; frameH = frameW / ratio; }
  else { frameH = h * 1.15; frameW = frameH * ratio; }
  frame.style.width = frameW + 'px';
  frame.style.height = frameH + 'px';
  frame.style.transform = 'translate(-50%, -50%)';
  const iframe = frame.querySelector('iframe');
  if (iframe) { iframe.style.width = '100%'; iframe.style.height = '100%'; }
}
function loadYtApi() {
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}
window.onYouTubeIframeAPIReady = function () {
  new YT.Player('yt-bg-frame', {
    videoId: YT_VIDEO_ID,
    playerVars: {
      autoplay: 1, mute: 1, loop: 1, controls: 0, showinfo: 0,
      rel: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1,
      playlist: YT_VIDEO_ID, disablekb: 1
    },
    events: {
      onReady: (e) => { e.target.mute(); e.target.playVideo(); sizeYtFrame(); }
    }
  });

  explainerPlayer = new YT.Player('yt-explainer-frame', {
    videoId: YT_VIDEO_ID,
    playerVars: {
      autoplay: 0, mute: 0, controls: 0, rel: 0, showinfo: 0,
      iv_load_policy: 3, modestbranding: 1, playsinline: 1, disablekb: 1
    },
    events: {
      onStateChange: (e) => {
        const btn = document.getElementById('video-toggle-btn');
        const icon = document.getElementById('video-toggle-icon');
        if (!btn || !icon) return;
        if (e.data === YT.PlayerState.PLAYING) {
          btn.classList.add('is-playing');
          icon.innerHTML = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';
          btn.setAttribute('aria-label', 'Pause video');
        } else {
          btn.classList.remove('is-playing');
          icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
          btn.setAttribute('aria-label', 'Play video');
        }
      }
    }
  });
};
loadYtApi();
window.addEventListener('resize', sizeYtFrame);

let explainerPlayer;
function toggleExplainerVideo() {
  if (!explainerPlayer || !explainerPlayer.getPlayerState) return;
  const state = explainerPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    explainerPlayer.pauseVideo();
  } else {
    explainerPlayer.unMute();
    explainerPlayer.playVideo();
  }
}
document.getElementById('video-toggle-btn').addEventListener('click', toggleExplainerVideo);

/* ---------- Live Google Review Ticker (Slide 6) ---------- */
let googleLiveTotal = 20727;
const locCounts = {
  sa: 10262,
  plano: 5425,
  irving: 5040
};
const locCycle = ['sa', 'plano', 'sa', 'irving', 'sa'];
let locCycleIdx = 0;
let googleTickerTimeout = null;

function tickGoogleReview() {
  googleLiveTotal += 1;
  const totalEl = document.getElementById('google-live-total');
  if (totalEl) {
    totalEl.textContent = googleLiveTotal.toLocaleString('en-US');
    totalEl.classList.remove('ticker-bump');
    void totalEl.offsetWidth;
    totalEl.classList.add('ticker-bump');
  }

  const locKey = locCycle[locCycleIdx % locCycle.length];
  locCycleIdx++;
  locCounts[locKey] += 1;
  const locEl = document.getElementById('google-' + locKey + '-count');
  if (locEl) {
    const valSpan = locEl.querySelector('.cnt-val');
    if (valSpan) {
      valSpan.textContent = locCounts[locKey].toLocaleString('en-US');
      valSpan.classList.remove('count-bump');
      void valSpan.offsetWidth;
      valSpan.classList.add('count-bump');
    }
  }

  // Realistic randomized delay between 3.6s and 6.2s
  const nextDelay = Math.floor(Math.random() * 2600) + 3600;
  googleTickerTimeout = setTimeout(tickGoogleReview, nextDelay);
}

function startGoogleLiveTicker() {
  if (googleTickerTimeout) return;
  googleTickerTimeout = setTimeout(tickGoogleReview, 3000);
}

function stopGoogleLiveTicker() {
  if (googleTickerTimeout) {
    clearTimeout(googleTickerTimeout);
    googleTickerTimeout = null;
  }
}
