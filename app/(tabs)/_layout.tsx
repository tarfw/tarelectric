import { Tabs } from 'expo-router'
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
                name="index"
                options={{
                    title: 'Tasks',
                }}
            />
            <Tabs.Screen
                name="agent"
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
