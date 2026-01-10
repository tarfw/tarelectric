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
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>ACCOUNT</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Email</Text>
                        <Text style={styles.value}>{user?.email}</Text>
                    </View>
                    <TouchableOpacity style={styles.row} onPress={signOutApp}>
                        <Text style={[styles.label, styles.dangerText]}>Sign Out</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>BLUESKY</Text>

                    {loadingBsky ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color="#000" />
                        </View>
                    ) : isBskyAuth ? (
                        <>
                            <View style={styles.row}>
                                <Text style={styles.label}>Handle</Text>
                                <Text style={styles.value}>@{userProfile?.handle || 'Unknown'}</Text>
                            </View>
                            <TouchableOpacity style={styles.row} onPress={logoutBsky}>
                                <Text style={[styles.label, styles.dangerText]}>Disconnect</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.formSection}>
                            <Text style={styles.helperText}>Connect your account to chat.</Text>

                            <TextInput
                                style={styles.minimalInput}
                                placeholder="Handle (e.g. alice.bsky.social)"
                                value={bskyId}
                                onChangeText={setBskyId}
                                autoCapitalize="none"
                                placeholderTextColor="#999"
                            />
                            <TextInput
                                style={styles.minimalInput}
                                placeholder="App Password"
                                value={bskyPass}
                                onChangeText={setBskyPass} // Corrected
                                secureTextEntry
                                placeholderTextColor="#999"
                            />
                            <TouchableOpacity
                                style={[styles.minimalButton, connecting && styles.disabled]}
                                onPress={handleConnectBluesky}
                                disabled={connecting}
                            >
                                <Text style={styles.minimalButtonText}>
                                    {connecting ? 'Connecting...' : 'Connect'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff', // Clean white background
    },
    content: {
        paddingTop: 20,
    },
    section: {
        marginBottom: 40,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93', // iOS gray
        marginBottom: 8,
        marginLeft: 20,
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E5EA',
    },
    loadingRow: {
        padding: 20,
        alignItems: 'flex-start',
    },
    label: {
        fontSize: 17,
        color: '#000',
        fontWeight: '400',
    },
    value: {
        fontSize: 17,
        color: '#8E8E93',
    },
    dangerText: {
        color: '#FF3B30', // iOS Red
    },
    formSection: {
        paddingHorizontal: 20,
    },
    helperText: {
        fontSize: 15,
        color: '#8E8E93',
        marginBottom: 16,
    },
    minimalInput: {
        fontSize: 17,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
        marginBottom: 16,
        color: '#000',
    },
    minimalButton: {
        marginTop: 8,
        paddingVertical: 12,
        alignItems: 'flex-start',
    },
    minimalButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#007AFF', // iOS Blue
    },
    disabled: {
        opacity: 0.5,
    },
})
