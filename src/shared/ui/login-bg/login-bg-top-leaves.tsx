import { Image, StyleSheet, View } from 'react-native';

// Top-right corner: the pale green leaf artwork from the Reovita login design.
export function LoginBgTopLeaves() {
  return (
    <View pointerEvents="none" style={styles.container}>
      <Image
        source={require('../../assets/images/login-leaves-top-right.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -82,
    right: -53,
    width: 295,
    height: 295,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%', opacity: 0.85 },
});
