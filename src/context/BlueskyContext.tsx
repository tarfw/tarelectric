import React, { createContext, useContext, useEffect, useState } from 'react'
import { BskyAgent } from '@atproto/api'
import AsyncStorage from '@react-native-async-storage/async-storage'
import 'react-native-url-polyfill/auto'

interface BlueskyContextType {
    agent: BskyAgent
    isAuthenticated: boolean
    loading: boolean
    login: (identifier: string, password: string) => Promise<{ success: boolean; error?: any }>
    logout: () => Promise<void>
    userProfile: any | null
}

const BlueskyContext = createContext<BlueskyContextType | null>(null)

export const useBluesky = () => {
    const context = useContext(BlueskyContext)
    if (!context) {
        throw new Error('useBluesky must be used within a BlueskyProvider')
    }
    return context
}

export function BlueskyProvider({ children }: { children: React.ReactNode }) {
    // Determine service URL. Using bsky.social for now.
    const [agent] = useState(() => new BskyAgent({
        service: 'https://bsky.social',
        persistSession: async (evt, session) => {
            if (evt === 'create' || evt === 'update') {
                await AsyncStorage.setItem('bsky_session', JSON.stringify(session))
            }
        }
    }))
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [loading, setLoading] = useState(true)
    const [userProfile, setUserProfile] = useState<any | null>(null)

    useEffect(() => {
        checkSession()
    }, [])

    const checkSession = async () => {
        try {
            const sessionStr = await AsyncStorage.getItem('bsky_session')
            if (sessionStr) {
                const session = JSON.parse(sessionStr)
                await agent.resumeSession(session)
                setIsAuthenticated(true)

                // Fetch profile
                const { data: profile } = await agent.getProfile({ actor: session.did })
                setUserProfile(profile)
            }
        } catch (e) {
            console.error('Failed to resume Bluesky session:', e)
            await AsyncStorage.removeItem('bsky_session')
        } finally {
            setLoading(false)
        }
    }

    const login = async (identifier: string, password: string) => {
        try {
            const { data } = await agent.login({ identifier, password })
            await AsyncStorage.setItem('bsky_session', JSON.stringify(data))
            setIsAuthenticated(true)

            // Fetch profile
            const { data: profile } = await agent.getProfile({ actor: data.did })
            setUserProfile(profile)

            return { success: true }
        } catch (e: any) {
            console.error('Bluesky login failed:', e)
            return { success: false, error: e }
        }
    }

    const logout = async () => {
        try {
            await AsyncStorage.removeItem('bsky_session')
            setIsAuthenticated(false)
            setUserProfile(null)
            // agent.logout() // Not always necessary if we just clear session, but good practice if supported or we just re-instantiate
        } catch (e) {
            console.error('Bluesky logout failed:', e)
        }
    }

    return (
        <BlueskyContext.Provider value={{ agent, isAuthenticated, loading, login, logout, userProfile }}>
            {children}
        </BlueskyContext.Provider>
    )
}
