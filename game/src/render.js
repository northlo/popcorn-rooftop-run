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
    kites.push({ x: 600 + i * 1700 + int(rng, -200, 200), y: range(rng, 130, 260), c: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'][i % 5], ph: rng() * Math.PI * 2 });
  }
  game._decor = { level, far, mid, clouds, birds, stars, kites };
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
  const sunY = game.levelIndex === 2 ? 110 : 150;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = pal.sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, game.levelIndex === 2 ? 66 : 84, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, game.levelIndex === 2 ? 46 : 56, 0, Math.PI * 2);
  ctx.fill();
  if (game.levelIndex === 2) {
    ctx.fillStyle = 'rgba(180, 170, 220, 0.5)';
    ctx.beginPath();
    ctx.arc(sunX - 14, sunY - 8, 9, 0, Math.PI * 2);
    ctx.arc(sunX + 12, sunY + 14, 6, 0, Math.PI * 2);
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
    ctx.globalAlpha = 1;
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
  ctx.fillStyle = pal.far;
  for (const b of d.far) {
    const bx = b.x - camX * 0.2;
    if (bx < -160 || bx > VIEW_W + 40) continue;
    ctx.fillRect(bx, 560 - b.h, b.w, b.h + 200);
    ctx.beginPath();
    ctx.moveTo(bx, 560 - b.h);
    ctx.lineTo(bx + b.w / 2, 560 - b.h - 26);
    ctx.lineTo(bx + b.w, 560 - b.h);
    ctx.closePath();
    ctx.fill();
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
      ctx.save();
      ctx.translate(kx + sway, ky);
      ctx.rotate(Math.sin(t * 1.3 + k.ph) * 0.25);
      ctx.fillStyle = k.c;
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(15, 0);
      ctx.lineTo(0, 20);
      ctx.lineTo(-15, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(15, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
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
      const cols = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#ff9e57'];
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
  if (game.screen === 'complete') drawComplete(ctx, game, highScore);
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
    drawFish(ctx, fx0, fy, 1);
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

  drawCat(ctx, cat, camX, t);
}

function drawFish(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
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

function drawCat(ctx, cat, camX, t) {
  const x = cat.x - camX + cat.w / 2;
  const y = cat.y + cat.h / 2;
  const running = cat.grounded;
  const legSwing = running ? Math.sin(cat.runPhase) : 0.4;
  ctx.save();
  ctx.translate(x, y);
  if (cat.flip > 0) ctx.rotate((1 - cat.flip) * Math.PI * 1.6);
  const sq = cat.squash;
  ctx.scale(1 + sq * 0.22, 1 - sq * 0.26);
  if (cat.invuln > 0 && Math.floor(t * 14) % 2 === 0) ctx.globalAlpha = 0.4;
  const pouncing = cat.pounceT > 0;

  // Tail: fluffy, waving.
  ctx.strokeStyle = '#f4a259';
  ctx.lineCap = 'round';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-20, 2);
  const wag = Math.sin(t * 6 + cat.runPhase) * 6;
  ctx.quadraticCurveTo(-34, -6 + wag, -40, -16 + wag);
  ctx.stroke();
  ctx.strokeStyle = '#fff8e7';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-20, 2);
  ctx.quadraticCurveTo(-34, -6 + wag, -40, -16 + wag);
  ctx.stroke();

  // Back legs and front legs (run cycle).
  ctx.fillStyle = '#f4a259';
  const l1 = legSwing * 7;
  const l2 = -legSwing * 7;
  ctx.beginPath();
  ctx.ellipse(-12, 14 + Math.max(0, -l1) * 0.4, 7, 9, 0.3, 0, Math.PI * 2);
  ctx.ellipse(10, 14 + Math.max(0, -l2) * 0.4, 7, 9, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff8e7';
  ctx.beginPath();
  ctx.ellipse(-12 + l1 * 0.5, 15, 6, 8, 0.2, 0, Math.PI * 2);
  ctx.ellipse(10 + l2 * 0.5, 15, 6, 8, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Body: cream with an orange patch.
  ctx.fillStyle = '#fff8e7';
  ctx.beginPath();
  ctx.ellipse(0, 4, 24, 15, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4a259';
  ctx.beginPath();
  ctx.ellipse(-8, 0, 10, 7, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Head.
  ctx.fillStyle = '#fff8e7';
  ctx.beginPath();
  ctx.arc(16, -12, 14, 0, Math.PI * 2);
  ctx.fill();
  // Ears.
  ctx.fillStyle = '#f4a259';
  ctx.beginPath();
  ctx.moveTo(6, -20);
  ctx.lineTo(9, -32);
  ctx.lineTo(16, -22);
  ctx.closePath();
  ctx.moveTo(20, -23);
  ctx.lineTo(26, -33);
  ctx.lineTo(29, -21);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffb3c1';
  ctx.beginPath();
  ctx.moveTo(9, -22);
  ctx.lineTo(10, -28);
  ctx.lineTo(14, -22);
  ctx.closePath();
  ctx.moveTo(22, -24);
  ctx.lineTo(25, -29);
  ctx.lineTo(27, -22);
  ctx.closePath();
  ctx.fill();
  // Orange patch over one eye.
  ctx.fillStyle = '#f4a259';
  ctx.beginPath();
  ctx.arc(21, -16, 6, 0, Math.PI * 2);
  ctx.fill();
  // Eyes.
  ctx.fillStyle = '#2b2b3a';
  const blink = Math.sin(t * 0.7) > 0.97 ? 0.3 : 1;
  ctx.beginPath();
  ctx.ellipse(12, -13, 2.2, 2.6 * blink, 0, 0, Math.PI * 2);
  ctx.ellipse(23, -14, 2.2, 2.6 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  // Nose and whiskers.
  ctx.fillStyle = '#e07a9a';
  ctx.beginPath();
  ctx.moveTo(28, -8);
  ctx.lineTo(32, -8);
  ctx.lineTo(30, -5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(90, 70, 80, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, -9);
  ctx.lineTo(38, -12);
  ctx.moveTo(28, -7);
  ctx.lineTo(38, -6);
  ctx.stroke();

  // Red scarf, fluttering.
  ctx.strokeStyle = '#e63946';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(4, -2);
  ctx.quadraticCurveTo(14, 2, 20, 0);
  ctx.stroke();
  const flut = Math.sin(t * 8) * 5 + (pouncing ? 6 : 0);
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.quadraticCurveTo(-8, 2 + flut, -18, -2 + flut);
  ctx.stroke();
  ctx.fillStyle = '#e63946';
  ctx.beginPath();
  ctx.moveTo(-18, -2 + flut);
  ctx.lineTo(-24, 2 + flut);
  ctx.lineTo(-18, 6 + flut);
  ctx.closePath();
  ctx.fill();

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

function drawComplete(ctx, game, highScore) {
  const run = game.run;
  const stars = starsFor(game);
  ctx.fillStyle = 'rgba(20, 8, 30, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
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
