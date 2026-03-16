// src/components/auth/SplashScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';

export function SplashScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Check if user needs to complete setup
        if (user.requires_setup) {
          router.replace('/account-setup');
        } else {
          router.replace('/(app)/(tabs)/dashboard');
        }
      } else {
        const t = setTimeout(() => router.replace('/login'), 2000);
        return () => clearTimeout(t);
      }
    }
  }, [user, loading]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.title}>HNA Acadex</Text>
        <Text style={styles.subtitle}>Holy Name Academy of Palanas, Inc.</Text>
      </View>
      <ActivityIndicator size="large" color="#FFFFFF" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.accentGold,
    opacity: 0.9,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  spinner: {
    marginTop: 48,
  },
});
