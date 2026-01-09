import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function TabLayout() {
    const insets = useSafeAreaInsets()

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    borderTopWidth: 1,
                    elevation: 0,
                    height: 60 + insets.bottom,
                    paddingBottom: insets.bottom + 8,
                    paddingTop: 8,
                    backgroundColor: '#FFFFFF',
                    borderTopColor: '#E5E7EB',
                },
                tabBarActiveTintColor: '#2563EB',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '500',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Tasks',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="ellipse-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="agent"
                options={{
                    title: 'Agent',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="square-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="relay"
                options={{
                    title: 'Relay',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="at" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    )
}
