import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { useAuth } from '../src/context/AuthContext'
import { useBluesky } from '../src/context/BlueskyContext'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'

export default function SettingsScreen() {
    const { signOut: signOutApp, user } = useAuth()
    const { login: loginBsky, logout: logoutBsky, isAuthenticated: isBskyAuth, userProfile, loading: loadingBsky } = useBluesky()

    const [bskyId, setBskyId] = useState('')
    const [bskyPass, setBskyPass] = useState('')
    const [connecting, setConnecting] = useState(false)

    const handleConnectBluesky = async () => {
        if (!bskyId || !bskyPass) {
            Alert.alert('Error', 'Please enter both identifier (handle) and password.')
            return
        }
        setConnecting(true)
        const { success, error } = await loginBsky(bskyId, bskyPass)
        setConnecting(false)
        if (!success) {
            Alert.alert('Connection Failed', error?.message || 'Unknown error')
        } else {
            setBskyId('')
            setBskyPass('')
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>App Account</Text>
                <Text style={styles.userInfo}>Logged in as: {user?.email}</Text>
                <TouchableOpacity style={styles.button} onPress={signOutApp}>
                    <Text style={styles.buttonText}>Sign Out of App</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Bluesky Integration</Text>
                {loadingBsky ? (
                    <ActivityIndicator style={{ marginTop: 20 }} />
                ) : isBskyAuth ? (
                    <View style={styles.bskyContainer}>
                        <Text style={styles.successText}>
                            Connected as @{userProfile?.handle || 'Unknown'}
                        </Text>
                        <Text style={styles.didText}>{userProfile?.did}</Text>

                        <TouchableOpacity
                            style={[styles.button, styles.disconnectButton]}
                            onPress={logoutBsky}
                        >
                            <Text style={styles.buttonText}>Disconnect Bluesky</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.bskyForm}>
                        <Text style={styles.hint}>
                            Use your Bluesky handle and App Password (recommended).
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Handle (e.g. alice.bsky.social)"
                            value={bskyId}
                            onChangeText={setBskyId}
                            autoCapitalize="none"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="App Password"
                            value={bskyPass}
                            onChangeText={setBskyPass}
                            secureTextEntry
                        />
                        <TouchableOpacity
                            style={[styles.button, styles.connectButton, connecting && styles.buttonDisabled]}
                            onPress={handleConnectBluesky}
                            disabled={connecting}
                        >
                            <Text style={styles.buttonText}>
                                {connecting ? 'Connecting...' : 'Connect to Bluesky'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        padding: 24,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 16,
        marginBottom: 16,
    },
    userInfo: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 16,
    },
    button: {
        backgroundColor: '#EF4444',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 32,
    },
    bskyContainer: {
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: 12,
    },
    successText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#059669',
        marginBottom: 4,
    },
    didText: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 16,
        fontFamily: 'monospace',
    },
    disconnectButton: {
        backgroundColor: '#6B7280',
    },
    bskyForm: {
        gap: 12,
    },
    hint: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        backgroundColor: '#F9FAFB',
        color: '#111827',
    },
    connectButton: {
        backgroundColor: '#0085FF', // Bluesky brand color approximately
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
})
