import { Stack, useRouter, useSegments } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from '../src/context/AuthContext'
import { View, ActivityIndicator } from 'react-native'
import { initDatabase } from '../src/db/init'
import { syncService } from '../src/services/SyncService'


function RootLayoutNav() {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  // Initialize DB and Sync Services
  useEffect(() => {
    async function init() {
      await initDatabase()
      syncService.start()
    }
    init()
  }, [])

  useEffect(() => {
    if (loading) return

    const inLogin = segments[0] === 'login'

    if (!session && !inLogin) {
      router.replace('/login')
    } else if (session && inLogin) {
      router.replace('/(tabs)')
    }
  }, [session, loading, segments])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-memory"
          options={{
            presentation: 'modal',
            title: 'New Memory',
            headerShown: true
          }}
        />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Settings',
            headerShown: true,
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen
          name="select-opcode"
          options={{
            headerShown: false,
            animation: 'none',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  )
}

import { BlueskyProvider } from '../src/context/BlueskyContext'

import * as NavigationBar from 'expo-navigation-bar'
import { Platform } from 'react-native'

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync('dark') // icons color
    }
  }, [])

  return (
    <AuthProvider>
      <BlueskyProvider>
        <RootLayoutNav />
      </BlueskyProvider>
    </AuthProvider>
  )
}
