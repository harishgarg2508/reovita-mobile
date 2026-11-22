// The look of each journey map. The server knows the length and the days of a journey (CHALLENGE_MAPS in the service); everything drawn is here: the terrain,
// the route and the landmarks. The map is a small grid of raised tiles seen from an angle (isometric), so it reads as 3D without a 3D engine.

export type JourneyTheme = 'plains' | 'mountain' | 'coast' | 'backwaters';
export type Terrain = 'grass' | 'sand' | 'water' | 'rock' | 'snow' | 'trail';

export interface JourneyMapDef {
  // Tiles along each side of the square grid.
  grid: number;
  // The route in grid coordinates (x runs down-right, y runs down-left), from the start to the end. Tiles near it are made walkable.
  route: [number, number][];
  // Places along the route, by how far along it they are (0 to 1).
  landmarks: { at: number; label: string }[];
}

export const JOURNEY_MAPS: Record<string, JourneyMapDef> = {
  mumbai_delhi: {
    grid: 10,
    route: [[0.5, 8.5], [2, 7], [3, 5.5], [5, 5], [6.5, 3.5], [8, 2.5], [9, 0.8]],
    landmarks: [{ at: 0, label: 'Mumbai' }, { at: 0.5, label: 'Jaipur' }, { at: 1, label: 'Delhi' }],
  },
  himalaya_trek: {
    grid: 10,
    route: [[1, 8.5], [2.5, 7], [3, 5], [4.5, 4.5], [5.5, 3], [7, 2.5], [8.5, 1]],
    landmarks: [{ at: 0, label: 'Base camp' }, { at: 0.55, label: 'Pine ridge' }, { at: 1, label: 'Snow line' }],
  },
  konkan_coast: {
    grid: 10,
    route: [[1, 9], [1.5, 7], [2.5, 5.5], [2.5, 3.5], [3.5, 2], [4, 0.5]],
    landmarks: [{ at: 0, label: 'Mumbai' }, { at: 0.5, label: 'Ratnagiri' }, { at: 1, label: 'Goa' }],
  },
  kerala_backwaters: {
    grid: 10,
    route: [[1, 8.5], [2.5, 7.5], [4, 7], [5, 5.5], [6.5, 5], [7.5, 3.5], [9, 2]],
    landmarks: [{ at: 0, label: 'Kollam' }, { at: 0.5, label: 'Alleppey' }, { at: 1, label: 'Kochi' }],
  },
};

// A fixed look for a map key the app does not know yet (a map added on the server first): plains, a straight route.
export const FALLBACK_MAP: JourneyMapDef = { grid: 10, route: [[1, 8.5], [5, 5], [9, 1]], landmarks: [{ at: 0, label: 'Start' }, { at: 1, label: 'Finish' }] };

const THEME_DEFAULT_KEY: Record<JourneyTheme, string> = { plains: 'mumbai_delhi', mountain: 'himalaya_trek', coast: 'konkan_coast', backwaters: 'kerala_backwaters' };

// The drawing of a journey's map: the one made for its key, or for a map the person made, the route of its look with neutral place names.
export function mapDefFor(mapKey: string, theme: string): JourneyMapDef {
  const known = JOURNEY_MAPS[mapKey];
  if (known) return known;
  const base = JOURNEY_MAPS[THEME_DEFAULT_KEY[(theme in THEME_DEFAULT_KEY ? theme : 'plains') as JourneyTheme]] ?? FALLBACK_MAP;
  return { ...base, landmarks: [{ at: 0, label: 'Start' }, { at: 0.5, label: 'Halfway' }, { at: 1, label: 'Finish' }] };
}

export interface ThemeColors {
  skyTop: string;
  skyBottom: string;
  // [top face, left side, right side]
  grass: [string, string, string];
  sand: [string, string, string];
  water: [string, string, string];
  rock: [string, string, string];
  snow: [string, string, string];
  trail: [string, string, string];
  tree: string;
  trunk: string;
  cloud: string;
}

export const THEMES: Record<JourneyTheme, ThemeColors> = {
  plains: {
    skyTop: '#9BD3F5', skyBottom: '#FFF1D0',
    grass: ['#8CC66B', '#6FA552', '#5C9044'], sand: ['#E8CF8E', '#CDB074', '#B89B60'], water: ['#6EC1E4', '#4FA3C8', '#3F8DB0'],
    rock: ['#A39C94', '#857E77', '#6F6962'], snow: ['#F4F8FB', '#D5DEE6', '#BAC6D0'], trail: ['#D9B77C', '#BE9A60', '#A5834D'],
    tree: '#4C8B3F', trunk: '#7A5636', cloud: '#FFFFFF',
  },
  mountain: {
    skyTop: '#7FB7E6', skyBottom: '#E6F1FA',
    grass: ['#7FB36A', '#628F51', '#527A44'], sand: ['#CFC3A5', '#B3A887', '#9B9072'], water: ['#78B9E0', '#5A9BC4', '#4888AE'],
    rock: ['#9AA0A6', '#7C838A', '#656B71'], snow: ['#FFFFFF', '#DCE6EE', '#C2CFDA'], trail: ['#C9B48A', '#AE9A72', '#968360'],
    tree: '#2F6B4A', trunk: '#6B4A30', cloud: '#FFFFFF',
  },
  coast: {
    skyTop: '#87CEF3', skyBottom: '#FFE9C7',
    grass: ['#88C46E', '#6AA255', '#588D45'], sand: ['#F2DDA2', '#D7C186', '#BFA970'], water: ['#4FB6E8', '#3597C9', '#2A82B2'],
    rock: ['#A9A29A', '#8B847C', '#736D66'], snow: ['#F4F8FB', '#D5DEE6', '#BAC6D0'], trail: ['#E7CF98', '#CBB37C', '#B29B67'],
    tree: '#3F9B52', trunk: '#8B6538', cloud: '#FFFFFF',
  },
  backwaters: {
    skyTop: '#A6DBC6', skyBottom: '#FFF4D6',
    grass: ['#6DBB6A', '#529A52', '#438544'], sand: ['#E9D9A0', '#CDBE86', '#B6A772'], water: ['#5BC0B5', '#3FA196', '#31897F'],
    rock: ['#A39C94', '#857E77', '#6F6962'], snow: ['#F4F8FB', '#D5DEE6', '#BAC6D0'], trail: ['#D8C28A', '#BBA573', '#A38F60'],
    tree: '#2E8B57', trunk: '#7B5A38', cloud: '#FFFFFF',
  },
};

// A small deterministic hash, so the same tile always looks the same.
export function hash(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// How near a tile is to the route (distance from its centre to the route, in tiles).
function distanceToRoute(x: number, y: number, route: [number, number][]): number {
  let best = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const [ax, ay] = route[i];
    const [bx, by] = route[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return best;
}

export interface Tile {
  x: number;
  y: number;
  terrain: Terrain;
  // Height in steps; a step is drawn as a few pixels of side wall.
  height: number;
  // 0 or 1: a tree stands on it (and which kind, by the theme).
  tree: boolean;
}

// The tiles of a map: terrain and height from the theme, with the route cut through them as a walkable trail.
export function buildTiles(theme: JourneyTheme, def: JourneyMapDef): Tile[] {
  const tiles: Tile[] = [];
  const n = def.grid;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const near = distanceToRoute(x + 0.5, y + 0.5, def.route);
      const noise = hash(x, y, 7);
      let terrain: Terrain = 'grass';
      let height = 1;
      if (theme === 'plains') {
        height = 1 + (noise > 0.8 ? 1 : 0);
        if (hash(x >> 1, y >> 1, 3) > 0.72) terrain = 'sand';
      } else if (theme === 'mountain') {
        const climb = (x + (n - 1 - y)) / (2 * (n - 1));
        height = 1 + Math.round(climb * 5 + noise * 1.2);
        terrain = height >= 6 ? 'snow' : height >= 4 ? 'rock' : 'grass';
      } else if (theme === 'coast') {
        // The sea lies to the right of the coast line.
        const coast = 5.2 - y * 0.2 + noise * 0.8;
        if (x > coast + 1.6) terrain = 'water';
        else if (x > coast) terrain = 'sand';
        height = terrain === 'water' ? 0 : 1;
      } else {
        // Backwaters: a maze of canals, with the land in strips.
        terrain = hash(x, y, 11) > 0.45 ? 'grass' : 'water';
        height = terrain === 'water' ? 0 : 1;
      }
      // The route is always a walkable trail with land around it.
      if (near < 0.55) {
        terrain = 'trail';
        height = Math.max(height, 1);
      } else if (near < 1.1 && terrain === 'water' && theme !== 'coast') {
        terrain = 'grass';
        height = 1;
      }
      const tree = (terrain === 'grass' || (terrain === 'sand' && theme === 'coast')) && near > 0.9 && hash(x, y, 5) > 0.62;
      tiles.push({ x, y, terrain, height, tree });
    }
  }
  return tiles;
}

export const TILE_W = 46;
export const TILE_H = 23;
// Pixels of wall for one step of height.
export const STEP = 7;

// Where the middle of a tile's top face is on the picture (x right, y down), with the whole grid centred.
export function project(x: number, y: number, height: number, grid: number): { x: number; y: number } {
  const originX = (grid * TILE_W) / 2;
  const originY = 10 + 8 * STEP;
  return { x: originX + (x - y) * (TILE_W / 2), y: originY + (x + y) * (TILE_H / 2) - height * STEP };
}

export function sceneSize(grid: number): { width: number; height: number } {
  return { width: grid * TILE_W, height: 10 + 8 * STEP + grid * TILE_H + 24 };
}

// The route as points on the picture, and how far along it each point is (0 to 1), so a position can be found for any share of the journey.
export function routeOnPicture(def: JourneyMapDef, tiles: Tile[]): { points: { x: number; y: number }[]; at: number[] } {
  const heightAt = (x: number, y: number) => tiles.find((t) => t.x === Math.max(0, Math.min(def.grid - 1, Math.floor(x))) && t.y === Math.max(0, Math.min(def.grid - 1, Math.floor(y))))?.height ?? 1;
  // Many small steps along each leg, so the walker follows the bumps of the land.
  const raw: { x: number; y: number }[] = [];
  for (let i = 0; i < def.route.length - 1; i++) {
    const [ax, ay] = def.route[i];
    const [bx, by] = def.route[i + 1];
    for (let s = 0; s < 8; s++) {
      const t = s / 8;
      const gx = ax + (bx - ax) * t;
      const gy = ay + (by - ay) * t;
      raw.push(project(gx, gy, heightAt(gx, gy) + 0.2, def.grid));
    }
  }
  const [lx, ly] = def.route[def.route.length - 1];
  raw.push(project(lx, ly, heightAt(lx, ly) + 0.2, def.grid));
  const lengths = [0];
  for (let i = 1; i < raw.length; i++) lengths.push(lengths[i - 1] + Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y));
  const total = lengths[lengths.length - 1] || 1;
  return { points: raw, at: lengths.map((l) => l / total) };
}

// The point on the picture a share (0 to 1) of the way along the route.
export function pointAt(route: { points: { x: number; y: number }[]; at: number[] }, share: number): { x: number; y: number } {
  const s = Math.max(0, Math.min(1, share));
  for (let i = 1; i < route.at.length; i++) {
    if (s <= route.at[i]) {
      const span = route.at[i] - route.at[i - 1] || 1;
      const t = (s - route.at[i - 1]) / span;
      return { x: route.points[i - 1].x + (route.points[i].x - route.points[i - 1].x) * t, y: route.points[i - 1].y + (route.points[i].y - route.points[i - 1].y) * t };
    }
  }
  return route.points[route.points.length - 1];
}
