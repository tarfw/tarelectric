import { View, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager, DeviceEventEmitter } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();

    const onSearchPress = () => {
        DeviceEventEmitter.emit('TRIGGER_SEARCH_ACTION');
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
            {/* Tabs Pill */}
            <View style={styles.tabPill}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key] as { options: any };
                    const isFocused = state.index === index;

                    const onPress = () => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params);
                        }
                    };

                    const onLongPress = () => {
                        navigation.emit({
                            type: 'tabLongPress',
                            target: route.key,
                        });
                    };

                    // Determine icon name (Always outline/simple per request)
                    let iconName: keyof typeof Ionicons.glyphMap = 'help';
                    if (route.name === 'index') iconName = 'ellipse-outline';
                    if (route.name === 'agent') iconName = 'square-outline';
                    if (route.name === 'relay') iconName = 'at-outline';

                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            testID={options.tabBarTestID}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            style={styles.tabItem}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, isFocused && { backgroundColor: '#F1F5F9' }]}>
                                <Ionicons
                                    name={iconName}
                                    size={24}
                                    color="#334155" // Slate 700 - Constant color
                                />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Separate Search Circle */}
            <TouchableOpacity
                style={styles.searchCircle}
                onPress={onSearchPress}
                activeOpacity={0.8}
            >
                <Ionicons name="search" size={24} color="#0F172A" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center', // Center vertically in the bar
        paddingHorizontal: 24,
        backgroundColor: '#FFFFFF', // Solid white background
        paddingTop: 16, // Space above items
    },
    tabPill: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0', // Slate 200
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        width: 56,
        // borderRadius moved to inner container
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: 100, // Fully rounded circle
        overflow: 'hidden',
    },
    searchCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
});
