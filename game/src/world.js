// Simulation for Popcorn: Rooftop Run.
// Pure logic, no DOM: a fixed 1/60 s step, seeded level generation,
// collision, scoring, the screen state machine and the autopilot.
// main.js owns the canvas, the input listeners, audio and localStorage.

import { LEVELS, PHYSICS, SCORE, STEP, VIEW_W } from './config.js';
import { makeRng, int, range, chance } from './random.js';

const P = PHYSICS;

// ---------------------------------------------------------------------------
// Level generation (seeded: the same seed always builds the same level)
// ---------------------------------------------------------------------------

export function buildLevel(levelIndex, seed) {
  const def = LEVELS[levelIndex];
  const rng = makeRng(seed + levelIndex * 1013);
  const platforms = [];
  const chimneys = [];
  const fish = [];
  const bells = [];
  const crows = [];
  const awnings = [];
  let milk = null;

  let x = -100;
  let y = 560;
  // Opening safe stretch so the player finds their feet.
  platforms.push({ x: -100, y: 560, w: 1100, h: 200 });
  x = 1000;

  while (x < def.length) {
    const gap = int(rng, def.gapMin, def.gapMax);
    const w = int(rng, 280, 540);
    const ny = Math.max(460, Math.min(600, y + int(rng, -60, 60)));
    const px = x + gap;
    platforms.push({ x: px, y: ny, w, h: 200 });
    // Fish arc over the gap, most of the time.
    if (chance(rng, 0.62)) {
      const n = int(rng, 3, 5);
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        fish.push({
          x: x + 30 + t * (gap - 20),
          y: Math.min(y, ny) - 70 - Math.sin(t * Math.PI) * 55,
          taken: false, phase: rng() * Math.PI * 2,
        });
      }
    }
    // A Moon Bell hangs high over some gaps: it takes a timed double jump.
    if (chance(rng, 0.42)) {
      bells.push({ x: x + gap / 2, y: Math.min(y, ny) - 235, taken: false, phase: rng() * Math.PI * 2 });
    }
    // Bouncy awning across a gap (market level): land on it for a big hop.
    if (def.awnings && chance(rng, 0.35)) {
      awnings.push({ x: x + 6, y: 668, w: gap - 12 });
    }
    // Chimney on the new platform, leaving a clear landing zone at the
    // platform's left edge and room to land after it.
    if (chance(rng, def.chimneyChance)) {
      const cw = 46;
      const cx = px + int(rng, 180, Math.max(181, w - 200));
      const ch = int(rng, 70, 110);
      chimneys.push({ x: cx, y: ny - ch, w: cw, h: ch });
    }
    // A few fish resting on the platform.
    if (chance(rng, 0.5)) {
      const n = int(rng, 2, 4);
      for (let i = 0; i < n; i++) {
        fish.push({ x: px + 60 + i * 52, y: ny - 34, taken: false, phase: rng() * Math.PI * 2 });
      }
    }
    // A crow patrolling above the platform, at head height: jump over it
    // or pounce it. (Overhead crows proved a trap: they punished the
    // double jump a gap crossing needs, so every crow flies low now.)
    if (chance(rng, def.crowChance)) {
      crows.push({
        x: px + int(rng, 60, Math.max(61, w - 120)),
        baseY: ny - int(rng, 25, 35),
        y: 0, phase: rng() * Math.PI * 2,
        dive: def.diveCrows && chance(rng, 0.5),
        state: 'patrol', stateT: 0, vx: 0, vy: 0,
      });
    }
    x = px + w;
    y = ny;
  }

  // Final stretch with the Moon Gate.
  const gateX = x + 160;
  platforms.push({ x, y: 560, w: 700, h: 200 });
  // One bowl of warm milk per level, about two thirds in.
  const mid = platforms[Math.floor(platforms.length * 0.6)];
  if (mid) milk = { x: mid.x + mid.w / 2, y: mid.y - 30, taken: false };

  return {
    def, platforms, chimneys, fish, bells, crows, awnings, milk,
    gate: { x: gateX, y: 560 },
    length: gateX + 320,
  };
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export function createGame(seed = 7) {
  const game = {
    seed,
    screen: 'title', // title | card | play | pause | levelclear | gameover | complete
    screenT: 0,
    run: null,
    level: null,
    cat: null,
    camX: 0,
    events: [],
    titlePan: 0,
    levelIndex: 0,
  };
  game.level = buildLevel(0, seed);
  game.cat = freshCat(game.level);
  return game;
}

function freshCat(level) {
  return {
    x: 120, y: level.platforms[0].y - 40, vx: 0, vy: 0,
    w: 54, h: 40, grounded: true, coyote: 0, jumpBuf: 0,
    jumps: 0, jumpLock: 0, pounceT: 0, pounceCd: 0, invuln: 0, hurtT: 0,
    runPhase: 0, squash: 0, flip: 0, face: 1,
  };
}

function startRun(game) {
  game.run = {
    levelIndex: 0,
    score: 0, levelStartScore: 0,
    hearts: 3, fish: 0, crowsDown: 0, bells: 0,
    combo: 0, comboT: 0, mult: 1, maxCombo: 0,
    time: 0, levelTime: 0, deaths: 0, damageTaken: 0,
    levelDamage: 0, levelScore: 0,
  };
  loadLevel(game, 0);
  game.screen = 'card';
  game.screenT = 0;
}

function loadLevel(game, index) {
  game.levelIndex = index;
  game.level = buildLevel(index, game.seed);
  game.cat = freshCat(game.level);
  game.cat.x = 120;
  game.camX = 0;
  game.checkpoint = { x: 120, y: game.level.platforms[0].y };
  game.run.levelTime = 0;
  game.run.levelDamage = 0;
  game.run.levelScore = 0;
  game.run.levelStartScore = game.run.score;
  game.run.combo = 0;
  game.run.comboT = 0;
  game.run.mult = 1;
}

function hurt(game, cause) {
  const run = game.run;
  const cat = game.cat;
  if (cat.invuln > 0 || game.screen !== 'play') return;
  run.hearts -= 1;
  run.damageTaken += 1;
  run.levelDamage += 1;
  run.combo = 0;
  run.mult = 1;
  run.comboT = 0;
  cat.invuln = P.hurtInvuln;
  cat.hurtT = 0.35;
  cat.vy = -380;
  game.events.push({ t: 'hurt', x: cat.x, y: cat.y, cause });
  if (run.hearts <= 0) {
    game.screen = 'gameover';
    game.screenT = 0;
    game.events.push({ t: 'gameover' });
  }
}

function respawnAfterFall(game) {
  const run = game.run;
  const cat = game.cat;
  run.hearts -= 1;
  run.damageTaken += 1;
  run.levelDamage += 1;
  run.deaths += 1;
  run.combo = 0;
  run.mult = 1;
  run.comboT = 0;
  game.events.push({ t: 'fall', x: cat.x, y: cat.y });
  if (run.hearts <= 0) {
    game.screen = 'gameover';
    game.screenT = 0;
    game.events.push({ t: 'gameover' });
    return;
  }
  cat.x = game.checkpoint.x;
  cat.y = game.checkpoint.y - cat.h;
  cat.vx = 0;
  cat.vy = 0;
  cat.invuln = P.hurtInvuln;
  cat.pounceT = 0;
  cat.pounceCd = 0;
  game.camX = Math.max(0, cat.x - 380);
}

// ---------------------------------------------------------------------------
// One fixed step
// ---------------------------------------------------------------------------

export function stepGame(game, input, dt = STEP) {
  game.events.length = 0;
  game.screenT += dt;

  if (game.screen === 'title') {
    game.titlePan += dt * 24;
    if (input.confirm) startRun(game);
    return;
  }
  if (game.screen === 'card') {
    if (game.screenT > 1.6 || input.confirm) {
      game.screen = 'play';
      game.screenT = 0;
    }
    return;
  }
  if (game.screen === 'pause') {
    if (input.pause || input.confirm) {
      game.screen = 'play';
      game.screenT = 0;
    }
    return;
  }
  if (game.screen === 'levelclear') {
    if (game.screenT > 0.6 && input.confirm) {
      const next = game.run.levelIndex + 1;
      if (next >= LEVELS.length) {
        game.screen = 'complete';
        game.screenT = 0;
      } else {
        game.run.levelIndex = next;
        loadLevel(game, next);
        game.screen = 'card';
        game.screenT = 0;
      }
    }
    return;
  }
  if (game.screen === 'gameover' || game.screen === 'complete') {
    if (game.screenT > 0.8 && input.confirm) {
      game.screen = 'title';
      game.screenT = 0;
      game.run = null;
      game.level = buildLevel(0, game.seed);
      game.cat = freshCat(game.level);
      game.camX = 0;
    }
    return;
  }
  if (game.screen !== 'play') return;

  if (input.pause) {
    game.screen = 'pause';
    game.screenT = 0;
    return;
  }
  if (input.restart) {
    // Restart the current level: hearts back to 3, score back to its start.
    game.run.hearts = 3;
    game.run.score = game.run.levelStartScore;
    loadLevel(game, game.run.levelIndex);
    game.screen = 'card';
    game.screenT = 0;
    return;
  }

  const run = game.run;
  const cat = game.cat;
  const level = game.level;
  const def = level.def;
  run.time += dt;
  run.levelTime += dt;

  // --- timers ---
  if (cat.coyote > 0) cat.coyote -= dt;
  if (cat.jumpBuf > 0) cat.jumpBuf -= dt;
  if (cat.jumpLock > 0) cat.jumpLock -= dt;
  if (cat.pounceCd > 0) cat.pounceCd -= dt;
  if (cat.pounceT > 0) cat.pounceT -= dt;
  if (cat.invuln > 0) cat.invuln -= dt;
  if (cat.hurtT > 0) cat.hurtT -= dt;
  if (cat.squash > 0) cat.squash -= dt * 3;
  if (cat.flip > 0) cat.flip -= dt * 2.2;
  if (run.comboT > 0) {
    run.comboT -= dt;
    if (run.comboT <= 0) {
      run.combo = 0;
      run.mult = 1;
    }
  }
  if (input.jumpPressed) cat.jumpBuf = P.jumpBuffer;

  // --- jump ---
  // jumpLock (brief, after the first jump) stops a held or repeated press
  // from spending the double jump the instant the cat leaves the ground.
  const wasGrounded = cat.grounded;
  if (cat.jumpBuf > 0 && (cat.grounded || cat.coyote > 0)) {
    cat.vy = P.jumpVel;
    cat.grounded = false;
    cat.coyote = 0;
    cat.jumpBuf = 0;
    cat.jumps = 1;
    cat.jumpLock = 0.15;
    game.events.push({ t: 'jump', x: cat.x, y: cat.y });
  } else if (cat.jumpBuf > 0 && !cat.grounded && cat.jumps < 2 && cat.jumpLock <= 0) {
    cat.vy = P.doubleJumpVel;
    cat.jumpBuf = 0;
    cat.jumps = 2;
    cat.flip = 1;
    game.events.push({ t: 'double', x: cat.x, y: cat.y });
  }

  // --- pounce ---
  if (input.pouncePressed && cat.pounceCd <= 0 && cat.pounceT <= 0) {
    cat.pounceT = P.pounceTime;
    cat.pounceCd = P.pounceCooldown;
    if (cat.vy > -120) cat.vy = -120;
    game.events.push({ t: 'pounce', x: cat.x, y: cat.y });
  }

  // --- horizontal speed ---
  const speed = cat.hurtT > 0 ? def.speed * 0.55 : def.speed;
  cat.vx = cat.pounceT > 0 ? P.pounceSpeed : speed;

  // --- gravity ---
  const g = input.jumpHeld && cat.vy < 0 ? P.gravityHeld : P.gravity;
  cat.vy = Math.min(cat.vy + g * dt, P.maxFall);

  // --- move X, resolve walls and step-ups ---
  cat.x += cat.vx * dt;
  for (const pl of level.platforms) {
    if (cat.x + cat.w <= pl.x || cat.x >= pl.x + pl.w) continue;
    const feet = cat.y + cat.h;
    if (feet > pl.y + 4 && cat.y < pl.y + pl.h) {
      // Running into the side of a higher platform.
      if (pl.y < feet - P.stepUp) {
        if (cat.vx > 0) cat.x = pl.x - cat.w;
        else cat.x = pl.x + pl.w;
      } else {
        // Small ledge: step up onto it.
        cat.y = pl.y - cat.h;
        cat.grounded = true;
        cat.vy = 0;
      }
    }
  }
  // Chimney sides: solid, except a pounce turns into a small hop.
  // While invulnerable the cat phases through (no death spiral).
  for (const ch of level.chimneys) {
    if (cat.invuln > 0) continue;
    if (cat.x + cat.w <= ch.x || cat.x >= ch.x + ch.w) continue;
    if (cat.y + cat.h <= ch.y + 6 || cat.y >= ch.y + ch.h) continue;
    if (cat.pounceT > 0) {
      cat.vy = -430;
      cat.pounceT = 0;
      cat.y = ch.y - cat.h;
      game.events.push({ t: 'chimneyHop', x: cat.x, y: cat.y });
    } else {
      cat.x = ch.x - cat.w;
      hurt(game, 'chimney');
    }
  }

  // --- move Y, land on tops ---
  const prevFeet = cat.y + cat.h;
  cat.y += cat.vy * dt;
  const feet = cat.y + cat.h;
  cat.grounded = false;
  if (cat.vy >= 0) {
    for (const pl of level.platforms) {
      if (cat.x + cat.w <= pl.x + 2 || cat.x >= pl.x + pl.w - 2) continue;
      if (prevFeet <= pl.y + 1 && feet >= pl.y) {
        cat.y = pl.y - cat.h;
        if (!wasGrounded && cat.vy > 500) {
          cat.squash = 1;
          game.events.push({ t: 'land', x: cat.x, y: cat.y });
        }
        cat.vy = 0;
        cat.grounded = true;
        cat.jumps = 0;
      }
    }
    for (const ch of level.chimneys) {
      if (cat.x + cat.w <= ch.x + 2 || cat.x >= ch.x + ch.w - 2) continue;
      if (prevFeet <= ch.y + 1 && feet >= ch.y) {
        cat.y = ch.y - cat.h;
        cat.vy = 0;
        cat.grounded = true;
        cat.jumps = 0;
      }
    }
    // Bouncy awnings (market level).
    for (const aw of level.awnings) {
      if (cat.x + cat.w <= aw.x + 2 || cat.x >= aw.x + aw.w - 2) continue;
      if (prevFeet <= aw.y + 1 && feet >= aw.y) {
        cat.y = aw.y - cat.h;
        cat.vy = -1180;
        cat.grounded = false;
        cat.jumps = 1;
        game.events.push({ t: 'bounce', x: cat.x, y: cat.y });
      }
    }
  }
  if (cat.grounded) {
    cat.coyote = P.coyoteTime;
    cat.runPhase += dt * 13;
    // Remember the last safe footing for respawns. Record the platform
    // itself, not the raw landing x: respawning exactly where the cat
    // landed can put it right on the edge (or past it), with no time
    // to react. Clamp the landing x to sit safely inside the platform
    // instead of jumping all the way back to its left edge: that keeps
    // the respawn safe while avoiding a long re-run of the platform.
    for (const pl of level.platforms) {
      if (pl.w > 180 && cat.x >= pl.x && cat.x <= pl.x + pl.w) {
        const safeX = Math.max(pl.x + 60, Math.min(cat.x, pl.x + pl.w - 60));
        game.checkpoint = { x: safeX, y: pl.y };
        break;
      }
    }
  } else if (wasGrounded) {
    cat.coyote = P.coyoteTime;
  }

  // --- falling out of the world ---
  if (cat.y > P.killY) {
    respawnAfterFall(game);
    return;
  }

  // --- pickups ---
  const cx = cat.x + cat.w / 2;
  const cy = cat.y + cat.h / 2;
  for (const f of level.fish) {
    if (f.taken) continue;
    const dx = cx - f.x;
    const dy = cy - (f.y + Math.sin(game.screenT * 2 + f.phase) * 4);
    if (dx * dx + dy * dy < 46 * 46) {
      f.taken = true;
      run.fish += 1;
      run.combo += 1;
      run.comboT = SCORE.comboWindow;
      run.mult = Math.min(SCORE.comboMax, 1 + Math.floor(run.combo / SCORE.comboStep));
      run.maxCombo = Math.max(run.maxCombo, run.combo);
      const pts = SCORE.fish * run.mult;
      run.score += pts;
      run.levelScore += pts;
      game.events.push({ t: 'fish', x: f.x, y: f.y, mult: run.mult, pts });
    }
  }
  for (const b of level.bells) {
    if (b.taken) continue;
    const dx = cx - b.x;
    const dy = cy - (b.y + Math.sin(game.screenT * 1.5 + b.phase) * 5);
    if (dx * dx + dy * dy < 52 * 52) {
      b.taken = true;
      run.bells += 1;
      run.score += SCORE.bell;
      run.levelScore += SCORE.bell;
      game.events.push({ t: 'bell', x: b.x, y: b.y, pts: SCORE.bell });
    }
  }
  if (level.milk && !level.milk.taken) {
    const m = level.milk;
    if (cat.x + cat.w > m.x - 22 && cat.x < m.x + 22 && cat.y + cat.h > m.y - 20 && cat.y < m.y + 20) {
      m.taken = true;
      run.hearts = Math.min(3, run.hearts + 1);
      game.events.push({ t: 'milk', x: m.x, y: m.y });
    }
  }

  // --- crows ---
  for (const c of level.crows) {
    updateCrow(game, c, dt);
    const cw = 28;
    const chh = 20;
    const overlap =
      cat.x + cat.w > c.x - cw / 2 && cat.x < c.x + cw / 2 &&
      cat.y + cat.h > c.y - chh / 2 && cat.y < c.y + chh / 2;
    if (!overlap || c.gone) continue;
    const stomp = cat.vy > 0 && cat.y + cat.h - c.y < 32;
    if (stomp || cat.pounceT > 0) {
      c.gone = true;
      run.crowsDown += 1;
      run.score += SCORE.crow;
      run.levelScore += SCORE.crow;
      if (stomp) cat.vy = -540;
      game.events.push({ t: 'crow', x: c.x, y: c.y, pts: SCORE.crow });
    } else {
      hurt(game, 'crow');
    }
  }
  level.crows = level.crows.filter((c) => !c.gone || c.goneT < 1.2);

  // --- moon gate ---
  if (cat.x + cat.w >= level.gate.x) {
    const heartBonus = run.hearts * SCORE.heartBonus;
    const purrfect = run.levelDamage === 0 ? SCORE.purrfectBonus : 0;
    run.score += heartBonus + purrfect;
    run.levelScore += heartBonus + purrfect;
    game.levelBonus = { hearts: heartBonus, purrfect, purrfectFlag: purrfect > 0 };
    game.screen = 'levelclear';
    game.screenT = 0;
    game.events.push({ t: 'gate' });
    return;
  }

  // --- camera ---
  const target = Math.max(0, Math.min(cat.x - 380, level.length - VIEW_W));
  game.camX += (target - game.camX) * Math.min(1, dt * 8);
}

function updateCrow(game, c, dt) {
  const cat = game.cat;
  c.phase += dt * 2;
  if (c.gone) {
    c.goneT = (c.goneT || 0) + dt;
    c.y -= 260 * dt;
    c.x += 140 * dt;
    return;
  }
  if (c.dive) {
    c.stateT += dt;
    if (c.state === 'patrol') {
      c.y = c.baseY + Math.sin(c.phase) * 26;
      c.x -= 12 * dt;
      const dx = cat.x - c.x;
      if (Math.abs(dx) < 330 && cat.y < c.y + 260 && c.stateT > 1.2) {
        c.state = 'warn';
        c.stateT = 0;
        game.events.push({ t: 'crowWarn', x: c.x, y: c.y });
      }
    } else if (c.state === 'warn') {
      c.y = c.baseY + Math.sin(c.phase) * 8;
      if (c.stateT > 0.35) {
        c.state = 'dive';
        c.stateT = 0;
        const dx = cat.x + cat.w / 2 - c.x;
        const dy = cat.y + cat.h / 2 - c.y;
        const len = Math.hypot(dx, dy) || 1;
        c.vx = (dx / len) * 640;
        c.vy = (dy / len) * 640;
      }
    } else if (c.state === 'dive') {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.stateT > 0.85 || c.y > 620) {
        c.state = 'rise';
        c.stateT = 0;
      }
    } else {
      // rise back to patrol height
      c.y -= 300 * dt;
      if (c.y <= c.baseY) {
        c.y = c.baseY;
        c.state = 'patrol';
        c.stateT = 0;
      }
    }
  } else {
    c.y = c.baseY + Math.sin(c.phase) * 26;
    c.x -= 26 * dt;
  }
}

// ---------------------------------------------------------------------------
// Autopilot: plays the game itself, for headless tests and staged screenshots
// ---------------------------------------------------------------------------

// Simulate a jump from the cat's current spot with the given hold time.
// Returns { pl, x } for the platform (or chimney top) the cat would land
// on and the x where it lands, or null when it falls or runs into a wall.
// The autopilot tries a few holds and jumps as soon as one of them lands
// across the gap ahead.
function simLanding(cat, level, hold) {
  let x = cat.x;
  let y = cat.y;
  let vy = P.jumpVel;
  let held = 0;
  const vx = level.def.speed;
  for (let t = 0; t < 2.0; t += STEP) {
    const g = held < hold && vy < 0 ? P.gravityHeld : P.gravity;
    vy = Math.min(vy + g * STEP, P.maxFall);
    x += vx * STEP;
    const prevFeet = y + cat.h;
    y += vy * STEP;
    const feet = y + cat.h;
    if (vy >= 0) {
      for (const pl of level.platforms) {
        if (x + cat.w > pl.x + 2 && x < pl.x + pl.w - 2 && prevFeet <= pl.y + 1 && feet >= pl.y) {
          return { pl, x };
        }
      }
      for (const ch of level.chimneys) {
        if (x + cat.w > ch.x + 2 && x < ch.x + ch.w - 2 && prevFeet <= ch.y + 1 && feet >= ch.y) {
          return { pl: ch, x };
        }
      }
    } else {
      // Rising into a chimney side is a wall, not a landing.
      for (const ch of level.chimneys) {
        if (x + cat.w > ch.x && x < ch.x + ch.w && feet > ch.y + 6 && y < ch.y + ch.h) {
          return null;
        }
      }
    }
    if (y > P.killY) return null;
    held += STEP;
  }
  return null;
}

export function autopilotInput(game) {
  const input = { jumpHeld: false, jumpPressed: false, pouncePressed: false, confirm: false, pause: false, restart: false };
  if (game.screen !== 'play') {
    if (game.screen === 'title' || game.screen === 'levelclear' || game.screen === 'gameover' || game.screen === 'complete') {
      input.confirm = game.screenT > 0.9;
    }
    if (game.screen === 'card') input.confirm = game.screenT > 0.4;
    return input;
  }
  const cat = game.cat;
  const level = game.level;
  const feet = cat.y + cat.h;
  const ahead = cat.x + cat.w;

  // Next platform edge ahead (the ground we stand on, or the next one).
  let edgeX = Infinity;
  let nextTop = null;
  for (const pl of level.platforms) {
    if (cat.x + cat.w > pl.x && cat.x < pl.x + pl.w && feet <= pl.y + 30) {
      edgeX = pl.x + pl.w;
    }
    if (pl.x >= cat.x - 10 && (nextTop === null || pl.x < nextTop.x)) nextTop = pl;
  }
  const gapAhead = edgeX - ahead;

  // Nearest chimney ahead.
  let chimX = Infinity;
  for (const ch of level.chimneys) {
    if (ch.x + ch.w > cat.x && ch.x > cat.x - 20) chimX = Math.min(chimX, ch.x);
  }
  // Crows ahead: low ones (head height) and high ones (overhead).
  // A crow only counts as "in the jump arc" when a medium single jump
  // (peak ~250 px) could actually reach it; high crows drift at 260+ px,
  // so they must not force the weak tap jump that cannot cross a gap.
  let lowCrow = null;
  let highCrowInArc = false;
  let crowAboveDouble = false;
  for (const c of level.crows) {
    if (c.gone) continue;
    const dx = c.x - cat.x;
    if (dx < -30 || dx > 420) continue;
    const low = c.baseY > cat.y - 90;
    if (low && !lowCrow && dx < 260) lowCrow = c;
    if (!low && dx < 420 && c.y > cat.y - 230 && c.y < cat.y + 20) highCrowInArc = true;
    if (!low && dx > -20 && dx < 300 && c.y > cat.y - 520 && c.y < cat.y - 80) crowAboveDouble = true;
    // A diving crow is a threat whatever its height.
    if (c.dive && (c.state === 'warn' || c.state === 'dive') && dx < 260) lowCrow = c;
  }
  // A bell or fish just above, worth a double jump.
  let prizeAbove = false;
  for (const b of level.bells) {
    if (!b.taken && b.x > cat.x - 20 && b.x < cat.x + 190 && b.y < cat.y - 60 && b.y > cat.y - 300) prizeAbove = true;
  }
  for (const f of level.fish) {
    if (!f.taken && f.x > cat.x - 10 && f.x < cat.x + 170 && f.y < cat.y - 90 && f.y > cat.y - 280) prizeAbove = true;
  }

  // Hold jump briefly after pressing, for a medium hop. A tap jump stays
  // low enough to pass under a high crow.
  if (game.autoHold && game.autoHold > 0) {
    input.jumpHeld = true;
    game.autoHold -= STEP;
  }

  if (cat.grounded || cat.coyote > 0) {
    // The platform under the cat's feet.
    let curPl = null;
    for (const pl of level.platforms) {
      if (cat.x + cat.w > pl.x && cat.x < pl.x + pl.w && Math.abs(feet - pl.y) < 30) curPl = pl;
    }
    const gapSoon = gapAhead < 220;
    const chimSoon = chimX !== Infinity && chimX - ahead < 190;
    const crowSoon = lowCrow && lowCrow.x - ahead < 165;
    if (gapSoon || chimSoon || crowSoon) {
      // Try holds short to long; jump as soon as one lands safely:
      // across the gap when there is one, past the chimney or crow
      // when there is only an obstacle to clear.
      let hold = null;
      for (const h of [0.1, 0.18, 0.26, 0.34]) {
        const hh = highCrowInArc ? 0 : h;
        const landed = simLanding(cat, level, hh);
        if (!landed) continue;
        const pastGap = !curPl || landed.x > curPl.x + curPl.w - 60;
        const pastChim = chimX === Infinity || landed.x > chimX + 46;
        const pastCrow = !lowCrow || landed.x > lowCrow.x + 20;
        if (gapSoon && !pastGap) continue;
        if (!gapSoon && chimSoon && !pastChim) continue;
        if (!gapSoon && !chimSoon && crowSoon && !pastCrow) continue;
        hold = hh;
        break;
      }
      if (hold === null && gapAhead < 45) hold = 0.34; // last resort at the edge
      if (hold !== null) {
        input.jumpPressed = true;
        input.jumpHeld = true;
        game.autoHold = hold;
      }
    }
  } else if (cat.jumps < 2) {
    // Airborne with a jump left (first jump, double jump, or the air
    // jump after walking off a ledge): use it to cross a wide gap, to
    // clear a chimney on the landing platform, or to reach a prize above
    // (never into a high crow overhead).
    const overGap = gapAhead < 0;
    const nextFar = nextTop && nextTop.x - ahead > 120;
    const chimClose = chimX !== Infinity && chimX - ahead < 200;
    // A prize double jump is a luxury: never spend the air jump on one
    // while a gap is coming up that the cat still has to cross.
    const prizeJump = prizeAbove && !crowAboveDouble && (overGap || gapAhead > 220);
    if (prizeJump || chimClose || (overGap && nextFar) || (cat.vy > 250 && overGap)) {
      input.jumpPressed = true;
      input.jumpHeld = true;
      game.autoHold = 0.16;
    }
  }

  // Pounce a low crow in range instead of running into it, but never
  // pounce off a ledge: only when solid ground runs ahead. The pounce
  // reaches about 170 px, so only pounce when the crow is inside that.
  // When pouncing, cancel any jump decided above.
  const pounceNow = lowCrow && cat.pounceCd <= 0 && cat.grounded && lowCrow.x - ahead < 150 && edgeX - ahead > 220;
  if (pounceNow) {
    input.pouncePressed = true;
    input.jumpPressed = false;
    input.jumpHeld = false;
    game.autoHold = 0;
  }
  return input;
}

// Run the whole game headless with the autopilot. Returns a summary.
export function runHeadless(seed, maxSteps = 60 * 400) {
  const game = createGame(seed);
  let steps = 0;
  while (steps < maxSteps) {
    const input = autopilotInput(game);
    stepGame(game, input, STEP);
    steps++;
    if (game.screen === 'complete') break;
    if (game.screen === 'gameover') break;
    // Safety: never stall on a screen.
    if ((game.screen === 'title' || game.screen === 'card') && game.screenT > 5) break;
  }
  const run = game.run || { score: 0, hearts: 0, fish: 0, crowsDown: 0, bells: 0, maxCombo: 0, time: 0, deaths: 0 };
  return {
    seed, screen: game.screen, steps,
    score: run.score, hearts: run.hearts, fish: run.fish,
    crowsDown: run.crowsDown, bells: run.bells,
    maxCombo: run.maxCombo, time: +run.time.toFixed(1),
    deaths: run.deaths, levelIndex: game.levelIndex,
  };
}

// Stars for the finished run: 1 for finishing, 1 for a strong score,
// 1 for never taking damage.
export function starsFor(game) {
  const run = game.run;
  if (!run) return 0;
  let stars = 1;
  if (run.score >= 12000) stars += 1;
  if (run.damageTaken === 0) stars += 1;
  return Math.min(3, stars);
}
