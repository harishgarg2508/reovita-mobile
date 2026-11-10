import { svgDataUri } from '@shared/lib';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

const GOOGLE_SVG_URI = svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%234285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="%2334A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="%23FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="%23EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`.replace(/%23/g, '#'));

/**
 * Official 4-color Google 'G' icon for social sign-in.
 */
export function GoogleIcon({ size = 24 }: { size?: number }) {
  return (
    <ExpoImage
      source={{ uri: GOOGLE_SVG_URI }}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel="Google"
    />
  );
}

/**
 * Apple logo icon for social sign-in.
 */
export function AppleIcon({ size = 24 }: { size?: number }) {
  return (
    <Text style={[styles.appleText, { fontSize: size, lineHeight: size }]}></Text>
  );
}

/**
 * Minimalist outline Mail / Envelope icon.
 */
export function MailIcon({ size = 18, color = '#8E929A' }: { size?: number; color?: string }) {
  return (
    <View style={[styles.mailBox, { width: size, height: size * 0.75, borderColor: color }]}>
      <View style={[styles.mailV, { borderBottomColor: color }]} />
    </View>
  );
}

/**
 * Minimalist outline Lock icon.
 */
export function LockIcon({ size = 18, color = '#8E929A' }: { size?: number; color?: string }) {
  const bodyW = size;
  const bodyH = size * 0.72;
  const shackleW = size * 0.6;
  const shackleH = size * 0.55;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View
        style={{
          width: shackleW,
          height: shackleH,
          borderWidth: 2,
          borderColor: color,
          borderBottomWidth: 0,
          borderTopLeftRadius: shackleW / 2,
          borderTopRightRadius: shackleW / 2,
          marginBottom: -1,
        }}
      />
      <View
        style={{
          width: bodyW,
          height: bodyH,
          borderWidth: 2,
          borderColor: color,
          borderRadius: 4,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View style={{ width: 2, height: 4, backgroundColor: color }} />
      </View>
    </View>
  );
}

/**
 * Eye icon with slash toggle for password visibility.
 */
export function EyeSlashIcon({ size = 20, color = '#8E929A', crossed = true }: { size?: number; color?: string; crossed?: boolean }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.9,
          height: size * 0.55,
          borderWidth: 1.8,
          borderColor: color,
          borderRadius: size * 0.35,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View style={{ width: size * 0.25, height: size * 0.25, borderRadius: size * 0.15, backgroundColor: color }} />
      </View>
      {crossed && (
        <View
          style={{
            position: 'absolute',
            width: size * 1.05,
            height: 1.8,
            backgroundColor: color,
            transform: [{ rotate: '-45deg' }],
          }}
        />
      )}
    </View>
  );
}

/**
 * Calendar icon.
 */
export function CalendarIcon({ size = 18, color = '#8E929A' }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size,
          height: size * 0.9,
          borderWidth: 1.8,
          borderColor: color,
          borderRadius: 4,
          paddingTop: 3,
        }}>
        <View style={{ width: '100%', height: 1.5, backgroundColor: color }} />
      </View>
    </View>
  );
}

/**
 * Height Icon from Figma Screen 1.
 * Yellow/green body measuring figure with measurement markings.
 */
export function HeightDetailIcon({ size = 32 }: { size?: number }) {
  return (
    <View style={[styles.iconWrap, { width: size, height: size }]}>
      <View style={styles.heightContainer}>
        <View style={styles.heightHead} />
        <View style={styles.heightBody}>
          <View style={styles.tapeRuler}>
            <View style={styles.tapeTick} />
            <View style={styles.tapeTickLong} />
            <View style={styles.tapeTick} />
            <View style={styles.tapeTickLong} />
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Weight Scale Icon from Figma Screen 1.
 * Lime green medical scale box with dial indicator.
 */
export function WeightDetailIcon({ size = 32 }: { size?: number }) {
  return (
    <View style={[styles.iconWrap, { width: size, height: size }]}>
      <View style={styles.weightBox}>
        <View style={styles.weightHandle} />
        <View style={styles.weightMain}>
          <View style={styles.weightDial}>
            <View style={styles.dialNeedle} />
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Blood Drop Icon from Figma Screen 1.
 * Glossy crimson/red water droplet with highlight.
 */
export function BloodDropDetailIcon({ size = 32 }: { size?: number }) {
  return (
    <View style={[styles.iconWrap, { width: size, height: size }]}>
      <View style={styles.dropShape}>
        <View style={styles.dropHighlight} />
      </View>
    </View>
  );
}

/**
 * Notification Bell icon with optional red unread dot.
 */
export function BellIcon({ size = 22, unread = true, color = '#171717' }: { size?: number; unread?: boolean; color?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.7,
          height: size * 0.65,
          borderTopLeftRadius: size * 0.35,
          borderTopRightRadius: size * 0.35,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
          borderWidth: 1.8,
          borderColor: color,
        }}
      />
      <View
        style={{
          width: size * 0.85,
          height: 2,
          backgroundColor: color,
          borderRadius: 1,
          marginTop: -0.5,
        }}
      />
      <View
        style={{
          width: size * 0.22,
          height: size * 0.12,
          borderBottomLeftRadius: size * 0.1,
          borderBottomRightRadius: size * 0.1,
          backgroundColor: color,
          marginTop: 1,
        }}
      />
      {unread && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#E34255',
            borderWidth: 1.5,
            borderColor: '#FFFFFF',
          }}
        />
      )}
    </View>
  );
}

/**
 * Warning Triangle Icon from Figma Screen 2.
 * Soft-corner red rounded triangle with white exclamation mark.
 */
export function WarningTriangleIcon({ size = 36 }: { size?: number }) {
  return (
    <View style={[styles.warningTriangle, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <Text style={styles.warningExclamation}>!</Text>
    </View>
  );
}

/**
 * Complete Profile Avatar Icon from Figma Screen 2.
 * Warm yellow circle with user silhouette.
 */
export function ProfileAvatarBadge({ size = 38 }: { size?: number }) {
  return (
    <View style={[styles.avatarBadgeWrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={styles.avatarBadgeHead} />
      <View style={styles.avatarBadgeShoulders} />
    </View>
  );
}

/**
 * Retake Photo Camera Graphic with Red Error Badge from Figma Screen 4.
 */
export function RetakeCameraGraphic({ width = 230, height = 160 }: { width?: number; height?: number }) {
  return (
    <View style={[styles.retakeCard, { width, height }]}>
      <View style={styles.cameraBody}>
        <View style={styles.cameraBump} />
        <View style={styles.cameraLensRing}>
          <View style={styles.cameraLensInner} />
        </View>
      </View>
      <View style={styles.cameraErrorBadge}>
        <Text style={styles.cameraErrorExclamation}>!</Text>
      </View>
    </View>
  );
}

/**
 * Info Circular Badge with white lowercase "i" for Review Results (Image 1).
 */
export function ReviewInfoIcon({ size = 34 }: { size?: number }) {
  return (
    <View style={[styles.infoBadge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.infoLetter, { fontSize: size * 0.65 }]}>i</Text>
    </View>
  );
}

/**
 * Sparkles Halo Graphic for Claude AI Translating (Image 2).
 */
export function SparklesHaloGraphic({ size = 110 }: { size?: number }) {
  return (
    <View style={[styles.sparklesHalo, { width: size, height: size, borderRadius: size / 2 }]}>
      {/* Center Main Sparkle */}
      <Text style={[styles.sparkleMain, { fontSize: size * 0.4 }]}>✦</Text>
      {/* Orbiting Satellites */}
      <Text style={[styles.sparkleSatellite, { top: 18, right: 22, fontSize: size * 0.18 }]}>✦</Text>
      <Text style={[styles.sparkleSatellite, { top: 28, left: 18, fontSize: size * 0.14 }]}>✦</Text>
      <Text style={[styles.sparkleSatellite, { bottom: 22, right: 26, fontSize: size * 0.15 }]}>✦</Text>
    </View>
  );
}

/**
 * Confetti Celebration Badge for Final Analysis (Image 3).
 */
export function ConfettiCelebrationBadge({ size = 76 }: { size?: number }) {
  return (
    <View style={styles.confettiContainer}>
      {/* Floating confetti flakes */}
      <View style={[styles.confettiFlake, { top: -8, left: 16, backgroundColor: '#84CC16', transform: [{ rotate: '25deg' }] }]} />
      <View style={[styles.confettiFlake, { top: -14, left: 62, backgroundColor: '#1F6F3F', transform: [{ rotate: '-35deg' }] }]} />
      <View style={[styles.confettiFlake, { top: 12, left: -14, backgroundColor: '#F59E0B', transform: [{ rotate: '45deg' }] }]} />
      <View style={[styles.confettiFlake, { top: 22, right: -16, backgroundColor: '#84CC16', transform: [{ rotate: '-20deg' }] }]} />
      <View style={[styles.confettiFlake, { bottom: 6, left: -10, backgroundColor: '#1F6F3F', transform: [{ rotate: '30deg' }] }]} />
      <View style={[styles.confettiFlake, { bottom: 12, right: -12, backgroundColor: '#F59E0B', transform: [{ rotate: '-45deg' }] }]} />
      <View style={[styles.confettiFlake, { top: -6, right: 22, backgroundColor: '#06B6D4', transform: [{ rotate: '15deg' }] }]} />
      <View style={[styles.confettiFlake, { bottom: -10, left: 40, backgroundColor: '#84CC16', transform: [{ rotate: '-10deg' }] }]} />

      {/* Outer Halo */}
      <View style={[styles.celebrationHalo, { width: size * 1.45, height: size * 1.45, borderRadius: (size * 1.45) / 2 }]}>
        {/* Inner Solid Green Check Circle */}
        <View style={[styles.celebrationCircle, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.celebrationCheck, { fontSize: size * 0.52 }]}>✓</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Vector Smooth Sparkline Wave for Final Health Score (Image 3).
 */
export function SparklineGraphic({ width = 130, height = 50 }: { width?: number; height?: number }) {
  return (
    <View style={[styles.sparklineBox, { width, height }]}>
      {/* Translucent fill area */}
      <View style={styles.sparklineAreaFill} />
      {/* Wave Segments */}
      <View style={styles.waveTrack}>
        <View style={[styles.waveCurveSegment, { width: width * 0.3, transform: [{ rotate: '14deg' }], top: 26, left: 0 }]} />
        <View style={[styles.waveCurveSegment, { width: width * 0.3, transform: [{ rotate: '-18deg' }], top: 18, left: width * 0.26 }]} />
        <View style={[styles.waveCurveSegment, { width: width * 0.3, transform: [{ rotate: '18deg' }], top: 16, left: width * 0.5 }]} />
        <View style={[styles.waveCurveSegment, { width: width * 0.28, transform: [{ rotate: '-28deg' }], top: 8, left: width * 0.72 }]} />
      </View>
      {/* Glowing Peak Dot Indicator */}
      <View style={[styles.sparklinePeakDot, { top: 6, right: 2 }]} />
    </View>
  );
}

/**
 * Tab Bar Icons matching Figma Screen 2.
 */
export function TabHomeIcon({ color = '#1F6F3F', size = 20 }: { color?: ColorValue; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.45,
          borderRightWidth: size * 0.45,
          borderBottomWidth: size * 0.4,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }}
      />
      <View
        style={{
          width: size * 0.65,
          height: size * 0.48,
          borderWidth: 1.8,
          borderColor: color,
          borderTopWidth: 0,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}>
        <View style={{ width: size * 0.22, height: size * 0.24, backgroundColor: color, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
      </View>
    </View>
  );
}

export function TabReportsIcon({ color = '#1F6F3F', size = 20 }: { color?: ColorValue; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.72,
          height: size * 0.9,
          borderWidth: 1.8,
          borderColor: color,
          borderRadius: 4,
          padding: 2.5,
          justifyContent: 'space-around',
        }}>
        <View style={{ width: '80%', height: 1.5, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: '60%', height: 1.5, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: '70%', height: 1.5, backgroundColor: color, borderRadius: 1 }} />
      </View>
    </View>
  );
}

export function TabInsightsIcon({ color = '#1F6F3F', size = 20 }: { color?: ColorValue; size?: number }) {
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <View style={{ width: 2, height: size * 0.5, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 2, height: size * 0.85, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 2, height: size * 0.65, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 2, height: size * 0.35, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

export function TabProfileIcon({ color = '#1F6F3F', size = 20 }: { color?: ColorValue; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: (size * 0.42) / 2,
          borderWidth: 1.8,
          borderColor: color,
          marginBottom: 1,
        }}
      />
      <View
        style={{
          width: size * 0.75,
          height: size * 0.35,
          borderTopLeftRadius: size * 0.38,
          borderTopRightRadius: size * 0.38,
          borderWidth: 1.8,
          borderColor: color,
          borderBottomWidth: 0,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  googleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: {
    fontWeight: '900',
    color: '#4285F4',
  },
  appleText: {
    color: '#14121C',
  },
  mailBox: {
    borderWidth: 1.8,
    borderRadius: 3,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  mailV: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heightContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heightHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#84CC16',
    marginBottom: 2,
  },
  heightBody: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAB308',
  },
  tapeRuler: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-around',
    paddingHorizontal: 2,
  },
  tapeTick: {
    width: 4,
    height: 1.5,
    backgroundColor: '#713F12',
  },
  tapeTickLong: {
    width: 7,
    height: 1.5,
    backgroundColor: '#713F12',
  },
  weightBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightHandle: {
    width: 10,
    height: 4,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: '#65A30D',
    marginBottom: -1,
  },
  weightMain: {
    width: 26,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#84CC16',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#84CC16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  weightDial: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialNeedle: {
    width: 2,
    height: 5,
    backgroundColor: '#1E3A8A',
    borderRadius: 1,
  },
  dropShape: {
    width: 22,
    height: 26,
    backgroundColor: '#E34255',
    borderTopLeftRadius: 11,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
    transform: [{ rotate: '-45deg' }],
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    shadowColor: '#E34255',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  dropHighlight: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    opacity: 0.6,
    marginLeft: 4,
    marginTop: 4,
  },
  warningTriangle: {
    backgroundColor: '#E34255',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningExclamation: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 20,
    marginTop: -1,
  },
  avatarBadgeWrap: {
    backgroundColor: '#F6D067',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  avatarBadgeHead: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#27272A',
    marginBottom: 2,
  },
  avatarBadgeShoulders: {
    width: 26,
    height: 14,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    backgroundColor: '#27272A',
  },
  retakeCard: {
    borderRadius: 24,
    backgroundColor: '#E9E9EE',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cameraBody: {
    width: 76,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#2E3138',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cameraBump: {
    position: 'absolute',
    top: -7,
    left: 14,
    width: 20,
    height: 7,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: '#2E3138',
  },
  cameraLensRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3.5,
    borderColor: '#4A4E58',
    backgroundColor: '#1E2025',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraLensInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#353942',
  },
  cameraErrorBadge: {
    position: 'absolute',
    bottom: 24,
    right: 56,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E34255',
    borderWidth: 3,
    borderColor: '#E9E9EE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraErrorExclamation: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: -2,
  },
  infoBadge: {
    backgroundColor: '#1F6F3F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1F6F3F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  infoLetter: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: -1,
  },
  sparklesHalo: {
    backgroundColor: '#F3EEFD',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sparkleMain: {
    color: '#1F6F3F',
  },
  sparkleSatellite: {
    position: 'absolute',
    color: '#1F6F3F',
  },
  confettiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  confettiFlake: {
    position: 'absolute',
    width: 8,
    height: 4,
    borderRadius: 1.5,
  },
  celebrationHalo: {
    backgroundColor: '#EBF9D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationCircle: {
    backgroundColor: '#84CC16',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#84CC16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  celebrationCheck: {
    color: '#FFFFFF',
    fontWeight: '900',
    lineHeight: 46,
  },
  sparklineBox: {
    position: 'relative',
    justifyContent: 'flex-end',
  },
  sparklineAreaFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: '#F2F9E8',
    borderRadius: 10,
    opacity: 0.8,
  },
  waveTrack: {
    ...StyleSheet.absoluteFill,
  },
  waveCurveSegment: {
    position: 'absolute',
    height: 2.5,
    backgroundColor: '#84CC16',
    borderRadius: 1.25,
  },
  sparklinePeakDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#84CC16',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#84CC16',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
});
