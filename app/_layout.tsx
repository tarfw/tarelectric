import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-memory"
          options={{
            presentation: 'modal',
            title: 'New Memory',
            headerShown: true
          }}
        />
      </Stack>
    </SafeAreaProvider>
  )
}
