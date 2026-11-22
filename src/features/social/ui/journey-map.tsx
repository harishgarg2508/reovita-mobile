import { memo, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { usePalette } from '@shared/ui/theme';
import { SocialAvatar, type SocialJourneyMember } from '@entities/social';

import { STEP, mapDefFor, THEMES, TILE_H, TILE_W, buildTiles, hash, pointAt, project, routeOnPicture, sceneSize, type JourneyMapDef, type JourneyTheme, type ThemeColors, type Tile } from '../model/journey-maps';

const AVATAR = 28;

interface JourneyMapProps {
  mapKey: string;
  theme: string;
  members: SocialJourneyMember[];
  // The width the map is drawn at; the height follows.
  width: number;
  // A preview: nothing moves, so it costs almost nothing to keep on screen.
  still?: boolean;
}

type Route = ReturnType<typeof routeOnPicture>;

// The drawing of the land: about a hundred tiles of SVG. It is kept apart and memoised so that typing in a form, turning a wheel or an animation frame
// of the walkers never draws the tiles again; it is drawn only when the map, its look or its width changes.
const MapScene = memo(function MapScene({ def, tiles, route, colors, width }: { def: JourneyMapDef; tiles: Tile[]; route: Route; colors: ThemeColors; width: number }) {
  const scene = sceneSize(def.grid);
  const height = scene.height * (width / scene.width);
  // The far tiles first, so the near ones cover their edges.
  const ordered = useMemo(() => [...tiles].sort((a, b) => a.x + a.y - (b.x + b.y)), [tiles]);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${scene.width} ${scene.height}`}>
        {/* The lighter sky near the horizon is drawn inside the picture, under the tiles. A positioned View would paint over the tiles. */}
        <Rect x={0} y={scene.height * 0.45} width={scene.width} height={scene.height * 0.55} fill={colors.skyBottom} fillOpacity={0.9} />
        {ordered.map((tile) => {
          const c = colors[tile.terrain];
          const centre = project(tile.x + 0.5, tile.y + 0.5, tile.height, def.grid);
          const w = TILE_W / 2;
          const h = TILE_H / 2;
          const wall = tile.height * STEP;
          return (
            <G key={`${tile.x}-${tile.y}`}>
              {wall > 0 ? (
                <>
                  <Polygon points={`${centre.x - w},${centre.y} ${centre.x},${centre.y + h} ${centre.x},${centre.y + h + wall} ${centre.x - w},${centre.y + wall}`} fill={c[1]} />
                  <Polygon points={`${centre.x + w},${centre.y} ${centre.x},${centre.y + h} ${centre.x},${centre.y + h + wall} ${centre.x + w},${centre.y + wall}`} fill={c[2]} />
                </>
              ) : null}
              <Polygon points={`${centre.x},${centre.y - h} ${centre.x + w},${centre.y} ${centre.x},${centre.y + h} ${centre.x - w},${centre.y}`} fill={c[0]} />
              {tile.terrain === 'water' && hash(tile.x, tile.y, 2) > 0.6 ? <Line x1={centre.x - 6} y1={centre.y} x2={centre.x + 4} y2={centre.y} stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.5} strokeLinecap="round" /> : null}
              {tile.tree ? (
                <>
                  <Rect x={centre.x - 1.5} y={centre.y - 7} width={3} height={7} fill={colors.trunk} />
                  <Polygon points={`${centre.x},${centre.y - 22} ${centre.x + 7},${centre.y - 6} ${centre.x - 7},${centre.y - 6}`} fill={colors.tree} />
                  <Polygon points={`${centre.x},${centre.y - 27} ${centre.x + 5},${centre.y - 14} ${centre.x - 5},${centre.y - 14}`} fill={colors.tree} fillOpacity={0.85} />
                </>
              ) : null}
            </G>
          );
        })}

        <Polyline points={route.points.map((pt) => `${pt.x},${pt.y}`).join(' ')} fill="none" stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={2.5} strokeDasharray="1 6" strokeLinecap="round" />

        {def.landmarks.map((mark) => {
          const at = pointAt(route, mark.at);
          return (
            <G key={mark.label}>
              <Line x1={at.x} y1={at.y} x2={at.x} y2={at.y - 20} stroke="#4A3B2A" strokeWidth={1.6} />
              <Polygon points={`${at.x},${at.y - 20} ${at.x + 11},${at.y - 16} ${at.x},${at.y - 12}`} fill={mark.at >= 1 ? '#E8762B' : '#D94B4B'} />
              <Circle cx={at.x} cy={at.y} r={2.2} fill="#4A3B2A" />
            <SvgText x={at.x} y={at.y + 14} fontSize={9} fontWeight="700" fill="#2B2B2B" stroke="#FFFFFF" strokeWidth={2.4} strokeOpacity={0.9} textAnchor="middle">
                {mark.label}
              </SvgText>
            <SvgText x={at.x} y={at.y + 14} fontSize={9} fontWeight="700" fill="#2B2B2B" textAnchor="middle">
                {mark.label}
              </SvgText>
            </G>
          );
        })}
    </Svg>
  );
});

// A journey as a small raised-tile world seen from an angle (isometric), drawn with SVG. Friends walk the route as avatars: they glide from the start
// to where their share of the journey has taken them, and bob a little while they stand. Clouds drift across the sky. No 3D engine: the depth comes from
// the tiles' side walls and from drawing the far tiles first.
export const JourneyMap = memo(function JourneyMap({ mapKey, theme, members, width, still = false }: JourneyMapProps) {
  const p = usePalette();
  const themeKey: JourneyTheme = theme in THEMES ? (theme as JourneyTheme) : 'plains';
  const colors = THEMES[themeKey];
  const def = useMemo(() => mapDefFor(mapKey, theme), [mapKey, theme]);
  const scene = sceneSize(def.grid);
  const scale = width / scene.width;
  const height = scene.height * scale;

  const tiles = useMemo(() => buildTiles(themeKey, def), [themeKey, def]);
  const route = useMemo(() => routeOnPicture(def, tiles), [def, tiles]);
  // 0 to 1 once, when the map opens: everyone walks from the start to their place.
  const [walk] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));
  const [drift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (still) return;
    walk.setValue(0);
    Animated.timing(walk, { toValue: 1, duration: 1800, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const bobLoop = Animated.loop(Animated.sequence([Animated.timing(bob, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }), Animated.timing(bob, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true })]));
    const driftLoop = Animated.loop(Animated.timing(drift, { toValue: 1, duration: 26000, easing: Easing.linear, useNativeDriver: true }));
    bobLoop.start();
    driftLoop.start();
    return () => {
      bobLoop.stop();
      driftLoop.stop();
    };
  }, [walk, bob, drift, mapKey, still]);

  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const cloudX = drift.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.3, width * 1.1] });
  const cloudX2 = drift.interpolate({ inputRange: [0, 1], outputRange: [width * 0.4, -width * 0.5] });

  // Interpolation needs strictly rising input; the route fractions rise, with the first at 0 and the last at 1.
  const input = route.at;
  const xs = route.points.map((pt) => pt.x * scale);
  const ys = route.points.map((pt) => pt.y * scale);

  return (
    <View style={[styles.frame, { width, height, backgroundColor: colors.skyTop, borderColor: p.border }]}>
      <MapScene def={def} tiles={tiles} route={route} colors={colors} width={width} />

      {/* Clouds drift over the map. */}
      {still ? null : <Animated.View pointerEvents="none" style={[styles.cloud, { top: height * 0.04, width: 60 * scale + 20, height: 16, transform: [{ translateX: cloudX }], backgroundColor: colors.cloud }]} />}
      {still ? null : <Animated.View pointerEvents="none" style={[styles.cloud, { top: height * 0.14, width: 44 * scale + 14, height: 12, opacity: 0.7, transform: [{ translateX: cloudX2 }], backgroundColor: colors.cloud }]} />}

      {/* The walkers. The last place on the list is drawn first so the leader is on top. */}
      {[...members].reverse().map((member, index) => {
        const share = Math.max(0, Math.min(1, member.percent / 100));
        const at = Animated.multiply(walk, share);
        const x = at.interpolate({ inputRange: input, outputRange: xs, extrapolate: 'clamp' });
        const y = at.interpolate({ inputRange: input, outputRange: ys, extrapolate: 'clamp' });
        // Walkers at the same spot stand a little apart.
        const nudge = (index % 3) * 6 - 6;
        const pinSize = AVATAR + 6;
        return (
          <Animated.View key={member.handle} pointerEvents="none" style={[styles.walker, { transform: [{ translateX: x }, { translateY: y }] }]}>
            <Animated.View style={{ transform: [{ translateY: bobY }, { translateX: nudge - pinSize / 2 }] }}>
              <View
                style={[
                  styles.pin,
                  { width: pinSize, height: pinSize, borderRadius: pinSize / 2 },
                  member.is_me
                    ? { borderColor: p.accent, borderWidth: 3 }
                    : { borderColor: '#FFFFFF', borderWidth: 2 },
                ]}>
                <SocialAvatar handle={member.handle} hasAvatar={member.has_avatar} size={AVATAR} />
              </View>
              <View style={[styles.pinTip, { borderTopColor: member.is_me ? p.accent : '#FFFFFF' }]} />
            </Animated.View>
          </Animated.View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  frame: { borderRadius: 24, borderWidth: 1, overflow: 'hidden', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4 },
  cloud: { position: 'absolute', left: 0, borderRadius: 10 },
  // Its top left is the spot on the route; the avatar sits above it.
  walker: { position: 'absolute', left: 0, top: 0 },
  pin: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -(AVATAR + 12),
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  pinTip: {
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});
