import { Tabs } from 'expo-router'
import { DeviceEventEmitter } from 'react-native'
import { TabBar } from '../../src/components/TabBar'

export default function TabLayout() {
    return (
        <Tabs
            tabBar={props => <TabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="tasks"
                options={{
                    title: 'Workspace',
                }}
            />
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Agent',
                }}
            />
            <Tabs.Screen
                name="relay"
                options={{
                    title: 'Relay',
                }}
            />
        </Tabs>
    )
}
