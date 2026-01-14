import { View, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager, DeviceEventEmitter, Text, Keyboard } from 'react-native';
import React, { useState, useEffect } from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';



export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const currentRouteName = state.routes[state.index].name;
    const isTasks = currentRouteName === 'tasks';
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const showEvent = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
        const hideEvent = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';

        const keyboardDidShowListener = Keyboard.addListener(showEvent, () => setVisible(false));
        const keyboardDidHideListener = Keyboard.addListener(hideEvent, () => setVisible(true));

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    if (!visible) return null;

    const onSearchPress = () => {
        const currentRouteName = state.routes[state.index].name;
        if (currentRouteName === 'relay') {
            DeviceEventEmitter.emit('TRIGGER_RELAY_SEARCH');
        } else {
            DeviceEventEmitter.emit('TRIGGER_SEARCH_ACTION');
        }
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
                    if (route.name === 'index') iconName = 'square-outline'; // Agent (Main)
                    if (route.name === 'tasks') iconName = 'ellipse-outline'; // Workspace
                    if (route.name === 'relay') iconName = 'medical-outline';

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
                                {route.name === 'relay' ? (
                                    <Text style={{ fontSize: 54, color: '#0F172A', fontWeight: '500', includeFontPadding: false, textAlign: 'center', textAlignVertical: 'center', bottom: 2 }}>*</Text>
                                ) : (
                                    <Ionicons
                                        name={iconName}
                                        size={24}
                                        color="#334155" // Slate 700 - Constant color
                                    />
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Right Side Actions */}
            <View style={styles.rightActions}>
                {/* Search / Audio Action */}
                <TouchableOpacity
                    style={styles.actionCircle}
                    onPress={onSearchPress}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name={currentRouteName === 'index' ? "mic-outline" : "search"}
                        size={24}
                        color="#0F172A"
                    />
                </TouchableOpacity>

                {/* Add Memory (Only on Tasks/Workspace) */}
                {isTasks && (
                    <TouchableOpacity
                        style={styles.actionCircle}
                        onPress={() => {
                            requestAnimationFrame(() => {
                                router.push('/select-opcode');
                            });
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="add" size={24} color="#2563EB" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // Position relative to flow with content (Global Fix for overlap)
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center', // Center vertically in the bar
        paddingHorizontal: 24,
        backgroundColor: '#FAFAFA', // Very light grey background
        paddingTop: 16, // Space above items
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
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
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12, // Space between buttons
    },
    actionCircle: {
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
