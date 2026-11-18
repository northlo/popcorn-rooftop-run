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
  pounceCooldown: 0.85,
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
  maxFall: 1350,
  stepUp: 26, // a ledge this tall is auto-climbed while running
  hurtInvuln: 1.4,
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
      skyTop: '#0b5560', skyMid: '#1f9a96', skyBot: '#f2c45a',
      sun: '#fff1c1', sunGlow: 'rgba(255, 225, 140, 0.55)',
      sea: '#9b1d2c', seaDark: '#6e1420',
      far: '#177a7e', mid: '#a3243a', near: '#5c1220',
      roof: '#c0392b', roofDark: '#8e2320', roofEdge: '#ffc93c',
      wall: '#f2c46d', wallDark: '#d39b45',
      windowLit: '#fff1a8', windowDark: '#6b1f2a',
      cloud: 'rgba(255, 244, 214, 0.7)',
      accent: '#ffc93c',
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
      skyTop: '#050a22', skyMid: '#10215c', skyBot: '#1b4a7c',
      sun: '#f4f1de', sunGlow: 'rgba(214, 228, 255, 0.45)',
      sea: '#0e2a4a', seaDark: '#081a30',
      far: '#1a2f66', mid: '#142453', near: '#0b1638',
      roof: '#2f4685', roofDark: '#22336a', roofEdge: '#9fe8ff',
      wall: '#3a5296', wallDark: '#2b3f7a',
      windowLit: '#ffe9a8', windowDark: '#141f45',
      cloud: 'rgba(150, 175, 255, 0.22)',
      accent: '#9fe8ff',
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
