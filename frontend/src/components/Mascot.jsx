import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Platform } from 'react-native';

export default function Mascot({ state = 'idle', size = 110 }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle organic floating & bobbing loop
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(floatAnim, {
            toValue: -10,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(floatAnim, {
            toValue: 2,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: -1,
            duration: 1600,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    floatLoop.start();

    return () => floatLoop.stop();
  }, [floatAnim, rotateAnim]);

  useEffect(() => {
    if (state === 'listening') {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state, pulseAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-2deg', '0deg', '2deg'],
  });

  return (
    <View style={styles.container}>
      {/* Animated Aura during listening / speaking */}
      {state === 'listening' && (
        <Animated.View
          style={[
            styles.aura,
            {
              width: size * 1.6,
              height: size * 1.6,
              borderRadius: (size * 1.6) / 2,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      )}

      {/* Floating Toast Mascot */}
      <Animated.View
        style={[
          styles.mascotWrapper,
          {
            width: size,
            height: size,
            transform: [
              { translateY: floatAnim },
              { rotate: spin },
            ],
          },
        ]}
      >
        <Image
          source={{ uri: '/image-removebg-preview%201.svg' }}
          style={{ width: size * 1.25, height: size * 1.05 }}
          resizeMode="contain"
          accessibilityLabel="Smiling Toast Mascot"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
    backgroundColor: 'rgba(230, 168, 108, 0.25)',
    zIndex: 0,
  },
});
