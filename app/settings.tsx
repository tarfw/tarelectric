import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useAuth } from '../src/context/AuthContext'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function SettingsScreen() {
    const { signOut, user } = useAuth()

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Settings</Text>
                <Text style={styles.userInfo}>Logged in as: {user?.email}</Text>

                <TouchableOpacity style={styles.button} onPress={signOut}>
                    <Text style={styles.buttonText}>Sign Out</Text>
                </TouchableOpacity>
            </View>
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
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 24,
        color: '#111827',
    },
    userInfo: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 24,
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
    }
})
