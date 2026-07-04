
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, setSessionCookie } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase-client'

/**
 * POST /api/auth/google
 *
 * Initiates Google OAuth via Supabase Auth. The client sends an id_token
 * or access_token obtained from Google (via Supabase's client-side OAuth flow).
 * We verify it with Supabase, then upsert the user into our Prisma DB and
 * create a session.
 *
 * The frontend flow:
 * 1. User clicks "Continue with Google"
 * 2. Frontend calls supabase.auth.signInWithOAuth({ provider: 'google' })
 * 3. Google redirects back with tokens
 * 4. Frontend sends the tokens to this endpoint
 * 5. Server verifies with Supabase, upserts user, creates session
 */
export async function POST(req: NextRequest) {
  try {
    const { accessToken, idToken } = await req.json()

    if (!accessToken && !idToken) {
      return NextResponse.json({ error: 'No token provided.' }, { status: 400 })
    }

    const sb = getSupabaseServer()
    if (!sb) {
      return NextResponse.json(
        { error: 'Google sign-in is not configured. Set Supabase credentials.' },
        { status: 501 }
      )
    }

    // Verify the token with Supabase
    const { data: authData, error: authError } = !idToken
      ? await sb.auth.getUser(accessToken)
      : await sb.auth.signInWithIdToken({ provider: 'google', token: idToken })

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Google authentication failed.' }, { status: 401 })
    }

    const supabaseUser = authData.user
    const email = supabaseUser.email
    if (!email) {
      return NextResponse.json({ error: 'No email returned from Google.' }, { status: 400 })
    }

    const name = supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? email.split('@')[0]
    const avatarUrl = supabaseUser.user_metadata?.avatar_url ?? supabaseUser.user_metadata?.picture ?? null

    // Upsert: find or create the user in our Prisma DB
    let user = await db.user.findUnique({ where: { email } })
    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name,
          avatarUrl,
          passwordHash: null, // OAuth users don't have a password
          plan: 'free',
          emailVerified: true, // Google-verified emails are trusted
        },
      })
    } else {
      // Update avatar if changed
      if (avatarUrl && user.avatarUrl !== avatarUrl) {
        user = await db.user.update({
          where: { id: user.id },
          data: { avatarUrl, name: name || user.name, emailVerified: true },
        })
      }
    }

    // Create a session
    const token = await createSession(user.id)
    await setSessionCookie(token)

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
      timezone: user.timezone,
      dateFormat: user.dateFormat,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      role: user.role,
      suspended: user.suspended,
      notifSecurity: user.notifSecurity,
      notifTrial: user.notifTrial,
      notifScans: user.notifScans,
      notifExpiry: user.notifExpiry,
      notifDigest: user.notifDigest,
      notifUpdates: user.notifUpdates,
    })
  } catch (err) {
    console.error('Google auth error:', err)
    return NextResponse.json({ error: 'Google sign-in failed.' }, { status: 500 })
  }
}
