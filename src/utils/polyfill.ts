import { Platform } from 'react-native'

// Polyfill crypto.randomUUID for Native only
if (Platform.OS !== 'web') {
    try {
        require('react-native-random-uuid')
    } catch (e) {
        console.warn("Failed to load generic random-uuid polyfill", e)
    }
}
