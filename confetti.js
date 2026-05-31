/* TapColor — lightweight confetti burst on win */
(function () {
  function fire(canvas) {
    const ctx = canvas.getContext('2d');
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      canvas.width = canvas.clientWidth * DPR;
      canvas.height = canvas.clientHeight * DPR;
    }
    resize();
    const W = canvas.width, H = canvas.height;
    const colors = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#007aff', '#af52de', '#ff2d92'];
    const N = 170;
    const parts = [];
    for (let i = 0; i < N; i++) {
      const ang = (Math.random() * Math.PI) - Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      const spd = (7 + Math.random() * 13) * DPR;
      parts.push({
        x: W * (0.30 + Math.random() * 0.40),
        y: H * 0.42 + (Math.random() - 0.5) * H * 0.15,
        vx: Math.cos(ang) * spd * (Math.random() < 0.5 ? -1 : 1),
        vy: Math.sin(ang) * spd - (4 + Math.random() * 6) * DPR,
        g: (0.28 + Math.random() * 0.18) * DPR,
        w: (6 + Math.random() * 8) * DPR,
        h: (9 + Math.random() * 12) * DPR,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        color: colors[(Math.random() * colors.length) | 0],
        life: 0,
        ttl: 90 + Math.random() * 50,
      });
    }
    let raf;
    function tick() {
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const p of parts) {
        p.life++;
        if (p.life > p.ttl) continue;
        alive++;
        p.vy += p.g;
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        const fade = Math.max(0, 1 - (p.life / p.ttl));
        ctx.save();
        ctx.globalAlpha = Math.min(1, fade * 1.6);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive > 0) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    }
    cancelAnimationFrame(raf);
    tick();
  }
  window.TapConfetti = { fire };
})();
