import React from 'react'
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

type OpcodeItem = {
    code: number
    label: string
}

const OPCODES: OpcodeItem[] = [
    { code: 101, label: 'SI Stock In' },
    { code: 102, label: 'SO Stock Sale' },
    { code: 103, label: 'SR Stock Return' },
    { code: 104, label: 'SA Stock Adjust' },
    { code: 201, label: 'IC Invoice Create' },
    { code: 202, label: 'IA Invoice Item Add' },
    { code: 203, label: 'IP Invoice Payment' },
    { code: 207, label: 'IR Invoice Refund' },
    { code: 301, label: 'TC Task Create' },
    { code: 302, label: 'TA Task Assign' },
    { code: 303, label: 'TS Task Start' },
    { code: 304, label: 'TP Task Progress' },
    { code: 305, label: 'TD Task Done' },
    { code: 401, label: 'AP Account Pay' },
    { code: 403, label: 'AR Account Refund' },
]

export default function SelectOpcodeScreen() {
    const renderItem = ({ item }: { item: OpcodeItem }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={() => {
                router.push({
                    pathname: '/add-memory',
                    params: { opcode: item.code, label: item.label },
                })
            }}
        >
            <View style={styles.codeContainer}>
                <Text style={styles.code}>{item.code}</Text>
            </View>
            <Text style={styles.label}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
        </TouchableOpacity>
    )

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="dark" />
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Select Operation</Text>
                </View>
            </View>

            <FlatList
                data={OPCODES}
                renderItem={renderItem}
                keyExtractor={(item) => item.code.toString()}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        backgroundColor: '#FFFFFF',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    codeContainer: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 12,
    },
    code: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
        fontFamily: 'monospace', // Or just system font if monospace looks bad
    },
    label: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
    },
    separator: {
        height: 1,
        backgroundColor: '#F3F4F6',
    },
})
