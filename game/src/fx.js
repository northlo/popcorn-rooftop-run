// Particle effects and screen shake for Popcorn: Rooftop Run.
// Visual only: the simulation hands it events, main.js ticks it with
// real time, and render.js draws it. Nothing here touches the sim.

export function createFx() {
  return { parts: [], texts: [], shake: 0, meteors: [] };
}

export function fxShake(fx, amount) {
  fx.shake = Math.min(14, fx.shake + amount);
}

export function fxBurst(fx, x, y, opts) {
  const n = opts.n || 10;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (opts.speed || 160) * (0.4 + Math.random() * 0.8);
    fx.parts.push({
      x, y,
      vx: Math.cos(a) * sp + (opts.vx || 0),
      vy: Math.sin(a) * sp - (opts.up || 40),
      life: 0, max: (opts.life || 0.6) * (0.6 + Math.random() * 0.7),
      size: (opts.size || 4) * (0.6 + Math.random() * 0.8),
      color: opts.color || '#ffd166',
      grav: opts.grav ?? 500,
      shape: opts.shape || 'dot',
    });
  }
}

export function fxDust(fx, x, y) {
  fx.parts.push({
    x: x + (Math.random() - 0.5) * 10, y: y - 2,
    vx: -40 - Math.random() * 60, vy: -20 - Math.random() * 40,
    life: 0, max: 0.45, size: 3 + Math.random() * 3,
    color: 'rgba(220, 200, 180, 0.7)', grav: -60, shape: 'dot',
  });
}

export function fxText(fx, x, y, str, color) {
  fx.texts.push({ x, y, str, color: color || '#ffffff', life: 0, max: 1.0 });
}

export function fxFeathers(fx, x, y) {
  for (let i = 0; i < 8; i++) {
    fx.parts.push({
      x, y,
      vx: (Math.random() - 0.5) * 220, vy: -60 - Math.random() * 140,
      life: 0, max: 0.9 + Math.random() * 0.5, size: 5 + Math.random() * 4,
      color: '#2b2b3a', grav: 320, shape: 'feather',
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 10,
    });
  }
}

export function fxMeteor(fx, x, y) {
  fx.meteors.push({ x, y, life: 0, max: 0.9 });
}

export function tickFx(fx, dt) {
  fx.shake = Math.max(0, fx.shake - dt * 26);
  for (const p of fx.parts) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.grav * dt;
    if (p.rot !== undefined) p.rot += p.vr * dt;
  }
  fx.parts = fx.parts.filter((p) => p.life < p.max);
  for (const t of fx.texts) {
    t.life += dt;
    t.y -= 44 * dt;
  }
  fx.texts = fx.texts.filter((t) => t.life < t.max);
  for (const m of fx.meteors) m.life += dt;
  fx.meteors = fx.meteors.filter((m) => m.life < m.max);
}

export function drawFx(ctx, fx, camX) {
  // Screen shake: offset everything drawn after this by a decaying random.
  if (fx.shake > 0.2) {
    ctx.save();
    ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
  }
  for (const m of fx.meteors) {
    const a = 1 - m.life / m.max;
    ctx.strokeStyle = `rgba(255, 255, 255, ${a})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x - 70 * a - 20, m.y + 34 * a + 10);
    ctx.stroke();
  }
  for (const p of fx.parts) {
    const a = 1 - p.life / p.max;
    ctx.globalAlpha = a;
    if (p.shape === 'feather') {
      ctx.save();
      ctx.translate(p.x - camX, p.y);
      ctx.rotate(p.rot || 0);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y, p.size * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px "Trebuchet MS", Verdana, sans-serif';
  for (const t of fx.texts) {
    const a = 1 - t.life / t.max;
    ctx.globalAlpha = a;
    ctx.fillStyle = t.color;
    ctx.strokeStyle = 'rgba(40, 20, 40, 0.8)';
    ctx.lineWidth = 4;
    ctx.strokeText(t.str, t.x - camX, t.y);
    ctx.fillText(t.str, t.x - camX, t.y);
  }
  ctx.globalAlpha = 1;
  if (fx.shake > 0.2) ctx.restore();
}
