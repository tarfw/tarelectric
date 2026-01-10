import { LogBox } from 'react-native'

LogBox.ignoreLogs([
    /Uint8Array.fromBase64/,
    /Intl.Segmenter is not available/
])
