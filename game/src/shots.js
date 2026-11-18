// Staged screenshot scenes for Popcorn: Rooftop Run.
// Each scene advances the real game with the autopilot (fixed seed) to
// a chosen moment, then freezes it so the page can be screenshotted.
// Every picture is a real render of the game's own code, never a mock.

import { stepGame, autopilotInput, createGame } from './world.js';
import { STEP } from './config.js';
import { fxBurst, fxFeathers, fxText, fxMeteor } from './fx.js';

function runUntil(game, fx, cond, maxSteps = 60 * 400) {
  for (let i = 0; i < maxSteps; i++) {
    const input = autopilotInput(game);
    stepGame(game, input, STEP);
    if (cond(game)) return true;
  }
  return false;
}

// Level 1: the cat mid-jump, eating fish, with a combo running.
// (The combo multiplier only reaches x2 in level 1, so x2 is the bar.)
function scenePlay1(game, fx) {
  const ok = runUntil(game, fx, (g) => {
    if (g.screen !== 'play' || g.levelIndex !== 0) return false;
    if (g.run.mult < 2 || g.cat.grounded) return false;
    // A fish just ahead, so the shot reads as "eating a string of fish".
    return g.level.fish.some((f) => !f.taken && f.x > g.cat.x && f.x < g.cat.x + 200);
  });
  if (!ok) return;
  // Sparkles around the cat for the shot.
  fxBurst(fx, game.cat.x + 20, game.cat.y, { n: 14, color: '#ffd166', speed: 160 });
  fxText(fx, game.cat.x + 60, game.cat.y - 30, `+${100 * game.run.mult}`, '#ffd166');
}

// Level 2: the cat mid-jump over the Paper Kite Market, kites and
// awnings in frame, with a combo running.
function scenePlay2(game, fx) {
  const ok = runUntil(game, fx, (g) => {
    if (g.screen !== 'play' || g.levelIndex !== 1) return false;
    if (g.run.mult < 2 || g.cat.grounded) return false;
    // A fish just ahead, so the shot reads as "eating a string of fish".
    return g.level.fish.some((f) => !f.taken && f.x > g.cat.x && f.x < g.cat.x + 200);
  });
  if (!ok) return;
  // Sparkles around the cat for the shot.
  fxBurst(fx, game.cat.x + 20, game.cat.y, { n: 14, color: '#ffd166', speed: 160 });
  fxText(fx, game.cat.x + 60, game.cat.y - 30, `+${100 * game.run.mult}`, '#ffd166');
}

// Level 3 climax: the cat double-jumping for a Moon Bell, meteors out.
function scenePlay3(game, fx) {
  const ok = runUntil(game, fx, (g) => {
    if (g.screen !== 'play' || g.levelIndex !== 2) return false;
    if (g.cat.jumps < 2 || g.cat.grounded) return false;
    const nearBell = g.level.bells.some((b) => !b.taken && Math.abs(b.x - g.cat.x) < 200 && b.y < g.cat.y);
    const nearCrow = g.level.crows.some((c) => !c.gone && Math.abs(c.x - g.cat.x) < 220);
    return nearBell || nearCrow;
  });
  if (!ok) return;
  fxBurst(fx, game.cat.x + 20, game.cat.y, { n: 16, color: '#7ef9ff', speed: 180 });
  fxFeathers(fx, game.cat.x + 120, game.cat.y - 20);
  fxMeteor(fx, game.camX + 900, 60);
  fxMeteor(fx, game.camX + 500, 110);
}

export function setupShot(game, fx, name, seed) {
  // Start from a fresh game on the requested seed.
  const fresh = createGame(seed);
  Object.assign(game, fresh);
  if (name === 'title') {
    // The title screen over the sunset level; pan the camera in a little.
    game.titlePan = 2600;
  } else if (name === 'play1') {
    scenePlay1(game, fx);
  } else if (name === 'play2') {
    scenePlay2(game, fx);
  } else if (name === 'play3') {
    scenePlay3(game, fx);
  } else if (name === 'complete') {
    runUntil(game, fx, (g) => g.screen === 'complete');
  }
  // The page is ready to screenshot once this flag is set.
  window.__shotReady = true;
}
