// Game tuning and level data for Popcorn: Rooftop Run.
// One file holds every number a designer would tune: physics, timing,
// difficulty per level, palettes, scoring and the level names.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const STEP = 1 / 60;

export const PHYSICS = {
  gravity: 2400,
  gravityHeld: 950, // while the jump button is held and rising: floaty jump
  jumpVel: -920,
  doubleJumpVel: -800,
  runSpeed: 345,
  pounceSpeed: 760,
  pounceTime: 0.22,
  pounceCooldown: 1.0,
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
  maxFall: 1350,
  stepUp: 26, // a ledge this tall is auto-climbed while running
  hurtInvuln: 1.1,
  killY: 900, // falling below this line costs a heart
};

export const SCORE = {
  fish: 100,
  crow: 200,
  bell: 500,
  heartBonus: 500, // per heart left at the end of a level
  purrfectBonus: 1000, // finishing a level without taking damage
  comboStep: 4, // every 4 fish in a row raises the multiplier by 1
  comboMax: 8,
  comboWindow: 2.5, // seconds without a fish before the combo resets
};

export const LEVELS = [
  {
    name: 'Sunset Harbor',
    sub: 'Level 1',
    seed: 11,
    length: 15000,
    speed: 345,
    gapMin: 80,
    gapMax: 140,
    chimneyChance: 0.18,
    crowChance: 0.12,
    diveCrows: false,
    awnings: false,
    palette: {
      skyTop: '#ff9e57', skyMid: '#ff6f91', skyBot: '#7c4a8a',
      sun: '#ffd166', sunGlow: 'rgba(255, 209, 102, 0.55)',
      sea: '#e2607a', seaDark: '#a8436b',
      far: '#b85c7a', mid: '#8a4a6d', near: '#5d3a5e',
      roof: '#c96f4a', roofDark: '#a85438', roofEdge: '#f2a65a',
      wall: '#e8b48a', wallDark: '#c98d64',
      windowLit: '#ffe08a', windowDark: '#5a3a52',
      cloud: 'rgba(255, 220, 200, 0.85)',
      accent: '#ffd166',
    },
  },
  {
    name: 'Paper Kite Market',
    sub: 'Level 2',
    seed: 23,
    length: 17500,
    speed: 365,
    gapMin: 95,
    gapMax: 160,
    chimneyChance: 0.22,
    crowChance: 0.18,
    diveCrows: false,
    awnings: true,
    palette: {
      skyTop: '#f7b733', skyMid: '#fc4a1a', skyBot: '#7a1e3f',
      sun: '#fff3b0', sunGlow: 'rgba(255, 243, 176, 0.5)',
      sea: '#c9184a', seaDark: '#8a1230',
      far: '#c22a4a', mid: '#96203e', near: '#6d1730',
      roof: '#a4133c', roofDark: '#7f0f30', roofEdge: '#ffba08',
      wall: '#f4a261', wallDark: '#c97e4a',
      windowLit: '#ffe66d', windowDark: '#571b2e',
      cloud: 'rgba(255, 230, 170, 0.8)',
      accent: '#ffba08',
    },
  },
  {
    name: 'Starfall Spires',
    sub: 'Level 3',
    seed: 37,
    length: 20000,
    speed: 385,
    gapMin: 110,
    gapMax: 180,
    chimneyChance: 0.25,
    crowChance: 0.22,
    diveCrows: true,
    awnings: false,
    palette: {
      skyTop: '#1d1145', skyMid: '#3b2372', skyBot: '#0e2a4a',
      sun: '#f4f1de', sunGlow: 'rgba(244, 241, 222, 0.4)',
      sea: '#14324f', seaDark: '#0b1e33',
      far: '#4a2b7a', mid: '#33205e', near: '#221640',
      roof: '#5b4a8a', roofDark: '#453a6e', roofEdge: '#7ef9ff',
      wall: '#6d5a9e', wallDark: '#4e3f78',
      windowLit: '#7ef9ff', windowDark: '#241a44',
      cloud: 'rgba(180, 160, 255, 0.35)',
      accent: '#7ef9ff',
    },
  },
];

export const TEXT = {
  title: 'Popcorn: Rooftop Run',
  tagline: 'A lazy cat. Three rooftops. One moon gate per night.',
  goal: 'Goal: reach the Moon Gate at the end of each night.',
  begin: 'Press SPACE or CLICK to begin',
  again: 'Press SPACE to play again',
  retry: 'Press SPACE to try again',
  paused: 'PAUSED',
  gameOver: 'GAME OVER',
  levelClear: 'LEVEL CLEAR!',
  allClear: 'ALL NIGHTS CLEAR!',
  purrfect: 'PURRFECT!',
};
