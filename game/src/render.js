// Rendering for Popcorn: Rooftop Run.
// Every picture is drawn in code on one canvas: parallax town, the cat,
// the pickups and the HUD. It only reads the game state, never changes it.

import { LEVELS, VIEW_W, VIEW_H, TEXT } from './config.js';
import { makeRng, int, range } from './random.js';
import { starsFor } from './world.js';
import { drawFx } from './fx.js';

const FONT = '"Trebuchet MS", Verdana, sans-serif';

// Decorations are built once per level from its seed and cached on the
// game object (render state, not simulation state).
function decorFor(game) {
  if (game._decor && game._decor.level === game.level) return game._decor;
  const level = game.level;
  const rng = makeRng(game.seed * 7 + game.levelIndex * 331);
  const far = [];
  const mid = [];
  const clouds = [];
  const birds = [];
  const stars = [];
  const kites = [];
  for (let x = 0; x < level.length + 1400; x += int(rng, 90, 150)) {
    far.push({ x, w: int(rng, 70, 130), h: int(rng, 90, 230) });
  }
  for (let x = 0; x < level.length + 1400; x += int(rng, 170, 260)) {
    const wins = [];
    const rows = int(rng, 2, 4);
    const cols = int(rng, 2, 4);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        wins.push({ dx: 14 + c * 26, dy: 16 + r * 30, ph: rng() * Math.PI * 2, on: rng() < 0.55 });
      }
    }
    mid.push({ x, w: int(rng, 130, 200), h: int(rng, 130, 260), wins });
  }
  for (let i = 0; i < 14; i++) {
    clouds.push({ x: rng() * (level.length + 1000), y: range(rng, 40, 220), s: range(rng, 0.6, 1.5), v: range(rng, 6, 16) });
  }
  for (let i = 0; i < 7; i++) {
    birds.push({ x: rng() * level.length, y: range(rng, 90, 260), v: range(rng, 24, 44), ph: rng() * Math.PI * 2 });
  }
  for (let i = 0; i < 90; i++) {
    stars.push({ x: rng() * (level.length + 1000), y: range(rng, 10, 330), r: range(rng, 0.8, 2.2), ph: rng() * Math.PI * 2 });
  }
  for (let i = 0; i < 10; i++) {
    kites.push({ x: 600 + i * 1700 + int(rng, -200, 200), y: range(rng, 130, 260), c: ['#e63946', '#ffc93c', '#2ec4b6', '#ff7b54', '#ffe8a3'][i % 5], ph: rng() * Math.PI * 2 });
  }
  for (const b of far) {
    b.spire = rng() < 0.45;
    b.crane = rng() < 0.12;
  }
  const lanterns = [];
  for (let x = 200; x < level.length + 1400; x += int(rng, 520, 760)) {
    const n = int(rng, 5, 8);
    lanterns.push({ x, span: n * 58, y: range(rng, 300, 360), n, ph: rng() * Math.PI * 2 });
  }
  const skyKites = [];
  for (let i = 0; i < 26; i++) {
    skyKites.push({ x: i * 520 + int(rng, -120, 120), y: range(rng, 90, 210), s: range(rng, 0.55, 0.85), c: ['#e63946', '#ffc93c', '#2ec4b6', '#ff7b54', '#ffe8a3'][i % 5], ph: rng() * Math.PI * 2 });
  }
  const sparkles = [];
  for (let i = 0; i < 22; i++) {
    sparkles.push({ x: rng() * (VIEW_W + 40), y: range(rng, 20, 300), r: range(rng, 4, 9), ph: rng() * Math.PI * 2 });
  }
  game._decor = { level, far, mid, clouds, birds, stars, kites, lanterns, skyKites, sparkles };
  return game._decor;
}

export function drawGame(ctx, game, fx, t, highScore) {
  const level = game.level;
  const pal = level.def.palette;
  const camX = game.screen === 'title' ? game.titlePan : game.camX;
  const d = decorFor(game);

  // --- sky ---
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, pal.skyTop);
  sky.addColorStop(0.55, pal.skyMid);
  sky.addColorStop(1, pal.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Sun or moon.
  const sunX = VIEW_W - 210;
  const sunY = game.levelIndex === 2 ? 118 : 150;
  ctx.save();
  if (game.levelIndex === 2) {
    // Moon halo rings.
    for (let i = 3; i >= 1; i--) {
      ctx.fillStyle = `rgba(190, 215, 255, ${0.05 + 0.03 * (3 - i)})`;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 70 + i * 34, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = pal.sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, game.levelIndex === 2 ? 78 : 84, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, game.levelIndex === 2 ? 58 : 56, 0, Math.PI * 2);
  ctx.fill();
  if (game.levelIndex === 2) {
    ctx.fillStyle = 'rgba(160, 175, 215, 0.55)';
    ctx.beginPath();
    for (const [dx, dy, r] of [[-18, -10, 11], [16, 18, 8], [20, -22, 5], [-8, 26, 4]]) {
      ctx.moveTo(sunX + dx + r, sunY + dy);
      ctx.arc(sunX + dx, sunY + dy, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.restore();

  // Stars on the night level.
  if (game.levelIndex === 2) {
    for (const s of d.stars) {
      const sx = ((s.x - camX * 0.08) % (VIEW_W + 40) + VIEW_W + 40) % (VIEW_W + 40) - 20;
      ctx.globalAlpha = 0.45 + 0.45 * Math.sin(t * 1.4 + s.ph);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Big four-point twinkles.
    for (const s of d.sparkles) {
      const sx = ((s.x - camX * 0.05) % (VIEW_W + 40) + VIEW_W + 40) % (VIEW_W + 40) - 20;
      const k = 0.55 + 0.45 * Math.sin(t * 2.1 + s.ph);
      ctx.globalAlpha = k;
      ctx.fillStyle = '#fff7d6';
      const r = s.r * (0.7 + 0.3 * k);
      ctx.beginPath();
      ctx.moveTo(sx, s.y - r);
      ctx.quadraticCurveTo(sx, s.y, sx + r, s.y);
      ctx.quadraticCurveTo(sx, s.y, sx, s.y + r);
      ctx.quadraticCurveTo(sx, s.y, sx - r, s.y);
      ctx.quadraticCurveTo(sx, s.y, sx, s.y - r);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Market sky: far kites drifting high over the stalls.
  if (game.levelIndex === 1) {
    for (const k of d.skyKites) {
      const kx = k.x - camX * 0.3;
      if (kx < -60 || kx > VIEW_W + 60) continue;
      drawKite(ctx, kx + Math.sin(t * 0.8 + k.ph) * 10, k.y + Math.sin(t * 1.1 + k.ph) * 8, k.s, k.c, t, k.ph);
    }
  }

  // Clouds.
  for (const c of d.clouds) {
    const cx = (((c.x + t * c.v - camX * 0.25) % (VIEW_W + 320)) + VIEW_W + 320) % (VIEW_W + 320) - 160;
    ctx.fillStyle = pal.cloud;
    ctx.beginPath();
    ctx.ellipse(cx, c.y, 52 * c.s, 17 * c.s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 34 * c.s, c.y + 5, 36 * c.s, 13 * c.s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 34 * c.s, c.y + 6, 30 * c.s, 11 * c.s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Birds.
  ctx.strokeStyle = 'rgba(50, 30, 50, 0.75)';
  ctx.lineWidth = 2;
  for (const b of d.birds) {
    const bx = (((b.x + t * b.v - camX * 0.45) % (VIEW_W + 120)) + VIEW_W + 120) % (VIEW_W + 120) - 60;
    const by = b.y + Math.sin(t * 2 + b.ph) * 8;
    const flap = Math.sin(t * 9 + b.ph) * 5;
    ctx.beginPath();
    ctx.moveTo(bx - 9, by);
    ctx.quadraticCurveTo(bx - 3, by - 5 - flap, bx, by);
    ctx.quadraticCurveTo(bx + 3, by - 5 - flap, bx + 9, by);
    ctx.stroke();
  }

  // Far skyline.
  for (const b of d.far) {
    const bx = b.x - camX * 0.2;
    if (bx < -200 || bx > VIEW_W + 80) continue;
    ctx.fillStyle = pal.far;
    ctx.fillRect(bx, 560 - b.h, b.w, b.h + 200);
    ctx.beginPath();
    if (game.levelIndex === 2 && b.spire) {
      // Starfall Spires: tall needle towers with a lit tip.
      const top = 560 - b.h - 90 - (b.w % 40);
      ctx.moveTo(bx + b.w * 0.2, 560 - b.h);
      ctx.lineTo(bx + b.w / 2, top);
      ctx.lineTo(bx + b.w * 0.8, 560 - b.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255, 240, 180, ${0.6 + 0.4 * Math.sin(t * 2 + b.x)})`;
      ctx.beginPath();
      ctx.arc(bx + b.w / 2, top + 4, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(bx, 560 - b.h);
      ctx.lineTo(bx + b.w / 2, 560 - b.h - 26);
      ctx.lineTo(bx + b.w, 560 - b.h);
      ctx.closePath();
      ctx.fill();
    }
    if (game.levelIndex === 0 && b.crane) drawCrane(ctx, bx + b.w / 2, 560 - b.h, pal, t);
  }

  // Sea and sailboats (harbour level) / town glow at the bottom.
  ctx.fillStyle = pal.sea;
  ctx.fillRect(0, 648, VIEW_W, 72);
  ctx.fillStyle = pal.seaDark;
  for (let i = 0; i < 5; i++) {
    const wx = (((i * 340 - camX * 0.35) % (VIEW_W + 200)) + VIEW_W + 200) % (VIEW_W + 200) - 100;
    ctx.fillRect(wx, 668 + (i % 2) * 14, 180, 4);
  }
  if (game.levelIndex === 0) {
    for (let i = 0; i < 3; i++) {
      const bx = (((i * 620 + 240 - camX * 0.3) % (VIEW_W + 300)) + VIEW_W + 300) % (VIEW_W + 300) - 150;
      const by = 640 + Math.sin(t * 0.8 + i * 2) * 3;
      ctx.fillStyle = '#5d3a5e';
      ctx.fillRect(bx - 26, by, 52, 8);
      ctx.fillStyle = '#fff3e0';
      ctx.beginPath();
      ctx.moveTo(bx, by - 34);
      ctx.lineTo(bx + 16, by);
      ctx.lineTo(bx, by);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff9e57';
      ctx.beginPath();
      ctx.moveTo(bx - 2, by - 26);
      ctx.lineTo(bx - 14, by);
      ctx.lineTo(bx - 2, by);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Mid houses with flickering windows.
  for (const h of d.mid) {
    const hx = h.x - camX * 0.5;
    if (hx < -260 || hx > VIEW_W + 60) continue;
    ctx.fillStyle = pal.mid;
    ctx.fillRect(hx, 620 - h.h, h.w, h.h + 120);
    ctx.beginPath();
    ctx.moveTo(hx - 6, 620 - h.h);
    ctx.lineTo(hx + h.w / 2, 620 - h.h - 30);
    ctx.lineTo(hx + h.w + 6, 620 - h.h);
    ctx.closePath();
    ctx.fill();
    for (const w of h.wins) {
      const lit = w.on && Math.sin(t * 0.7 + w.ph) > -0.55;
      ctx.fillStyle = lit ? pal.windowLit : pal.windowDark;
      ctx.fillRect(hx + w.dx, 620 - h.h + w.dy, 14, 18);
    }
  }

  // Kites (market level) and bunting flags between rooftops.
  if (game.levelIndex === 1) {
    // Strings of paper lanterns glowing over the market.
    for (const L of d.lanterns) {
      const lx = L.x - camX * 0.6;
      if (lx + L.span < -40 || lx > VIEW_W + 40) continue;
      ctx.strokeStyle = 'rgba(40, 20, 20, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, L.y - 30);
      ctx.quadraticCurveTo(lx + L.span / 2, L.y + 30, lx + L.span, L.y - 30);
      ctx.stroke();
      for (let i = 1; i < L.n; i++) {
        const u = i / L.n;
        const px = lx + L.span * u;
        const py = (1 - u) * (1 - u) * (L.y - 30) + 2 * u * (1 - u) * (L.y + 30) + u * u * (L.y - 30);
        const sway = Math.sin(t * 1.6 + L.ph + i) * 0.12;
        drawLantern(ctx, px, py, sway, t + i);
      }
    }
    for (const k of d.kites) {
      const kx = k.x - camX;
      if (kx < -80 || kx > VIEW_W + 80) continue;
      const sway = Math.sin(t * 1.1 + k.ph) * 14;
      const ky = k.y + Math.sin(t * 0.9 + k.ph) * 10;
      ctx.strokeStyle = 'rgba(60, 30, 40, 0.5)';
      ctx.beginPath();
      ctx.moveTo(kx, 720);
      ctx.lineTo(kx + sway, ky);
      ctx.stroke();
      drawKite(ctx, kx + sway, ky, 1.3, k.c, t, k.ph);
    }
    // Bunting strings across the rooftops.
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const bx = 300 + i * 900 - camX;
      if (bx < -700 || bx > VIEW_W + 100) continue;
      ctx.strokeStyle = 'rgba(60, 30, 40, 0.6)';
      ctx.beginPath();
      ctx.moveTo(bx, 430);
      ctx.quadraticCurveTo(bx + 300, 480, bx + 600, 430);
      ctx.stroke();
      const cols = ['#e63946', '#ffc93c', '#2ec4b6', '#ffe8a3', '#ff7b54'];
      for (let f = 0; f < 9; f++) {
        const fx0 = bx + 40 + f * 62;
        const fy = 430 + Math.sin((f / 8) * Math.PI) * 34;
        ctx.fillStyle = cols[f % cols.length];
        ctx.beginPath();
        ctx.moveTo(fx0, fy);
        ctx.lineTo(fx0 + 16, fy + 2);
        ctx.lineTo(fx0 + 8, fy + 20);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  drawWorld(ctx, game, pal, camX, t);
  drawFx(ctx, fx, camX);

  if (game.screen === 'play' || game.screen === 'pause' || game.screen === 'levelclear') {
    drawHud(ctx, game, highScore, t);
  }
  if (game.screen === 'title') drawTitle(ctx, game, t);
  if (game.screen === 'card') drawCard(ctx, game);
  if (game.screen === 'pause') drawPause(ctx);
  if (game.screen === 'levelclear') drawLevelClear(ctx, game);
  if (game.screen === 'gameover') drawGameOver(ctx, game, highScore);
  if (game.screen === 'complete') drawComplete(ctx, game, highScore, t);
}

function drawWorld(ctx, game, pal, camX, t) {
  const level = game.level;
  const cat = game.cat;

  // Moon Gate at the end.
  const gx = level.gate.x - camX;
  if (gx > -200 && gx < VIEW_W + 200) {
    ctx.save();
    ctx.translate(gx, level.gate.y);
    ctx.strokeStyle = '#ffe66d';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, -70, 62, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 230, 109, 0.25)';
    ctx.beginPath();
    ctx.arc(0, -70, 62, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(0, -70, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8d27a';
    ctx.beginPath();
    ctx.arc(-10, -78, 7, 0, Math.PI * 2);
    ctx.arc(12, -60, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.roofDark;
    ctx.fillRect(-70, -8, 14, 10);
    ctx.fillRect(56, -8, 14, 10);
    ctx.restore();
  }

  // Rooftops.
  for (const pl of level.platforms) {
    const px = pl.x - camX;
    if (px + pl.w < -40 || px > VIEW_W + 40) continue;
    ctx.fillStyle = pal.wall;
    ctx.fillRect(px, pl.y, pl.w, VIEW_H - pl.y);
    ctx.fillStyle = pal.wallDark;
    ctx.fillRect(px, pl.y + 26, pl.w, 6);
    // Roof tiles.
    ctx.fillStyle = pal.roof;
    ctx.fillRect(px - 4, pl.y - 12, pl.w + 8, 16);
    ctx.fillStyle = pal.roofDark;
    for (let tx = px; tx < px + pl.w; tx += 34) {
      ctx.fillRect(tx, pl.y - 12, 3, 16);
    }
    ctx.fillStyle = pal.roofEdge;
    ctx.fillRect(px - 4, pl.y - 12, pl.w + 8, 4);
    // A lit window or two on the wall, for the town feel.
    ctx.fillStyle = pal.windowDark;
    for (let wx = px + 26; wx < px + pl.w - 30; wx += 120) {
      ctx.fillRect(wx, pl.y + 48, 22, 30);
      ctx.fillStyle = Math.sin(t * 0.6 + wx) > -0.4 ? pal.windowLit : pal.windowDark;
      ctx.fillRect(wx, pl.y + 48, 22, 30);
      ctx.fillStyle = pal.windowDark;
    }
  }

  // Awnings (market level): striped bounce pads.
  for (const aw of level.awnings) {
    const ax = aw.x - camX;
    if (ax + aw.w < -40 || ax > VIEW_W + 40) continue;
    const bob = Math.sin(t * 3 + ax) * 2;
    for (let i = 0; i < aw.w; i += 28) {
      ctx.fillStyle = (i / 28) % 2 === 0 ? '#ff595e' : '#fff3e0';
      ctx.fillRect(ax + i, aw.y + bob, 28, 10);
    }
    ctx.fillStyle = pal.roofDark;
    ctx.fillRect(ax, aw.y + bob + 10, aw.w, 6);
  }

  // Chimneys with smoke.
  for (const ch of level.chimneys) {
    const cx = ch.x - camX;
    if (cx + ch.w < -40 || cx > VIEW_W + 40) continue;
    ctx.fillStyle = '#7a5a6e';
    ctx.fillRect(cx, ch.y, ch.w, ch.h);
    ctx.fillStyle = '#5d3a5e';
    ctx.fillRect(cx - 4, ch.y - 10, ch.w + 8, 12);
    ctx.fillStyle = '#2b2b3a';
    ctx.fillRect(cx + 6, ch.y - 8, ch.w - 12, 6);
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.5 + i * 0.33 + ch.x * 0.01) % 1;
      ctx.fillStyle = `rgba(230, 220, 230, ${0.35 * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(cx + ch.w / 2 + Math.sin(ph * 9 + i) * 8, ch.y - 18 - ph * 46, 6 + ph * 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Golden Fish biscuits.
  for (const f of level.fish) {
    if (f.taken) continue;
    const fx0 = f.x - camX;
    if (fx0 < -40 || fx0 > VIEW_W + 40) continue;
    const fy = f.y + Math.sin(t * 2 + f.phase) * 4;
    // Soft golden glow so the fish pop against every sky.
    const gl = 0.22 + 0.1 * Math.sin(t * 3 + f.phase);
    ctx.fillStyle = `rgba(255, 214, 102, ${gl})`;
    ctx.beginPath();
    ctx.arc(fx0 - 3, fy, 21, 0, Math.PI * 2);
    ctx.fill();
    drawFish(ctx, fx0, fy, 1.15, true);
  }

  // Moon Bells.
  for (const b of level.bells) {
    if (b.taken) continue;
    const bx = b.x - camX;
    if (bx < -60 || bx > VIEW_W + 60) continue;
    const by = b.y + Math.sin(t * 1.5 + b.phase) * 5;
    ctx.save();
    ctx.translate(bx, by);
    ctx.strokeStyle = 'rgba(255, 230, 109, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -44);
    ctx.lineTo(0, -18);
    ctx.stroke();
    ctx.fillStyle = '#ffe66d';
    ctx.beginPath();
    ctx.arc(0, 0, 15, Math.PI, 0);
    ctx.lineTo(15, 0);
    ctx.lineTo(11, -14);
    ctx.lineTo(-11, -14);
    ctx.lineTo(-15, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(0, 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 3 + b.phase);
    ctx.fillStyle = '#ffe66d';
    ctx.beginPath();
    ctx.arc(0, -2, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Bowl of warm milk.
  if (level.milk && !level.milk.taken) {
    const m = level.milk;
    const mx = m.x - camX;
    if (mx > -60 && mx < VIEW_W + 60) {
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.ellipse(mx, m.y + 8, 26, 12, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#fff8e7';
      ctx.beginPath();
      ctx.ellipse(mx, m.y + 6, 22, 8, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2.5;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(mx + i * 10, m.y - 2);
        ctx.quadraticCurveTo(mx + i * 10 + 4, m.y - 14, mx + i * 10, m.y - 24 - Math.sin(t * 2 + i) * 3);
        ctx.stroke();
      }
    }
  }

  // Crows.
  for (const c of level.crows) {
    if (c.gone) continue;
    const cx = c.x - camX;
    if (cx < -60 || cx > VIEW_W + 60) continue;
    const flap = Math.sin(t * 10 + c.phase) * 0.7;
    const warn = c.state === 'warn';
    ctx.save();
    ctx.translate(cx, c.y);
    if (warn) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 20);
      ctx.strokeStyle = '#ff595e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#23232e';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-14, -4, 12, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(16, -7, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.moveTo(23, -8);
    ctx.lineTo(30, -6);
    ctx.lineTo(23, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(18, -9, 2.4, 0, Math.PI * 2);
    ctx.fill();
    // Wings.
    ctx.fillStyle = '#17171f';
    ctx.save();
    ctx.rotate(-0.5 - flap * 0.5);
    ctx.beginPath();
    ctx.ellipse(-4, -12, 16, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  if (game.screen !== 'complete' && game.screen !== 'title') drawCat(ctx, cat, camX, t);
}

// Top of the rooftop under a screen x (for placing the sitting cat).
function roofAt(game, camX, sx) {
  for (const pl of game.level.platforms) {
    if (camX + sx >= pl.x + 20 && camX + sx <= pl.x + pl.w - 20) return pl.y - 12;
  }
  return null;
}

// A diamond kite with a ribbon tail.
function drawKite(ctx, x, y, s, color, t, ph) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(Math.sin(t * 1.3 + ph) * 0.22);
  // Ribbon tail with bows.
  ctx.strokeStyle = 'rgba(255, 250, 235, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 20);
  for (let i = 1; i <= 4; i++) {
    ctx.lineTo(Math.sin(t * 3 + ph + i) * 6, 20 + i * 11);
  }
  ctx.stroke();
  for (let i = 1; i <= 3; i++) {
    const bx = Math.sin(t * 3 + ph + i) * 6;
    const by = 20 + i * 11;
    ctx.fillStyle = i % 2 ? '#ffc93c' : '#e63946';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - 5, by - 3);
    ctx.lineTo(bx - 5, by + 3);
    ctx.closePath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + 5, by - 3);
    ctx.lineTo(bx + 5, by + 3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(60, 25, 30, 0.75)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(16, 0);
  ctx.lineTo(0, 22);
  ctx.lineTo(-16, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(16, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.moveTo(0, 22);
  ctx.lineTo(-16, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(0, 22);
  ctx.moveTo(-16, 0);
  ctx.lineTo(16, 0);
  ctx.stroke();
  ctx.restore();
}

// A red paper lantern with a warm glow.
function drawLantern(ctx, x, y, sway, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway);
  const glow = 0.28 + 0.08 * Math.sin(t * 3);
  ctx.fillStyle = `rgba(255, 201, 60, ${glow})`;
  ctx.beginPath();
  ctx.arc(0, 16, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40, 20, 20, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 4);
  ctx.stroke();
  ctx.fillStyle = '#d62828';
  ctx.beginPath();
  ctx.ellipse(0, 16, 11, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff6b4a';
  ctx.beginPath();
  ctx.ellipse(-2, 15, 5, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffc93c';
  ctx.fillRect(-6, 3, 12, 3);
  ctx.fillRect(-6, 26, 12, 3);
  ctx.strokeStyle = '#ffc93c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 29);
  ctx.lineTo(0, 37);
  ctx.stroke();
  ctx.restore();
}

// A harbour crane silhouette with a blinking warning light.
function drawCrane(ctx, x, baseY, pal, t) {
  ctx.save();
  ctx.fillStyle = pal.mid;
  ctx.strokeStyle = pal.mid;
  ctx.lineWidth = 3;
  const top = baseY - 100;
  // Tower legs and cross bracing.
  ctx.fillRect(x - 10, top, 4, 100);
  ctx.fillRect(x + 6, top, 4, 100);
  ctx.beginPath();
  for (let y = top + 10; y < baseY; y += 22) {
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x + 8, y + 22);
    ctx.moveTo(x + 8, y);
    ctx.lineTo(x - 8, y + 22);
  }
  ctx.stroke();
  // Cab and jib.
  ctx.fillRect(x - 14, top - 18, 28, 18);
  ctx.fillRect(x - 60, top - 26, 190, 8);
  ctx.beginPath();
  ctx.moveTo(x, top - 26);
  ctx.lineTo(x, top - 54);
  ctx.lineTo(x + 126, top - 24);
  ctx.moveTo(x, top - 54);
  ctx.lineTo(x - 58, top - 24);
  ctx.stroke();
  // Hook line and a swinging crate.
  const sw = Math.sin(t * 0.9) * 4;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 100, top - 18);
  ctx.lineTo(x + 100 + sw, top + 40);
  ctx.stroke();
  ctx.fillRect(x + 90 + sw, top + 40, 22, 16);
  ctx.fillStyle = Math.sin(t * 4) > 0 ? '#ff4d6d' : 'rgba(255, 77, 109, 0.3)';
  ctx.beginPath();
  ctx.arc(x, top - 57, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFish(ctx, x, y, s, outline) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (outline) {
    ctx.strokeStyle = 'rgba(120, 50, 10, 0.85)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 9, 0, 0, Math.PI * 2);
    ctx.moveTo(-13, 0);
    ctx.lineTo(-22, -8);
    ctx.lineTo(-22, 8);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.fillStyle = '#ffb703';
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-13, 0);
  ctx.lineTo(-22, -8);
  ctx.lineTo(-22, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 243, 176, 0.7)';
  ctx.beginPath();
  ctx.ellipse(1, -4, 8, 2.5, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fb8500';
  ctx.beginPath();
  ctx.arc(7, -2, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.arc(4, 2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(251, 133, 0, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(-2, 0, 6, -0.6, 0.6);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Popcorn the cat: a long-haired brown tabby with a white bib and white
// paws, a red scarf, and a big bushy striped tail. Every pose is drawn
// around the feet (0, 0), facing right. Pure drawing: reads the cat,
// never changes it.
// ---------------------------------------------------------------------------

const CAT = {
  line: '#3b2416',
  base: '#c99a6b',
  light: '#e8c9a0',
  cream: '#f3e2c4',
  stripe: '#6e4327',
  white: '#fffaf1',
  pink: '#f29bb0',
  iris: '#a6d15a',
  scarf: '#e63946',
  scarfDark: '#b5232f',
};
const CAT_SCALE = 1.22;

// A fluffy ellipse: every other point pokes out as a fur tuft, but only
// inside the given angle ranges (radians, 0 = right, y down).
function furPath(ctx, cx, cy, rx, ry, rot, tuft, ranges, ph = 0, n = 20) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  ctx.beginPath();
  for (let i = 0; i <= n * 2; i++) {
    const a = -Math.PI + (i / (n * 2)) * Math.PI * 2;
    let k = 1;
    if (i % 2 === 1 && ranges.some(([a0, a1]) => a >= a0 && a <= a1)) {
      k = 1 + tuft * (0.7 + 0.45 * Math.sin(ph + i * 1.9));
    }
    const px = Math.cos(a) * rx * k;
    const py = Math.sin(a) * ry * k;
    const X = cx + px * c - py * s;
    const Y = cy + px * s + py * c;
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  }
  ctx.closePath();
}

// Draw a list of silhouette shapes with one shared outline: first every
// shape stroked thick in the line colour, then every shape filled.
function silhouette(ctx, shapes, lw) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const sh of shapes) {
    sh.path();
    ctx.strokeStyle = CAT.line;
    ctx.lineWidth = (sh.lw || 0) + lw;
    ctx.stroke();
  }
  for (const sh of shapes) {
    sh.path();
    if (sh.stroke) {
      ctx.strokeStyle = sh.color;
      ctx.lineWidth = sh.lw;
      ctx.stroke();
    } else {
      ctx.fillStyle = sh.color;
      ctx.fill();
    }
  }
}

function tailPath(ctx, x0, y0, cx, cy, x1, y1) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
}

function drawEye(ctx, x, y, open, look) {
  if (open < 0.25) {
    ctx.strokeStyle = CAT.line;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(x, y - 1, 3.2, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = CAT.line;
  ctx.beginPath();
  ctx.ellipse(x, y, 3.6, 4.2 * open, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CAT.iris;
  ctx.beginPath();
  ctx.ellipse(x, y, 2.8, 3.4 * open, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d140e';
  ctx.beginPath();
  ctx.ellipse(x + look, y, 1.2, 2.8 * open, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + look + 0.9, y - 1.4 * open, 1, 0, Math.PI * 2);
  ctx.fill();
}

function catBlink(t, ph = 0) {
  // A quick blink every few seconds.
  const k = (t * 0.31 + ph) % 1;
  return k < 0.04 ? 0.1 : 1;
}

// The running / jumping cat, side view.
function drawCatRun(ctx, pose, t) {
  const { phase, air, rise, fall, pouncing, speed } = pose;
  const sw = Math.sin(phase);
  const bob = air ? 0 : -Math.abs(Math.cos(phase)) * 2.5;
  const tilt = pouncing ? -0.04 : rise ? -0.16 : fall ? 0.1 : 0;
  const earBack = pouncing || rise ? 1 : fall ? 0.5 : 0.15 + 0.1 * sw;
  const wagAmp = 3 + Math.min(10, speed / 60) + (pouncing ? 6 : 0);
  const wag = Math.sin(t * 7 + phase * 0.5) * wagAmp;
  const tailLift = pouncing ? 6 : rise ? -20 : fall ? -10 : 0;

  // Leg targets: hip / shoulder anchors and paw positions.
  const hip = [-14, -19];
  const sho = [13, -19];
  let legs;
  if (pouncing) {
    legs = { fn: [31, -14], ff: [27, -10], bn: [-33, -9], bf: [-29, -6] };
  } else if (rise) {
    legs = { fn: [24, -8], ff: [19, -5], bn: [-28, -4], bf: [-24, -2] };
  } else if (fall) {
    legs = { fn: [20, 0], ff: [15, -1], bn: [-10, 0], bf: [-15, -1] };
  } else {
    // Gallop: front pair and back pair swing opposite, with a lift.
    const f = (k) => [sho[0] + Math.sin(phase + k) * 11, -Math.max(0, Math.cos(phase + k)) * 7];
    const r = (k) => [hip[0] + Math.sin(phase + k + Math.PI) * 11, -Math.max(0, Math.cos(phase + k + Math.PI)) * 7];
    const fn = f(0);
    const ff = f(0.9);
    const bn = r(0);
    const bf = r(0.9);
    legs = { fn, ff, bn, bf };
  }

  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(tilt);

  // Far legs (darker), behind everything.
  const leg = (from, to, near) => ({
    path: () => {
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1] - 3);
    },
    stroke: true,
    lw: 8.5,
    color: near ? CAT.base : '#a87c52',
  });
  const paw = (p) => ({
    path: () => {
      ctx.beginPath();
      ctx.ellipse(p[0] + 1.5, p[1] - 2.5, 5, 3.6, 0, 0, Math.PI * 2);
    },
    color: CAT.white,
  });

  // Tail: thick bushy stroke, striped, with a plume at the tip.
  const tx1 = -50;
  const ty1 = -42 + tailLift + wag;
  const tcx = -44;
  const tcy = -22 + tailLift * 0.4 + wag * 0.4;
  const tail = { path: () => tailPath(ctx, -20, -26, tcx, tcy, tx1, ty1), stroke: true, lw: 15, color: CAT.base };
  const plume = {
    path: () => furPath(ctx, tx1 - 1, ty1 - 2, 10, 8, Math.atan2(ty1 - tcy, tx1 - tcx), 0.35, [[-Math.PI, Math.PI]], t * 6, 12),
    color: CAT.base,
  };
  const body = {
    path: () => furPath(ctx, 0, -24, 25, 13.5, 0, 0.22, [[-Math.PI, -0.35], [0.5, 2.7]], phase * 0.9, 22),
    color: CAT.base,
  };
  const ruff = {
    path: () => furPath(ctx, 17, -27, 14, 13, 0.2, 0.28, [[-Math.PI, Math.PI]], phase * 0.7 + 1, 16),
    color: CAT.light,
  };
  const head = { path: () => { ctx.beginPath(); ctx.arc(24, -33, 12.5, 0, Math.PI * 2); }, color: CAT.base };
  const ear = (bx, by, bx2, by2, tx, ty) => ({
    path: () => {
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(tx - earBack * 7, ty + earBack * 6);
      ctx.lineTo(bx2, by2);
      ctx.closePath();
    },
    color: CAT.base,
  });
  const earB = ear(14, -38, 22, -43, 13, -54);
  const earF = ear(24, -44, 33, -38, 31, -55);

  silhouette(ctx, [
    leg(sho, legs.ff, false), paw(legs.ff), leg(hip, legs.bf, false), paw(legs.bf),
    tail, plume, body, leg(sho, legs.fn, true), paw(legs.fn), leg(hip, legs.bn, true), paw(legs.bn),
    ruff, earB, earF, head,
  ], 3.2);

  // Tail stripes.
  ctx.save();
  tailPath(ctx, -20, -26, tcx, tcy, tx1, ty1);
  ctx.setLineDash([4, 6]);
  ctx.lineDashOffset = 2;
  ctx.strokeStyle = CAT.stripe;
  ctx.lineWidth = 15;
  ctx.lineCap = 'butt';
  ctx.stroke();
  ctx.restore();
  // Tail plume tip, lighter.
  ctx.fillStyle = CAT.light;
  ctx.beginPath();
  ctx.ellipse(tx1 - 3, ty1 - 3, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body markings, clipped to the body: cream belly, tabby stripes.
  ctx.save();
  furPath(ctx, 0, -24, 25, 13.5, 0, 0.22, [[-Math.PI, -0.35], [0.5, 2.7]], phase * 0.9, 22);
  ctx.clip();
  ctx.fillStyle = CAT.cream;
  ctx.beginPath();
  ctx.ellipse(2, -13, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = CAT.stripe;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const sx = -17 + i * 8.5;
    const flow = Math.sin(phase + i) * 1.5;
    ctx.beginPath();
    ctx.moveTo(sx + 2 + flow, -40);
    ctx.quadraticCurveTo(sx - 3, -30, sx + 1, -21);
    ctx.stroke();
  }
  // A darker saddle along the spine.
  ctx.fillStyle = 'rgba(110, 67, 39, 0.35)';
  ctx.beginPath();
  ctx.ellipse(-3, -36, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // White bib (chest fluff) between the front legs.
  ctx.fillStyle = CAT.white;
  furPath(ctx, 16, -20, 8, 9, 0, 0.3, [[0.2, 2.8]], phase, 12);
  ctx.fill();

  // Ruff markings and the scarf over it.
  ctx.fillStyle = CAT.cream;
  furPath(ctx, 20, -23, 9, 7, 0.2, 0.3, [[0.3, 2.8]], phase + 2, 12);
  ctx.fill();
  const flut = Math.sin(t * 9) * 3 + (pouncing ? 5 : 0) + (rise ? -3 : 0);
  ctx.strokeStyle = CAT.scarf;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(12, -25);
  ctx.quadraticCurveTo(20, -21, 30, -24);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(13, -24);
  ctx.quadraticCurveTo(2, -22 + flut, -9, -27 + flut);
  ctx.stroke();
  ctx.fillStyle = CAT.scarf;
  ctx.beginPath();
  ctx.moveTo(-9, -30 + flut);
  ctx.lineTo(-16, -25 + flut * 1.3);
  ctx.lineTo(-8, -23 + flut);
  ctx.closePath();
  ctx.fill();

  // Ears: pink inside and lynx tufts.
  ctx.fillStyle = CAT.pink;
  ctx.beginPath();
  ctx.moveTo(16, -40);
  ctx.lineTo(14.5 - earBack * 6, -50 + earBack * 5);
  ctx.lineTo(20.5, -43);
  ctx.closePath();
  ctx.moveTo(26, -43);
  ctx.lineTo(30.5 - earBack * 6, -51 + earBack * 5);
  ctx.lineTo(31.5, -39);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = CAT.stripe;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(13 - earBack * 7, -54 + earBack * 6);
  ctx.lineTo(12 - earBack * 8, -59 + earBack * 7);
  ctx.moveTo(31 - earBack * 7, -55 + earBack * 6);
  ctx.lineTo(31 - earBack * 8, -60 + earBack * 7);
  ctx.stroke();

  // Face: forehead "M" stripes, cheek stripes, white muzzle.
  ctx.strokeStyle = CAT.stripe;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(19, -44);
  ctx.lineTo(20, -39);
  ctx.moveTo(23.5, -45.5);
  ctx.lineTo(23.5, -40);
  ctx.moveTo(28, -44);
  ctx.lineTo(27, -39.5);
  ctx.moveTo(13, -34);
  ctx.quadraticCurveTo(16, -32, 18, -33);
  ctx.moveTo(13, -30);
  ctx.quadraticCurveTo(16, -29, 18, -29.5);
  ctx.stroke();
  ctx.fillStyle = CAT.white;
  ctx.beginPath();
  ctx.ellipse(31, -28.5, 6.5, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(27, -25, 5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  const open = pose.hurt ? 0.1 : catBlink(t);
  drawEye(ctx, 21.5, -34.5, open, 0.6);
  drawEye(ctx, 30, -35, open, 0.6);
  ctx.fillStyle = CAT.pink;
  ctx.beginPath();
  ctx.moveTo(34, -31);
  ctx.lineTo(37.5, -31);
  ctx.lineTo(35.6, -28.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(59, 36, 22, 0.75)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(35.5, -28.5);
  ctx.quadraticCurveTo(34.5, -26, 33, -26.5);
  ctx.moveTo(35.5, -28.5);
  ctx.quadraticCurveTo(36.5, -26, 38, -26.5);
  ctx.moveTo(36, -29.5);
  ctx.lineTo(47, -32);
  ctx.moveTo(36, -28);
  ctx.lineTo(47, -27);
  ctx.stroke();

  ctx.restore();
}

// The sitting cat for the title and the finale: tail curled round the
// paws, slow blinks, and now and then a big yawn or a happy squint.
export function drawCatSit(ctx, x, y, s, t, mood) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // Soft shadow.
  ctx.fillStyle = 'rgba(30, 15, 30, 0.28)';
  ctx.beginPath();
  ctx.ellipse(2, 0, 30, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const cyc = (t % 7.5) / 7.5;
  const yawn = mood === 'happy' ? 0 : Math.max(0, Math.sin(Math.min(1, Math.max(0, (cyc - 0.62) / 0.2)) * Math.PI));
  const breathe = Math.sin(t * 2.2) * 0.6;
  const tip = Math.sin(t * 2.4) * 3;
  const headTilt = -yawn * 0.12 + Math.sin(t * 0.9) * 0.03;

  const body = {
    path: () => furPath(ctx, -3, -22 - breathe * 0.5, 20, 21 + breathe * 0.5, 0, 0.18, [[-Math.PI, -1.2], [2.0, Math.PI]], t * 1.5, 18),
    color: CAT.base,
  };
  const tail = {
    path: () => {
      ctx.beginPath();
      ctx.moveTo(-14, -9);
      ctx.bezierCurveTo(-44, -12, -36, 6, -6, 1);
      ctx.quadraticCurveTo(14, -1, 24 + tip * 0.3, -7 + tip);
    },
    stroke: true,
    lw: 13,
    color: CAT.base,
  };
  const legs = [
    { path: () => { ctx.beginPath(); ctx.moveTo(1, -24); ctx.lineTo(1, -4); }, stroke: true, lw: 9, color: CAT.base },
    { path: () => { ctx.beginPath(); ctx.moveTo(12, -24); ctx.lineTo(12, -4); }, stroke: true, lw: 9, color: CAT.base },
  ];
  const ruff = { path: () => furPath(ctx, 5, -38, 16, 11, 0, 0.18, [[-Math.PI, Math.PI]], t * 1.2, 18), color: CAT.light };
  const head = { path: () => furPath(ctx, 6, -52, 15.5, 13.5, 0, 0.16, [[0.3, 2.85]], t, 16), color: CAT.base };
  const earL = { path: () => { ctx.beginPath(); ctx.moveTo(-8, -56); ctx.lineTo(-7, -73); ctx.lineTo(3, -63); ctx.closePath(); }, color: CAT.base };
  const earR = { path: () => { ctx.beginPath(); ctx.moveTo(9, -63); ctx.lineTo(19, -73); ctx.lineTo(20, -56); ctx.closePath(); }, color: CAT.base };

  silhouette(ctx, [body, tail, ...legs, ruff], 3);

  // Body stripes and tail stripes.
  ctx.save();
  furPath(ctx, -3, -22 - breathe * 0.5, 20, 21 + breathe * 0.5, 0, 0.18, [[-Math.PI, -1.2], [2.0, Math.PI]], t * 1.5, 18);
  ctx.clip();
  ctx.strokeStyle = CAT.stripe;
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-24 + i * 2, -34 + i * 7);
    ctx.quadraticCurveTo(-14 + i * 2, -30 + i * 7, -8 + i * 2, -33 + i * 7);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-14, -9);
  ctx.bezierCurveTo(-44, -12, -36, 6, -6, 1);
  ctx.quadraticCurveTo(14, -1, 24 + tip * 0.3, -7 + tip);
  ctx.setLineDash([5, 6]);
  ctx.lineCap = 'butt';
  ctx.strokeStyle = CAT.stripe;
  ctx.lineWidth = 13;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = CAT.light;
  ctx.beginPath();
  ctx.ellipse(25 + tip * 0.3, -8 + tip, 5, 4, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // White bib and white socks.
  ctx.fillStyle = CAT.white;
  furPath(ctx, 6, -24, 9, 13, 0, 0.25, [[-Math.PI, Math.PI]], t, 14);
  ctx.fill();
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.strokeStyle = CAT.white;
  ctx.beginPath();
  ctx.moveTo(1, -12);
  ctx.lineTo(1, -4);
  ctx.moveTo(12, -12);
  ctx.lineTo(12, -4);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(59, 36, 22, 0.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const px of [1, 12]) {
    ctx.moveTo(px - 1.5, -1);
    ctx.lineTo(px - 1.5, -3.5);
    ctx.moveTo(px + 1.5, -1);
    ctx.lineTo(px + 1.5, -3.5);
  }
  ctx.stroke();

  // Head, tilted for the yawn.
  ctx.save();
  ctx.translate(6, -50);
  ctx.rotate(headTilt);
  ctx.translate(-6, 50);
  silhouette(ctx, [earL, earR, head], 3);
  ctx.fillStyle = CAT.pink;
  ctx.beginPath();
  ctx.moveTo(-5.5, -59);
  ctx.lineTo(-5, -69);
  ctx.lineTo(1, -62);
  ctx.closePath();
  ctx.moveTo(11, -62);
  ctx.lineTo(17, -69);
  ctx.lineTo(17.5, -59);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = CAT.stripe;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-7, -73);
  ctx.lineTo(-8, -78);
  ctx.moveTo(19, -73);
  ctx.lineTo(20, -78);
  ctx.stroke();
  // Forehead "M" and cheek stripes.
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(1, -64);
  ctx.lineTo(2, -58.5);
  ctx.moveTo(6, -65.5);
  ctx.lineTo(6, -59);
  ctx.moveTo(11, -64);
  ctx.lineTo(10, -58.5);
  ctx.moveTo(-9, -51);
  ctx.lineTo(-4, -50);
  ctx.moveTo(-9, -47);
  ctx.lineTo(-4, -47);
  ctx.moveTo(21, -51);
  ctx.lineTo(16, -50);
  ctx.moveTo(21, -47);
  ctx.lineTo(16, -47);
  ctx.stroke();
  // Muzzle.
  ctx.fillStyle = CAT.white;
  ctx.beginPath();
  ctx.ellipse(2.5, -45, 5.5, 4.5, 0, 0, Math.PI * 2);
  ctx.ellipse(9.5, -45, 5.5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eyes: closed in a yawn, happy squint on the finale.
  if (mood === 'happy') {
    ctx.strokeStyle = CAT.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -52, 3.4, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.moveTo(15.4, -52);
    ctx.arc(12, -52, 3.4, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  } else {
    const open = yawn > 0.3 ? 0.1 : catBlink(t, 0.5);
    drawEye(ctx, 0, -52, open, 0.4);
    drawEye(ctx, 12, -52, open, -0.4);
  }
  // Nose and mouth (open wide in a yawn).
  ctx.fillStyle = CAT.pink;
  ctx.beginPath();
  ctx.moveTo(4, -48);
  ctx.lineTo(8, -48);
  ctx.lineTo(6, -45.5);
  ctx.closePath();
  ctx.fill();
  if (yawn > 0.05) {
    ctx.fillStyle = '#7a2e3a';
    ctx.beginPath();
    ctx.ellipse(6, -40.5, 3.2 + yawn * 1.5, 1 + yawn * 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CAT.pink;
    ctx.beginPath();
    ctx.ellipse(6, -38.5 + yawn, 2.2 + yawn, 1 + yawn * 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(59, 36, 22, 0.8)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(6, -45.5);
    ctx.quadraticCurveTo(5, -42.5, 3, -43);
    ctx.moveTo(6, -45.5);
    ctx.quadraticCurveTo(7, -42.5, 9, -43);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(59, 36, 22, 0.6)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-1, -45);
  ctx.lineTo(-13, -47);
  ctx.moveTo(-1, -43.5);
  ctx.lineTo(-13, -42.5);
  ctx.moveTo(13, -45);
  ctx.lineTo(25, -47);
  ctx.moveTo(13, -43.5);
  ctx.lineTo(25, -42.5);
  ctx.stroke();
  ctx.restore();

  // Red scarf with a knot.
  ctx.strokeStyle = CAT.scarf;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -38);
  ctx.quadraticCurveTo(6, -32, 20, -38);
  ctx.stroke();
  ctx.fillStyle = CAT.scarfDark;
  ctx.beginPath();
  ctx.moveTo(13, -36);
  ctx.lineTo(18, -24 + Math.sin(t * 3) * 1.5);
  ctx.lineTo(22, -26 + Math.sin(t * 3) * 1.5);
  ctx.lineTo(17, -37);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCat(ctx, cat, camX, t) {
  const fx = cat.x - camX + cat.w / 2;
  const fy = cat.y + cat.h;
  const air = !cat.grounded;
  const pose = {
    phase: cat.runPhase,
    air,
    rise: air && cat.vy < -120,
    fall: air && cat.vy > 160,
    pouncing: cat.pounceT > 0,
    speed: Math.abs(cat.vx),
    hurt: cat.invuln > 1.0,
  };
  ctx.save();
  ctx.translate(fx, fy);
  ctx.scale(CAT_SCALE, CAT_SCALE);
  if (cat.invuln > 0 && Math.floor(t * 14) % 2 === 0) ctx.globalAlpha = 0.45;
  // Landing squash, anchored at the feet so the paws stay planted.
  const sq = Math.max(0, cat.squash);
  let sx = 1 + sq * 0.3;
  let sy = 1 - sq * 0.3;
  if (pose.rise) {
    sx *= 0.93;
    sy *= 1.09;
  } else if (pose.fall) {
    sx *= 0.97;
    sy *= 0.96;
  } else if (pose.pouncing) {
    sx *= 1.12;
    sy *= 0.92;
  }
  ctx.scale(sx, sy);
  // Double-jump somersault around the body centre, eased, ending upright.
  if (cat.flip > 0) {
    const e = 1 - cat.flip;
    ctx.translate(0, -24);
    ctx.rotate(e * e * (3 - 2 * e) * Math.PI * 2);
    ctx.translate(0, 24);
  }
  drawCatRun(ctx, pose, t);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

function drawHud(ctx, game, highScore, t) {
  const run = game.run;
  const level = game.level;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Hearts.
  for (let i = 0; i < 3; i++) {
    const hx = 28 + i * 36;
    const hy = 34;
    ctx.fillStyle = i < run.hearts ? '#ff4d6d' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(hx, hy + 8);
    ctx.bezierCurveTo(hx - 12, hy - 4, hx - 6, hy - 14, hx, hy - 6);
    ctx.bezierCurveTo(hx + 6, hy - 14, hx + 12, hy - 4, hx, hy + 8);
    ctx.fill();
  }
  // Score and fish.
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 30px ${FONT}`;
  ctx.shadowColor = 'rgba(40,20,40,0.7)';
  ctx.shadowBlur = 6;
  ctx.fillText(String(run.score).padStart(6, '0'), 24, 78);
  ctx.shadowBlur = 0;
  drawFish(ctx, 40, 102, 0.8);
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(`x ${run.fish}`, 58, 109);

  // Level name and progress bar, top centre.
  ctx.textAlign = 'center';
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(40,20,40,0.7)';
  ctx.shadowBlur = 6;
  ctx.fillText(`${level.def.sub}  ·  ${level.def.name}`, VIEW_W / 2, 34);
  ctx.shadowBlur = 0;
  const prog = Math.max(0, Math.min(1, game.cat.x / level.length));
  ctx.fillStyle = 'rgba(20, 10, 30, 0.45)';
  ctx.fillRect(VIEW_W / 2 - 130, 46, 260, 10);
  ctx.fillStyle = level.def.palette.accent;
  ctx.fillRect(VIEW_W / 2 - 130, 46, 260 * prog, 10);
  // Moon gate marker at the end of the bar.
  ctx.fillStyle = '#ffe66d';
  ctx.beginPath();
  ctx.arc(VIEW_W / 2 + 130, 51, 7, 0, Math.PI * 2);
  ctx.fill();

  // Combo ring.
  const cx = VIEW_W / 2 + 210;
  const cy = 40;
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.stroke();
  if (run.mult > 1) {
    ctx.strokeStyle = '#ffb703';
    ctx.beginPath();
    ctx.arc(cx, cy, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (run.comboT / 2.5));
    ctx.stroke();
  }
  ctx.fillStyle = run.mult > 1 ? '#ffb703' : 'rgba(255,255,255,0.75)';
  ctx.font = `bold ${run.mult > 1 ? 20 : 16}px ${FONT}`;
  ctx.fillText(`x${run.mult}`, cx, cy + 6);

  // High score and pounce cooldown, top right.
  ctx.textAlign = 'right';
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`BEST  ${Math.max(highScore, run.score)}`, VIEW_W - 24, 32);
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('POUNCE', VIEW_W - 24, 58);
  ctx.fillStyle = 'rgba(20, 10, 30, 0.45)';
  ctx.fillRect(VIEW_W - 164, 64, 140, 8);
  const cd = 1 - Math.max(0, game.cat.pounceCd) / 1.0;
  ctx.fillStyle = cd >= 1 ? '#7ef9ff' : '#ffb703';
  ctx.fillRect(VIEW_W - 164, 64, 140 * cd, 8);
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(24, 12, 34, 0.82)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawTitle(ctx, game, t) {
  ctx.fillStyle = 'rgba(30, 12, 40, 0.25)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Popcorn herself, sitting on a rooftop to the left of the menu.
  const roof = roofAt(game, game.titlePan, 170);
  drawCatSit(ctx, 170, roof === null ? 560 : roof, 2.3, t, '');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(40,20,40,0.8)';
  ctx.shadowBlur = 12;
  ctx.font = `bold 74px ${FONT}`;
  ctx.fillText('Popcorn', VIEW_W / 2, 168);
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillStyle = '#ffd166';
  ctx.fillText('ROOFTOP RUN', VIEW_W / 2, 220);
  ctx.shadowBlur = 0;
  ctx.font = `22px ${FONT}`;
  ctx.fillStyle = '#fff3e0';
  ctx.fillText(TEXT.tagline, VIEW_W / 2, 262);
  ctx.fillStyle = '#ffe66d';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(TEXT.goal, VIEW_W / 2, 296);

  panel(ctx, VIEW_W / 2 - 330, 330, 660, 190);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText('HOW TO PLAY', VIEW_W / 2, 362);
  ctx.font = `19px ${FONT}`;
  ctx.textAlign = 'left';
  const rows = [
    ['Jump (hold = higher)', 'SPACE / W / ↑ / Click'],
    ['Double jump in the air', 'Press jump again'],
    ['Pounce dash (smashes crows)', 'SHIFT / S / ↓ / Right-click'],
    ['Pause · Restart · Mute', 'P / Esc · R · M'],
  ];
  rows.forEach((r, i) => {
    ctx.fillStyle = '#ffe66d';
    ctx.fillText(r[0], VIEW_W / 2 - 300, 396 + i * 28);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(r[1], VIEW_W / 2 - 20, 396 + i * 28);
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 24px ${FONT}`;
  const blink = Math.sin(t * 4) > -0.2;
  if (blink) ctx.fillText(TEXT.begin, VIEW_W / 2, 580);
  ctx.font = `17px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('Eat Golden Fish for combos · Stomp crows or pounce them · Ring the Moon Bells', VIEW_W / 2, 616);
  ctx.fillText('Warm milk restores a heart · Reach the Moon Gate to finish each night', VIEW_W / 2, 642);
}

function drawCard(ctx, game) {
  ctx.fillStyle = 'rgba(30, 12, 40, 0.35)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(40,20,40,0.8)';
  ctx.shadowBlur = 10;
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillStyle = '#ffd166';
  ctx.fillText(game.level.def.sub.toUpperCase(), VIEW_W / 2, 300);
  ctx.font = `bold 62px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(game.level.def.name, VIEW_W / 2, 372);
  ctx.shadowBlur = 0;
  ctx.font = `21px ${FONT}`;
  ctx.fillStyle = '#fff3e0';
  ctx.fillText('Reach the Moon Gate at the end of the rooftops.', VIEW_W / 2, 420);
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(20, 10, 30, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 56px ${FONT}`;
  ctx.fillText(TEXT.paused, VIEW_W / 2, 330);
  ctx.font = `20px ${FONT}`;
  ctx.fillText('P / Esc to resume · R to restart the night', VIEW_W / 2, 380);
}

function drawLevelClear(ctx, game) {
  const run = game.run;
  const b = game.levelBonus || { hearts: 0, purrfect: 0, purrfectFlag: false };
  panel(ctx, VIEW_W / 2 - 280, 170, 560, 330);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillText(TEXT.levelClear, VIEW_W / 2, 232);
  if (b.purrfectFlag) {
    ctx.fillStyle = '#ff8fab';
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText(TEXT.purrfect, VIEW_W / 2, 272);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `22px ${FONT}`;
  const y0 = b.purrfectFlag ? 306 : 286;
  ctx.fillText(`Level score   ${run.levelScore}`, VIEW_W / 2, y0);
  ctx.fillText(`Heart bonus   +${b.hearts}`, VIEW_W / 2, y0 + 34);
  if (b.purrfect) ctx.fillText(`Purrfect bonus   +${b.purrfect}`, VIEW_W / 2, y0 + 68);
  ctx.font = `bold 26px ${FONT}`;
  ctx.fillStyle = '#ffe66d';
  ctx.fillText(`Total   ${run.score}`, VIEW_W / 2, y0 + 108);
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  if (Math.sin(performance.now() / 300) > -0.2) {
    ctx.fillText(game.run.levelIndex + 1 >= LEVELS.length ? TEXT.again : 'Press SPACE for the next night', VIEW_W / 2, 462);
  }
}

function drawGameOver(ctx, game, highScore) {
  ctx.fillStyle = 'rgba(20, 8, 24, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, VIEW_W / 2 - 280, 200, 560, 280);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff4d6d';
  ctx.font = `bold 52px ${FONT}`;
  ctx.fillText(TEXT.gameOver, VIEW_W / 2, 272);
  ctx.fillStyle = '#ffffff';
  ctx.font = `24px ${FONT}`;
  ctx.fillText(`Score   ${game.run.score}`, VIEW_W / 2, 330);
  ctx.fillText(`Best   ${Math.max(highScore, game.run.score)}`, VIEW_W / 2, 366);
  ctx.fillText(`Golden Fish   ${game.run.fish}  ·  Crows   ${game.run.crowsDown}`, VIEW_W / 2, 402);
  ctx.font = `bold 22px ${FONT}`;
  if (Math.sin(performance.now() / 300) > -0.2) {
    ctx.fillText(TEXT.retry, VIEW_W / 2, 452);
  }
}

function drawComplete(ctx, game, highScore, t) {
  const run = game.run;
  const stars = starsFor(game);
  ctx.fillStyle = 'rgba(20, 8, 30, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const roof = roofAt(game, game.camX, 170);
  drawCatSit(ctx, 170, roof === null ? 560 : Math.min(roof, 640), 2.3, t, 'happy');
  panel(ctx, VIEW_W / 2 - 300, 130, 600, 440);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = `bold 46px ${FONT}`;
  ctx.fillText(TEXT.allClear, VIEW_W / 2, 196);
  // Stars.
  for (let i = 0; i < 3; i++) {
    const sx = VIEW_W / 2 + (i - 1) * 74;
    ctx.fillStyle = i < stars ? '#ffd166' : 'rgba(255,255,255,0.22)';
    drawStar(ctx, sx, 252, 26);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillText(`Score   ${run.score}`, VIEW_W / 2, 316);
  ctx.font = `21px ${FONT}`;
  const rows = [
    `Golden Fish  ${run.fish}      Crows smashed  ${run.crowsDown}`,
    `Moon Bells  ${run.bells}      Best combo  x${run.maxCombo}`,
    `Time  ${fmtTime(run.time)}      Best  ${Math.max(highScore, run.score)}`,
  ];
  rows.forEach((r, i) => ctx.fillText(r, VIEW_W / 2, 356 + i * 30));
  ctx.font = `bold 22px ${FONT}`;
  if (Math.sin(performance.now() / 300) > -0.2) {
    ctx.fillText(TEXT.again, VIEW_W / 2, 528);
  }
}

function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
}
