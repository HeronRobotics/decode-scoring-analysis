import { createContext, useContext, useEffect, useState } from 'react'
import { usePostHog } from 'posthog-js/react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

const AuthProviderInner = ({ children }) => {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const posthog = usePostHog()

  const needsEmailVerification = Boolean(user?.email && !session)

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting Supabase session', error)
      }
      setSession(data?.session ?? null)
      setUser(data?.session?.user ?? null)
      setAuthLoading(false)
    }

    init()

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)
      },
    )

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!posthog) return

    if (user) {
      posthog.identify(user.id, {
        email: user.email ?? undefined,
      })
    } else {
      posthog.reset()
    }
  }, [user, posthog])

  const value = {
    user,
    session,
    authLoading,
    needsEmailVerification,
    async resendSignupConfirmation(emailRedirectTo = window.location.origin) {
      const email = user?.email
      if (!email) return { error: new Error('No email available') }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo,
        },
      })

      return { error }
    },
    async signIn({ email, password }) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (!error) {
        setSession(data.session)
        setUser(data.session?.user ?? null)

        if (posthog && data.session?.user) {
          const u = data.session.user
          posthog.identify(u.id, {
            email: u.email ?? undefined,
          })
          posthog.capture('signed_in')
        }
      }
      return { data, error }
    },
    async signInWithGitHub() {
      const redirectTo = window.location.origin
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo,
        },
      })
      if (error) {
        console.error('Error starting GitHub sign-in', error)
      }
      return { data, error }
    },
    async signUp({ email, password }) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (!error) {
        // Supabase may return a user without a session when email confirmation is required
        const sessionUser = data.session?.user ?? data.user ?? null

        setSession(data.session ?? null)
        setUser(sessionUser)

        if (posthog && sessionUser) {
          posthog.identify(sessionUser.id, {
            email: sessionUser.email ?? undefined,
          })
          posthog.capture('signed_up', {
            method: 'email',
          })
        }
      }
      return { data, error }
    },
    async signOut() {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out', error)
      }
      setSession(null)
      setUser(null)
    },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const AuthProvider = AuthProviderInner

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
