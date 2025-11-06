// particles.js
// Simple click-particles implementation that works on static pages.
(() => {
  const colors = ["#ff6b6b", "#ffd93d", "#6bffb3", "#6bc7ff", "#c56bff", "#ffffff"];
  const particles = [];
  const container = document.body;

  function createParticle(x, y) {
    const el = document.createElement('div');
    el.className = 'click-particle';
    const size = Math.floor(Math.random() * 12) + 6; // 6-18px
    el.style.position = 'fixed';
    el.style.left = (x - size / 2) + 'px';
    el.style.top = (y - size / 2) + 'px';
    el.style.width = el.style.height = size + 'px';
    el.style.borderRadius = '50%';
    el.style.pointerEvents = 'none';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.zIndex = 9999;

    const angle = Math.random() * Math.PI * 2;
    el._vx = Math.cos(angle) * (Math.random() * 1.6 + 0.6);
    el._vy = Math.sin(angle) * (Math.random() * 1.6 + 0.6) - 1.8;
    el._gravity = 0.06 + Math.random() * 0.04;
    el._rot = (Math.random() - 0.5) * 30;

    const life = 700 + Math.random() * 800; // ms
    const start = performance.now();
    el.dataset.start = start;
    el.dataset.life = life;

    container.appendChild(el);
    particles.push(el);
  }

  function frame(now) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const age = now - Number(p.dataset.start);
      const life = Number(p.dataset.life);
      if (age >= life) {
        p.remove();
        particles.splice(i, 1);
        continue;
      }

      // basic physics
      p._vy += p._gravity;
      const x = parseFloat(p.style.left) + p._vx * 2;
      const y = parseFloat(p.style.top) + p._vy * 2;
      p.style.left = x + 'px';
      p.style.top = y + 'px';

      const t = age / life; // 0..1
      p.style.opacity = String(1 - t);
      const scale = 1 - 0.6 * t;
      p.style.transform = `scale(${scale}) rotate(${p._rot * t}deg)`;
    }

    requestAnimationFrame(frame);
  }

  // Add minimal CSS so particles look good
  const style = document.createElement('style');
  style.textContent = `
.click-particle{ transition: opacity 120ms linear; will-change: transform, opacity; }
`;
  document.head.appendChild(style);

  requestAnimationFrame(frame);

  // pointerdown produces better UX than click (fires immediately)
  document.addEventListener('pointerdown', (e) => {
    // only primary button
    if (e.button !== 0) return;

    // create a small burst
    const count = 6 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) createParticle(e.clientX, e.clientY);

    // safety cap: remove old particles if too many
    if (particles.length > 600) {
      const removeCount = particles.length - 500;
      for (let i = 0; i < removeCount; i++) {
        const p = particles.shift();
        if (p) p.remove();
      }
    }
  }, { passive: true });

})();
