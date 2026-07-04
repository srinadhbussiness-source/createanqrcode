'use client'

/**
 * Unified authentication hook.
 *
 * Works in BOTH environments:
 *   1. Local dev (API routes available) → uses /api/auth/* (Prisma + bcrypt + Supabase DB)
 *   2. Cloudflare Pages (static export, no API routes) → uses Firebase Auth directly
 *
 * Detection: fetches /api/auth/me — if 404, we're in static mode → use Firebase.
 */

import { useState, useEffect, useCallback } from 'react'
import type { UserRecord } from '@/lib/types'
import { api } from '@/lib/api'
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth'

// Cache for static mode detection
let _isStaticMode: boolean | null = null
async function isStaticMode(): Promise<boolean> {
  if (_isStaticMode !== null) return _isStaticMode
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    _isStaticMode = res.status === 404
  } catch {
    _isStaticMode = true
  }
  return _isStaticMode
}

export function useAuth() {
  const [user, setUser] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | null = null

    async function init() {
      try {
        const staticMode = await isStaticMode()

        if (staticMode) {
          // ── Firebase Auth mode (Cloudflare Pages) ──
          const auth = getAuth()
          if (!auth) { setLoading(false); return }

          unsubscribe = onAuthStateChanged(auth, (fbUser) => {
            if (cancelled) return
            if (fbUser) {
              setUser({
                id: fbUser.uid,
                email: fbUser.email ?? '',
                name: fbUser.displayName,
                avatarUrl: fbUser.photoURL,
                plan: 'free',
                trialEndsAt: null,
                timezone: 'Asia/Kolkata',
                dateFormat: 'DD/MM/YYYY',
                emailVerified: fbUser.emailVerified,
                role: 'user',
                suspended: false,
                twoFactorEnabled: false,
                notifSecurity: true, notifTrial: true, notifScans: true,
                notifExpiry: true, notifDigest: false, notifUpdates: false,
                createdAt: new Date().toISOString(),
              })
            } else {
              setUser(null)
            }
            setLoading(false)
          })
        } else {
          // ── API route mode (local dev) ──
          try {
            const res = await api.get<{ user: UserRecord }>('/api/auth/me')
            if (!cancelled) setUser(res.user)
          } catch {
            if (!cancelled) setUser(null)
          }
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    const staticMode = await isStaticMode()

    if (staticMode) {
      const auth = getAuth()
      if (!auth) throw new Error('Firebase not configured')
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      if (name && cred.user) {
        await updateProfile(cred.user, { displayName: name })
      }
      return cred
    } else {
      return api.post('/api/auth/signup', { email, password, name })
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const staticMode = await isStaticMode()

    if (staticMode) {
      const auth = getAuth()
      if (!auth) throw new Error('Firebase not configured')
      return signInWithEmailAndPassword(auth, email, password)
    } else {
      return api.post('/api/auth/login', { email, password })
    }
  }, [])

  const logout = useCallback(async () => {
    const staticMode = await isStaticMode()
    if (staticMode) {
      const auth = getAuth()
      if (auth) await fbSignOut(auth)
    } else {
      try { await api.post('/api/auth/logout', {}) } catch {}
    }
    setUser(null)
  }, [])

  return { user, loading, signup, login, logout }
}
